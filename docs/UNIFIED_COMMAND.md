# JARVIS Unified Command v4 — Android / Cloudflare

## What changes

The command center from the original GitHub Pages prototype has been adapted into a **same-origin, Cloudflare-hosted frontend** at `/command-v4`.

The UI retains the dark blue layout, live stats, projects, tasks, memories, approval queue and chat appearance, but uses Cloudflare Worker endpoints rather than browser `localStorage`:

| UI | Cloudflare API |
| --- | --- |
| Projects | `GET/POST /api/projects` |
| Tasks | `GET/POST /api/tasks`, `PATCH /api/tasks/:id` |
| Memories | `GET/POST /api/memory` |
| Approval queue | `GET /api/proposals` (read-only in this UI) |
| AI chat | `POST /api/ai-chat` |
| Chat history | `POST /api/chat-history` (on user initiation) |

The UI also links to Planner v3, Executor v3, Self-Improvement v3, Sandbox v3, Autonomy Control v3, and Recovery.

## Build and verify

```bash
npm run build:unified
npm test
```

Build creates `dist/jarvis-backend.mjs`, a derived Worker with the new `/command-v4` route. It **does not edit** the Cloudflare Worker snapshots under `cloudflare/workers`. It does not deploy or connect to Cloudflare. The output is intentionally ignored by Git.

Existing GitHub Pages frontend (`index.html`, `app.js`, `style.css`) stays unchanged, preserving all data saved on the phone. There is **no automatic migration**. The Cloudflare UI can optionally import the memory JSON exported from the local prototype after an explicit confirmation. It does not automatically import projects or tasks, or delete local records.

## Security boundaries

The unified UI must be served from the protected Cloudflare origin. API calls are relative and use same-origin credentials. Never point the GitHub Pages static site directly at private Cloudflare API endpoints or include Access tokens in public code.

The approval queue is read-only; individual important operations still require their existing review and approval controls. The built UI does not automatically run tools, apply fixes, or approve plans. Cloudflare data is only changed by explicit UI commands.

The Cloudflare service should preserve the following bindings and deployment controls when proposing any future release: production D1 `DB`, Worker AI `AI`, `STAGING_SERVICE`, `BACKUP_SERVICE`, `VERSION`, configured VAPID Worker secrets, and the existing Access authentication policy.

## Important limitations

- This build is a **candidate**, not a deployed production release.
- The interface is a direct integration with existing APIs, not a tested migration from localStorage.
- Real Android-browser behavior, Cloudflare Access authentication and remote API interactions require a separate staging smoke test.
- A new version of the Worker requires the Release Gate, a verified current backup, updated provenance and explicit production deployment approval.
- GitHub Pages continues to display its legacy local prototype until a separately approved change links or redirects it.
