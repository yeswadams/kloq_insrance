import type { BrowserAdapter } from "./browser-adapter";
import { E2BBrowserAdapter, browserToolOutputSchema } from "./e2b-browser-adapter";

/** Provider boundary; swap this factory to another browser provider without changing the tool/runtime. */
export function createBrowserAdapter(): BrowserAdapter {
  return new E2BBrowserAdapter();
}

export { browserToolOutputSchema };
