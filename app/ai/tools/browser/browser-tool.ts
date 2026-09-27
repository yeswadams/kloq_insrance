import { z } from "zod";
import { registerTool } from "../registry";
import type { BrowserAction, BrowserAdapter } from "./adapters/browser-adapter";
import { browserToolOutputSchema, createBrowserAdapter } from "./adapters/factory";

const browserUrlSchema = z.string().max(500).refine((value) => {
  if (value.startsWith("/mock/")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Browser URLs must be HTTPS or a local /mock/ portal path");

const browserActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("navigate"), url: browserUrlSchema }).strict(),
  z.object({ action: z.literal("inspect") }).strict(),
  z.object({ action: z.literal("click"), selector: z.string().min(1).max(200) }).strict(),
  z.object({ action: z.literal("type"), selector: z.string().min(1).max(200), text: z.string().max(200) }).strict(),
  z.object({ action: z.literal("submit"), selector: z.string().min(1).max(200) }).strict(),
  z.object({ action: z.literal("extract"), selector: z.string().min(1).max(200) }).strict(),
  z.object({ action: z.literal("screenshot") }).strict(),
]);

const browserInputSchema = z.object({
  actions: z.array(browserActionSchema).min(1).max(8),
  query: z.record(z.string(), z.unknown()),
}).strict();

const adapter: BrowserAdapter = createBrowserAdapter();

export function registerBrowserTool() {
  registerTool({
    id: "browser-tool",
    name: "Browser",
    slug: "browser",
    capability: "browser",
    description: "Navigate, inspect, click, type, submit, extract structured page data, and optionally capture a screenshot.",
    inputSchema: browserInputSchema,
    outputSchema: browserToolOutputSchema,
    execute(input, onEvent) {
      const parsed = browserInputSchema.parse(input);
      return adapter.run({ actions: parsed.actions as BrowserAction[], query: parsed.query }, onEvent);
    },
  });
}
