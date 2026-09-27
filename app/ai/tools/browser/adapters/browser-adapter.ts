export type BrowserAction =
  | { action: "navigate"; url: string }
  | { action: "inspect" }
  | { action: "click"; selector: string }
  | { action: "type"; selector: string; text: string }
  | { action: "submit"; selector: string }
  | { action: "extract"; selector: string }
  | { action: "screenshot" };

export interface BrowserAdapter {
  run(input: { actions: BrowserAction[]; query: Record<string, unknown> }, onEvent?: (event: { type: string; message: string; data?: Record<string, unknown> }) => void): Promise<unknown>;
}
