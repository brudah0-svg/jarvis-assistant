# JARVIS — persistent private Website Builder drafts release

**Date:** 2026-11-15. **Release mode:** protected additive production update.

## Deployment verification

- Existing Cloudflare Worker: `jarvis-backend`. Active version `4cd57d3f-38ac-459e-8c81-a1c4b737dcc6`; SHA-256 of deployed code read back directly from Cloudflare: `483f39ff34290d475d751c56da4c468e7b5ea439e6ae809f123ec18f8495cbb8` (400,650 JavaScript characters).
- Hash matches exact builder candidate produced by GitHub CI Website Builder security and generation run `43731010309`.
- Previous production version (rollback of Worker only): `904629dc-9ffc-48e0-b313-3e6f4aa3820a`. Rolling back the Worker does **not** drop the new additive D1 table.
- Cloudflare Access self-hosted app and its policies preserved; all seven Worker bindings unchanged, including D1, AI, private backup and staging services and VAPID secrets.
- Existing `/jarvis` and `/jarvis-unified` routes preserved. The new UI includes `siteSaveDraft`, `siteDraftsList` and private preview/download controls.
- Staging Worker remains `80077801-2762-4ed3-8581-42b806032c4a`; no staging edits.

## Additive migration

- Created `site_drafts` with columns `id,title,brief,style,contact_email,html,created_at` and `site_drafts_created_idx` index (source `cloudflare/migrations/20261115_site_drafts.sql`).
- The source table was absent before migration. No table was dropped or changed, and no existing record was migrated.
- Verified `PRAGMA quick_check=ok` after the migration and Worker deployment.
- Existing production application data remains **2 projects and 20 tasks**, with **0 new draft records** immediately after deployment.

## End-to-end delivered behavior

- The `Website Builder` form, voice input and chat-generated websites now support **opt-in saving** of the generated standalone HTML directly to Cloud D1; the checkbox is enabled by default and is visible.
- A dedicated private `GET /api/site-drafts` endpoint lists up to 30 drafts with metadata only. `GET /api/site-drafts/:uuid` returns one saved draft including its generated HTML, brief and styling information.
- Users can reopen a draft on Android, see the sandboxed preview and download the HTML without spending another model inference call.
- The server saves only trusted template-rendered HTML generated inside the Worker, not arbitrary client-submitted HTML. No public publishing or deletion endpoint is exposed.
- The archive limit is 30 drafts without automatic eviction. A failed save never claims persistence and lets the user download the generated HTML manually.

## Verification evidence and limitations

- PR #47 merged after GitHub Actions source safety, server approval-truth, Website Builder contract and Chromium Android-like browser acceptance.
- Independent Worker contract tested save/no-save, D1 list and exact record read-back, invalid UUID handling, missing DB, full archive, no publishing and preserved legacy routes.
- Chromium test exercised creating drafts, listing them, reopening the preview and downloading HTML, with synthetic data and no external publishing.
- The actual Cloudflare Worker deployment and table were verified by API read-back, but **an authenticated, physical Android test of a real Workers AI generation and saved-draft reload has not been observed**. Do not mark that as completed.
- This feature is not persistent autonomous multi-agent execution, public site launch, or full self-upgrading JARVIS. Those capabilities remain unimplemented.
- Previous Cloudflare 35-table/101-row backup predates the new `site_drafts` table. No fresh independent off-device encrypted archive was verified in this release.
