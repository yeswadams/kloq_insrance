# Kloq Insurance Underwriting Workspace

This Next.js application includes an agent workspace with a remote E2B Chromium browser for the fictional Qlo-Africa KRA verification portal.

## Development

Configure `.env`, then run:

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Remote browser demo setup

The browser runs in E2B and cannot access the developer machine's `localhost`. Set these server-only environment variables:

- `E2B_API_KEY`: an E2B API key.
- `MOCK_PORTAL_BASE_URL`: a public HTTPS origin for this app, without a path suffix (for example, `https://your-deployment.example`). The `/mock/kra` route must be reachable without app sign-in or deployment protection.

Use a deployed HTTPS URL, or expose local port 3000 through an HTTPS tunnel. For example, with Cloudflare Tunnel installed, run `cloudflared tunnel --url http://localhost:3000`, then set `MOCK_PORTAL_BASE_URL` to the generated `https://...trycloudflare.com` origin. Never set this value to localhost. Restart Next.js after changing environment values.

Open `/agents`, select an enabled agent, and submit a tax verification request in its workspace. `/mock/kra` also has a form for manually looking up the deterministic demo records. The portal and its data are fictional and not connected to KRA or another government system.

If E2B or the public portal URL is missing, or if the portal is unreachable, the browser tool reports a controlled failure. The agent then records that no compliance conclusion was made.
