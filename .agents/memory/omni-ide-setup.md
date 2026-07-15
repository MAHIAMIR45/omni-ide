---
name: OMNI IDE project setup
description: Key architecture decisions and runtime quirks for the OMNI IDE app.
---

## Structure
- Express backend: `server/index.js` on port 5000 — serves `/api/*` routes only.
- Vite React frontend: `client/` on port 5173 — proxies `/api` and `/uploads` to port 5000.
- Two workflows required: `Backend` (console, port 5000) and `Start application` (webview, port 5173).

## Secrets
- `SESSION_SECRET` — pre-existing Replit secret.
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — added by user for GitHub OAuth.
- AI bearer token is **hardcoded server-side** in `server/routes/ai.js` and `server/routes/status.js` — never exposed to client.

## AI Configuration
- Base URL: `https://bb9ce817-4178-4a83-8cff-f1e6a2e4507c-00-26fvbji4nkddx.sisko.replit.dev/v1/chat/completions`
- Default model: `mcode/mimo-auto` — 30+ models in ModelSelector dropdown.
- Status monitor: pings every 30s from `server/routes/status.js`, result polled by frontend every 30s via `/api/status`.

**Why:** AI credentials are server-only to avoid leaking bearer token in browser network traffic.

## Key Conventions
- File upload auto-delete: cron every 5 min + per-file setTimeout (20–25 min range) in `server/routes/upload.js`.
- Chat history persisted in React context keyed by `activeProject.fullName` — survives view switches within a session.
- File tree is flat paths; `buildTree()` in `FileTree.jsx` converts to nested object on render.
- Monaco uses CDN (`cdn.jsdelivr.net`) for the VS module — avoids large local bundle.
- xterm.js is dynamically imported inside `useEffect` so it degrades gracefully if unavailable.

## GitHub OAuth Callback
- Callback URL must be: `https://{REPLIT_DEV_DOMAIN}/api/auth/github/callback`
- Configured via `server/config/passport.js` using `GITHUB_CALLBACK_URL` env or auto-derived from `REPLIT_DEV_DOMAIN`.
