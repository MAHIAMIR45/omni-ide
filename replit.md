# OMNI IDE — AI-Powered Coding Environment

## Overview
A premium, dark-themed AI coding IDE with GitHub integration, Monaco Editor, xterm.js terminal, and live preview. Built with React (Vite) + Express.js backend.

## Architecture

```
/
├── server/               # Express.js backend (port 5000)
│   ├── index.js          # Main server + cron cleanup
│   ├── config/passport.js
│   └── routes/
│       ├── auth.js       # GitHub OAuth (passport-github2)
│       ├── github.js     # Octokit GitHub API
│       ├── ai.js         # AI chat proxy (streaming SSE)
│       ├── piston.js     # Piston code execution proxy
│       ├── upload.js     # File upload + auto-delete
│       └── status.js     # AI health monitor (30s ping)
├── client/               # Vite React frontend (port 5173)
│   └── src/
│       ├── context/AppContext.jsx  # Global state
│       ├── components/
│       │   ├── Header.jsx          # AI status banner
│       │   ├── LandingPage.jsx     # GitHub sign-in
│       │   ├── RepoDashboard.jsx   # Repo grid
│       │   ├── Workspace.jsx       # 3-column IDE
│       │   ├── FileTree.jsx        # File explorer + drag/drop upload
│       │   ├── CodeEditor.jsx      # Monaco editor (OMNI dark theme)
│       │   ├── Terminal.jsx        # xterm.js + Piston runner
│       │   ├── Preview.jsx         # Live iframe preview
│       │   ├── AIChat.jsx          # AI agent chat
│       │   └── ModelSelector.jsx   # Model dropdown
└── temp/uploads/         # Ephemeral file storage (auto-deleted 20–25 min)
```

## Environment Variables Required

| Variable | Description |
|----------|-------------|
| `SESSION_SECRET` | Express session secret ✅ already set |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |

### Setting up GitHub OAuth:
1. Go to https://github.com/settings/developers → OAuth Apps → New OAuth App
2. Homepage URL: `https://YOUR_REPLIT_DEV_DOMAIN`
3. Callback URL: `https://YOUR_REPLIT_DEV_DOMAIN/api/auth/github/callback`
4. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` as Replit secrets

## Development
- Backend: `http://localhost:5000` (Express)
- Frontend: `http://localhost:5173` (Vite, proxies /api → 5000)
- Preview shows port 5173

## AI Configuration
- Base URL: `https://bb9ce817-4178-4a83-8cff-f1e6a2e4507c-00-26fvbji4nkddx.sisko.replit.dev/v1/chat/completions`
- Default Model: `mcode/mimo-auto`
- Status ping: every 30 seconds
- Models: 30+ across mcode, oc, qwen-web, ollamacloud, mistral categories

## User Preferences
- Dark theme only — no light mode
- Premium, professional aesthetic (VS Code meets Vercel)
- All AI credentials stay server-side (never exposed to client)
