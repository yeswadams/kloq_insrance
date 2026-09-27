export function isBrowserRuntimeConfigured() {
  if (!process.env.E2B_API_KEY || !process.env.MOCK_PORTAL_BASE_URL) return false;
  try {
    const url = new URL(process.env.MOCK_PORTAL_BASE_URL);
    const isLocal = ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname) || url.hostname.endsWith(".localhost");
    return url.protocol === "https:" && !isLocal && url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password;
  } catch {
    return false;
  }
}
