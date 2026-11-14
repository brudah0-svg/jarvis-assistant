# JARVIS Unified Command v4 — Android-first design

## Goal

Preserve the dark/cyan design of the original GitHub Pages dashboard while connecting a new protected interface to the existing Cloudflare backend on the **same origin**.

This is a **GitHub build artifact only**, not an authorized production deployment.

## Routes and architecture

- UI source: `cloudflare/ui/command-v4.html`.
- `npm run build:unified` injects the static UI at `GET /command-v4` in the original Worker source and writes `dist/jarvis-backend.mjs`.
- Build does **not** edit the original Worker source or its pinned SHA-256 provenance.
- The original GitHub Pages `index.html` and `app.js` remain untouched.
- All API calls use same-origin `/api/...` requests and Cloudflare Access browser credentials.

## Functional scope

- Projects: list and create (cloud D1).
- Tasks: list, create and update status (cloud D1, confirmation for updates).
- Memory: list, create, export selected memories, optionally import **only** user-selected local export file with confirmation.
- AI chat: Workers AI through `/api/ai-chat`, if backend binding is configured.
- Human approval: display pending proposals, but approval remains in existing protected modules.
- Advanced modules: Planner, Executor, Self-Improvement, Autonomy Control, Sandbox, Recovery.

## No silent migration

GitHub Pages uses localStorage under `brudah0-svg.github.io`, a **different origin** from the Cloudflare Worker. Those records are not present in D1 and cannot be read from the new origin. No imported memories, projects or tasks are automatically created. The user must deliberately export from the old site and import compatible data using supported workflows.

Avoid loading private data into public GitHub Pages or putting it into repository files.

## Security and rollout

- The UI is embedded in the protected Worker, **not** hosted publicly on GitHub Pages.
- No new cross-origin data routes, token storage, or relaxed CORS.
- Content Security Policy restricts network calls to the same origin.
- Dashboard loads data only after authenticated API responses; no local fallback that could silently diverge.
- No production deployment, GitHub Pages replacement, Cloudflare bindings changes, or data migration is performed by these changes.

### Release checklist

1. Run `npm test` and review the generated `dist/jarvis-backend.mjs`.
2. Check Cloudflare Access protections on the **new route**.
3. Test in an authenticated, private preview environment using synthetic isolated D1.
4. Confirm API shape compatibility and original data safety.
5. Produce fresh verified backup and rollback plan, obtain release approval.
6. Deploy only after approval; keep the legacy GitHub Pages site until the new protected interface passes user acceptance.
