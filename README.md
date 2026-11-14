# JARVIS — Personal AI Assistant

JARVIS is an Android-first, Italian-language personal assistant with project planning, task management, AI chat, proactive monitoring, safe improvement proposals, push notifications, and protected backup/recovery tooling.

## Repository layout

- **Root `index.html`, `app.js`, `style.css`, `manifest.webmanifest`** — original standalone local-first prototype (v0.3.1). **Preserved unchanged**, including its localStorage-based behavior and GitHub Pages deployment.
- **`cloudflare/workers/jarvis-backend.mjs`** — source snapshot of the Cloudflare production Worker (main JARVIS app and API).
- **`cloudflare/workers/jarvis-staging.mjs`** — source snapshot of the private, isolated staging Worker.
- **`cloudflare/workers/jarvis-backup-export.mjs`** — source snapshot of the private backup/export Worker.
- **`cloudflare/configs/`** — example binding configs; fill in D1 IDs locally and configure secrets in Cloudflare.
- **`docs/`** — architecture, current state, security, and release instructions.
- **`scripts/check-source.mjs`** — static source and safety checks.

## Current deployments and limitations

The active JARVIS Worker runs at `https://jarvis-backend.jarvisproj3ct.workers.dev/jarvis` and is protected by access controls. **The static root prototype is not the Cloudflare application's source frontend**; the Cloudflare Worker serves its own interface and endpoints.

Source was retrieved on **14 November 2026** directly from the deployed Workers and saved on a dedicated Git branch. These are snapshots, **not proof that GitHub automatically deploys to Cloudflare**. The production and staging Worker builds are different: staging contains special restrictive guards and may lag production. Never deploy production source to staging without preserving isolation.

**Approval required:** merging or promoting releases, sending messages, modifying sensitive data, purchases, database restores, and irreversible changes. CI only checks source; it does not deploy.

## Development workflow

1. Make changes on a dedicated branch.
2. Run `npm test` (Node.js 20+). This invokes syntax and static safety checks.
3. Review the diff and test changes against isolated staging.
4. Confirm worker bindings and D1 recovery. Do not assume a clean 10/10 regression of an old staging version validates the current production build.
5. Request human approval for any production release.

No API keys, passwords, VAPID private keys, D1 contents, or user records belong in this public repository.

## Status

See [docs/STATUS.md](docs/STATUS.md) for exact deployed versions and what is or is not verified.
