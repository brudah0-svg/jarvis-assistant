# JARVIS — Personal AI Assistant

JARVIS is an Android-first, Italian-language personal assistant with project planning, task management, AI chat, proactive monitoring, safe improvement proposals, push notifications, and protected backup/recovery tooling.

## Repository layout

- **Root `index.html`, `app.js`, `style.css`, `manifest.webmanifest`** — **JARVIS v4 local command center** served by GitHub Pages, with working projects, tasks, local memory, local commands, backup export and Android voice dictation when supported. Reuses the original v0.3 localStorage keys; it does **not** access private Cloudflare APIs directly.
- **`legacy/v03.html`** — archived v0.3 screen, available on the same GitHub Pages origin and sharing the same browser data.
- **`cloudflare/workers/jarvis-backend.mjs`** — source snapshot of the Cloudflare production Worker (main JARVIS app and API).
- **`cloudflare/workers/jarvis-staging.mjs`** — source snapshot of the private, isolated staging Worker.
- **`cloudflare/workers/jarvis-backup-export.mjs`** — source snapshot of the private backup/export Worker.
- **`cloudflare/configs/`** — example binding configs; fill in D1 IDs locally and configure secrets in Cloudflare.
- **`docs/`** — architecture, current state, security, and release instructions.
- **`scripts/check-source.mjs`** — static source and safety checks.

## GitHub Pages v4

Visit `https://brudah0-svg.github.io/jarvis-assistant/` to use the local Android app. Existing local projects, tasks and memories remain in the browser because the storage keys and origin are unchanged. Use **Esporta dati locali** to save a full JSON copy. The old interface remains at `/legacy/v03.html`.

**Important:** this GitHub Pages v4 is **not** a standalone cloud AI app. Remote AI, automation and private tools require authenticating to Cloudflare through the links in the dashboard. No credentials, D1 records or proxies are embedded in the public site. Cloudflare v4 still requires separate production release checks.

## Current deployments and limitations

The active JARVIS Worker runs at `https://jarvis-backend.jarvisproj3ct.workers.dev/jarvis` and is protected by access controls. **GitHub Pages now serves v4 as a functional local-first interface.** Cloudflare serves its separate protected AI application and backend; links from GitHub Pages open those modules but do not synchronize data or authenticate across origins.

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
