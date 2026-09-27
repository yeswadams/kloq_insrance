import type { RegisteredTool, ToolResult } from "./types";

const tools = new Map<string, RegisteredTool>();

export function registerTool(tool: RegisteredTool) {
  tools.set(tool.slug, tool);
}

export function getTool(name: string) {
  return tools.get(name);
}

export function listTools() {
  return [...tools.values()].map(({ id, name, slug, capability, description }) => ({ id, name, slug, capability, description }));
}

export async function executeTool(name: string, input: unknown, onEvent?: (event: { type: string; message: string; data?: Record<string, unknown> }) => void): Promise<ToolResult> {
  const tool = getTool(name);
  if (!tool) throw new Error(`Tool ${name} is not registered`);
  const parsed = tool.inputSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid input for ${name}: ${parsed.error.message}`);
  const output = await tool.execute(parsed.data, onEvent);
  const validated = tool.outputSchema.safeParse(output);
  if (!validated.success) throw new Error(`Tool ${name} returned invalid output: ${validated.error.message}`);
  return validated.data as ToolResult;
}
