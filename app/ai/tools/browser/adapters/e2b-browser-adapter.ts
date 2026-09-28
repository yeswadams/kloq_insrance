import { Sandbox } from "e2b";
import { z } from "zod";
import type { BrowserAdapter, BrowserAction } from "./browser-adapter";
import { isBrowserRuntimeConfigured } from "../config";

const script = String.raw`const { chromium } = require('playwright');
(async () => {
  const fs = require('node:fs');
  const input = JSON.parse(fs.readFileSync('/app/qlo-browser-input.json', 'utf8'));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const output = { steps: [], url: '', title: '', pageText: '', extracted: {}, structuredRecord: null, screenshotBase64: null };
    const emit = (type, message, data = {}) => process.stdout.write('QLO_EVENT=' + JSON.stringify({ type, message, data }) + '\n');
    for (const step of input.actions) {
      if (step.action === 'navigate') {
        emit('navigating', 'Navigating to the Qlo-Africa verification portal.');
        await page.goto(step.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        output.steps.push({ action: step.action, url: page.url(), title: await page.title() });
        emit('portal_loaded', 'Verification portal page loaded in Chromium.', { title: await page.title(), url: page.url() });
      } else if (step.action === 'inspect') {
        output.url = page.url(); output.title = await page.title();
        output.pageText = (await page.locator('body').innerText()).slice(0, 12000);
        output.steps.push({ action: step.action, title: output.title });
      } else if (step.action === 'click') {
        await page.locator(step.selector).click({ timeout: 10000 });
        output.steps.push({ action: step.action, selector: step.selector });
      } else if (step.action === 'type') {
        await page.locator(step.selector).fill(step.text, { timeout: 10000 });
        output.steps.push({ action: step.action, selector: step.selector });
        emit('searching', 'Entering the supplied KRA PIN into the portal form.');
      } else if (step.action === 'submit') {
        const navigation = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
        await page.locator(step.selector).click({ timeout: 10000 });
        await navigation;
        output.url = page.url(); output.title = await page.title();
        output.pageText = (await page.locator('body').innerText()).slice(0, 12000);
        output.steps.push({ action: step.action, url: output.url });
        emit('portal_submitted', 'Portal form submitted and a page response was received.', { url: output.url });
      } else if (step.action === 'extract') {
        const node = page.locator(step.selector);
        output.extracted[step.selector] = await node.count() ? await node.innerText({ timeout: 10000 }) : null;
        if (step.selector === "[data-testid='verification-result']" && output.extracted[step.selector]) {
          const data = await node.getAttribute('data-record');
          if (data) output.structuredRecord = JSON.parse(data);
        }
        output.steps.push({ action: step.action, selector: step.selector });
        emit('page_extracted', 'Extracted page result from rendered portal content.');
      } else if (step.action === 'screenshot') {
        output.screenshotBase64 = (await page.screenshot({ fullPage: false })).toString('base64');
        output.steps.push({ action: step.action, captured: true });
      }
    }
    if (!output.pageText) { output.url = page.url(); output.title = await page.title(); output.pageText = (await page.locator('body').innerText()).slice(0, 12000); }
    process.stdout.write('QLO_BROWSER_RESULT=' + JSON.stringify(output) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error?.stack || String(error)); process.exit(1); });
`;

export const browserToolOutputSchema = z.object({
  success: z.boolean(), source: z.string(), query: z.record(z.string(), z.unknown()),
  result: z.object({ url: z.string(), title: z.string(), pageText: z.string(), extracted: z.record(z.string(), z.string().nullable()), structuredRecord: z.record(z.string(), z.unknown()).nullable(), screenshotBase64: z.string().nullable(), steps: z.array(z.record(z.string(), z.unknown())) }),
  evidence: z.array(z.object({ type: z.enum(["portal_result", "page_text", "screenshot"]), source: z.string(), description: z.string(), reference: z.string().optional() })),
}).strict();

export class E2BBrowserAdapter implements BrowserAdapter {
  async run(input: { actions: BrowserAction[]; query: Record<string, unknown> }, onEvent?: (event: { type: string; message: string; data?: Record<string, unknown> }) => void) {
    if (!process.env.E2B_API_KEY) throw new Error("Browser verification is unavailable: E2B_API_KEY is not configured.");
    const baseUrl = process.env.MOCK_PORTAL_BASE_URL?.replace(/\/$/, "");
    if (!baseUrl) throw new Error("Browser verification is unavailable: MOCK_PORTAL_BASE_URL must be a public deployment URL reachable from E2B.");
    const portal = new URL(baseUrl);
    if (!isBrowserRuntimeConfigured() || portal.protocol !== "https:") {
      throw new Error("Browser verification is unavailable: MOCK_PORTAL_BASE_URL must use a publicly reachable HTTPS origin, not localhost.");
    }
    const actions = input.actions.map((action) => action.action === "navigate" && action.url.startsWith("/mock/") ? { ...action, url: `${baseUrl}${action.url}` } : action);
    let sandbox: Sandbox | undefined;
    try {
      // E2B v2 enforces secured envd access. Configure this to a template rebuilt
      // with envd >= 0.2.0; old templates fail during sandbox startup.
      sandbox = await Sandbox.create(process.env.E2B_BROWSER_TEMPLATE || "playwright-chromium", { timeoutMs: 90_000 });
      onEvent?.({ type: "browser_started", message: "Browser started in an E2B sandbox." });
      await sandbox.files.write("/app/qlo-browser.cjs", script);
      await sandbox.files.write("/app/qlo-browser-input.json", JSON.stringify({ actions }));
      let eventBuffer = "";
      const execution = await sandbox.commands.run("PLAYWRIGHT_BROWSERS_PATH=0 node /app/qlo-browser.cjs", {
        cwd: "/app", timeoutMs: 60_000,
        onStdout(data) {
          eventBuffer += data;
          const lines = eventBuffer.split(/\r?\n/);
          eventBuffer = lines.pop() ?? "";
          for (const line of lines) if (line.startsWith("QLO_EVENT=")) {
            try { onEvent?.(JSON.parse(line.slice("QLO_EVENT=".length))); } catch { /* Ignore malformed progress events; final output is validated separately. */ }
          }
        },
      });
      if (execution.exitCode !== 0) throw new Error(execution.stderr || execution.error || "Remote browser execution failed");
      const marker = "QLO_BROWSER_RESULT=";
      const outputAt = execution.stdout.lastIndexOf(marker);
      if (outputAt < 0) throw new Error("Remote browser returned no structured result");
      const browserOutput = JSON.parse(execution.stdout.slice(outputAt + marker.length));
      const result = browserToolOutputSchema.parse({
        success: true,
        source: "Qlo-Africa Mock Regulatory Portal",
        query: input.query,
        result: browserOutput,
        evidence: [
          { type: "portal_result", source: "Qlo-Africa Mock Regulatory Portal", description: browserOutput.extracted["[data-testid='verification-result']"] ?? browserOutput.pageText, reference: browserOutput.url },
          { type: "page_text", source: browserOutput.title, description: browserOutput.pageText, reference: browserOutput.url },
          ...(browserOutput.screenshotBase64 ? [{ type: "screenshot", source: "E2B Chromium", description: "Browser screenshot captured.", reference: "embedded:screenshotBase64" }] : []),
        ],
      });
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Remote browser execution failed";
      throw new Error(`Browser verification failed: ${message}`);
    } finally {
      if (sandbox) await sandbox.kill().catch(() => undefined);
    }
  }
}
