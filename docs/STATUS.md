# JARVIS — verified status (2026-11-15)

## Source snapshots

| Worker | Cloudflare deployment version when exported | Repository path |
| --- | --- | --- |
| Production `jarvis-backend` | `89f66668-175c-41ce-926c-b45aceef1f06` | `cloudflare/workers/jarvis-backend.mjs` |
| Isolated `jarvis-staging` | `4ffb369b-3d07-4ed6-b6ca-28d38b4d37f5` | `cloudflare/workers/jarvis-staging.mjs` |
| Private `jarvis-backup-export` | `9b917b6f-0f90-4258-b17e-45b70da58fed` | `cloudflare/workers/jarvis-backup-export.mjs` |

## Staging v4 deployment (2026-11-15)

- **Current private staging Worker deployment:** `a43a3a07-4e54-4577-a775-3a11db96258e`.
- **Previous recoverable staging Worker version:** `4ffb369b-3d07-4ed6-b6ca-28d38b4d37f5` (the source snapshot pinned above).
- **Build inputs:** `scripts/build-v4-staging.mjs` and pinned `cloudflare/ui/command-v4-staging-snapshot.html`. The existing staging source snapshot is kept immutable so the build reproduces the candidate safely.
- **Deployed candidate:** 326,882 characters; guarded `/command-v4` view, synthetic memory/proposal reads, regression fixture routes retained. No live Workers AI binding.
- **Cloudflare verification:** staging `workers.dev` and preview URL both disabled; only staging D1 `DB` and `VERSION` bindings present; staging D1 quick check is `ok` and 1 project/1 task fixtures unchanged.
- **GitHub CI:** v4 staging synthetic contract passed for UI, read-only APIs, blocked writes and absent privileged endpoints. This is **not** a remote HTTP/browser test of the running staging Worker.
- **Still missing:** authenticated Android browser smoke test, current-version 10/10 staging regression and exact code parity/provenance review. The Release Gate must stay blocked until those tests are complete. **No production rollout approved or performed.**

## Confirmed in Cloudflare

- Production has an AI binding, production D1 `DB`, `STAGING_SERVICE`, `BACKUP_SERVICE`, VAPID secrets, and `VERSION`.
- Staging has a separate D1 `DB` and `VERSION` binding. Its workers.dev subdomain is disabled.
- Private backup/export service has its own `BACKUP_DB` D1 binding. Its workers.dev subdomain is disabled.
- The production D1 database was previously checked with `PRAGMA quick_check = ok`; 2 projects, 20 tasks.
- A full D1 snapshot was previously verified, with 33 tables and 87 records; a recovery drill reconstituted 33/33 tables and 87/87 records in an isolated database.
- A staging regression of 10/10 passed for a previous staging version. **It must be rerun for any new staging version before release.**
- Backup and autonomy scheduled jobs are configured for every six hours.

## Cloud v4 chat hardening (2026-11-15)

- GitHub PR #13 merged after passing GitHub Actions source safety tests.
- The v4 source now loads up to the backend's last 60 chat-history records on opening, rendering role-filtered text without raw HTML.
- A revision guard protects new unsent/live conversation content from a late history response, and simultaneous chat submissions are blocked.
- User messages are persisted before AI inference; if user-message persistence fails, inference is suspended and the input is restored. A failed AI request cannot remove the already saved user message.
- The integration is **source code only**, not the deployed production Worker nor an end-to-end browser or remote integration verification.
- The staging snapshot remains pinned to the previously deployed version; no silent staging or production update was performed.

## Cloudflare live audit and regression remediation (2026-11-15)

- Confirmed exact SHA-256 parity against the Cloudflare API for deployed production `89f66668-175c-41ce-926c-b45aceef1f06` and staging `a43a3a07-4e54-4577-a775-3a11db96258e`.
- Staging D1 `PRAGMA quick_check` returned `ok`; the isolated fixture remains at 1 project and 1 task; `DB` bindings map to separate databases in production and staging.
- Observed actual scheduled staging regression result for **the current staging version**: `9/10 failed`. The failed check is `patch_block`; the staging v4 wrapper correctly rejects `PATCH` with HTTP 405, but the pinned production regression code expects HTTP 404.
- GitHub PR #14 fixed this mismatch **only in the generated v4 release candidate**, accepting both 404 and 405 as blocked PATCH responses. Original deployed Worker source and manifest remain unchanged. Isolated generated candidate tests passed. There has been **no Cloudflare redeployment**.
- Recent staging auto-check was `attention` (6/7), and production autonomous health check `attention` (6/9). The last independent off-account backup remains unverified. A fresh current-version regression remains required after any future backend deployment.
- **Release gate remains blocked.** Source parity, CI tests, and a historical passing 10/10 cannot substitute for a new runtime test, verified independent backup, current candidate provenance, Android acceptance and explicit production release approval.

## Isolated staging PATCH correction deployed and verified (2026-11-15)

- **Current staging version:** `9da6659c-9f2e-4d18-a1c1-66f602cc2861`. Original version `a43a3a07-4e54-4577-a775-3a11db96258e` is the rollback target.
- **Exact deployed code hash verified:** `b024e3dfa5e02614a9b689b42f49ac7e93cc1ba73a6c9b21ce6994b320f8eaca` with 326,963 JavaScript characters.
- Only the isolated staging Worker was updated. Production remains at `89f66668-175c-41ce-926c-b45aceef1f06`.
- Verified bindings: only isolated staging D1 `DB` and `VERSION`. `workers.dev` and public previews disabled; no Workers AI or VAPID binding. Staging D1 `PRAGMA quick_check = ok`, 1 synthetic project and 1 synthetic task.
- Static candidate CI was green prior to upload. The live 10/10 regression has **not** yet been observed on this new version; the prior 9/10 run remains historical.
- Release gate remains **blocked**, pending fresh live regression, independent encrypted off-account backup, Android acceptance, provenance manifest for the production candidate and explicit approval for production release.

## Latest Cloud v4 UI deployed to isolated staging (2026-11-15)

- **Current staging Worker:** `b27360b9-b467-4770-beeb-bf8f08629a6d`; previous rollback `9da6659c-9f2e-4d18-a1c1-66f602cc2861`.
- The staged UI now contains the current chat history hydration and user-first durable chat flow. All write controls are disabled in staging, with a synthetic empty history API response and no live AI binding.
- Independently verified the deployed source hash against GitHub candidate: `9b12762d54cb53ae883a1ee1d0525a454012c646c05af69be0b3f24883fe7c6a` (330,067 characters).
- Staging D1 integrity `ok`, one project and one task; only isolated D1 `DB` and `VERSION` bindings, public workers.dev and previews off. Production Worker unchanged.
- The remote current-version 10/10 regression, Android browser acceptance, independent external encrypted backup and formal release candidate verification remain **unverified**; keep release gate closed.

## Full synthetic 10-check staging regression (2026-11-15)

- GitHub PR #19 merged after GitHub Actions passed a new offline synthetic regression against the current pinned staging UI Worker source.
- **Result: 10/10 passed** locally, including fixture creation/read, forbidden POST and PATCH rejection, fixture cleanup and stable version. The synthetic D1 baseline was restored to 1 project/1 task.
- This is **not** a Cloudflare runtime regression and must not be entered into production D1 as such. Cloudflare's latest recorded runtime regression remains the historical failed 9/10 run for previous staging version `a43a3a07-4e54-4577-a775-3a11db96258e`.
- Current deployed staging is `b27360b9-b467-4770-beeb-bf8f08629a6d`, verified at SHA-256 `9b12762d54cb53ae883a1ee1d0525a454012c646c05af69be0b3f24883fe7c6a`. An authenticated remote regression on this exact version remains required.
- Production remains unchanged and the release gate is blocked pending remote verification, off-account encrypted backup, Android acceptance and approval.

## Android-like browser smoke validated (2026-11-15)

- GitHub PR #20 merged, adding isolated Chromium UI tests for Android-like 360/393/412 px widths, touch interaction support, synthetic dashboard reads, disabled write controls, no external API calls or horizontal overflow.
- The mobile browser GitHub Actions run passed, with a synthetic screenshot uploaded as a short-lived GitHub artifact.
- This test runs on CI, **not** on the user's physical Android device or a remote authenticated Cloudflare browser session.
- Cloudflare staging runtime 10/10, real authentication smoke, independent encrypted off-account backup, current release candidate provenance and explicit production release approval remain outstanding.
- ChatGPT monitoring was re-enabled for the existing 6-hour task; it does not automatically perform deployments or data changes.

## Read-only v4 staging UI hardened and deployed (2026-11-15)

- New isolated staging Worker version: `6c50ebad-cd5a-48af-b3e2-fbe8a2c66dcf`; rollback: `b27360b9-b467-4770-beeb-bf8f08629a6d`.
- Cloudflare source was read back and verified at SHA-256 `15e680cc19d5a19931f27bdd0e93857178175286a94f2e4412f639907464e22f` (330,480 characters), matching green mobile Chromium candidate tests.
- UI task completion controls disabled in staging after render, click handling guarded, production module links non-navigable.
- Staging public workers.dev and previews disabled; isolated D1 and VERSION bindings; D1 quick check = ok with one synthetic project and one task. Production unchanged at `89f66668-175c-41ce-926c-b45aceef1f06`.
- **Release gate remains blocked:** current-version 10/10 remote Cloudflare regression, independent encrypted off-account backup, authenticated physical Android acceptance and approval incomplete.

## Current-version release gate and scheduled regression checks (2026-11-15)

- GitHub PR #23 merged after successful GitHub Actions tests. The synthetic release-gate contract now reads its staging version from the current `cloudflare/STAGING_V4_DEPLOYMENT.json` rather than hardcoding a stale version.
- Additional source contract confirms production Worker cron logic: automatic checks every six hours, full remote staging regression only for the scheduled 00:00 UTC run, results recorded to D1, exactly 10/10 plus successful fixture cleanup, 24-hour freshness and exact version matching.
- Cloudflare cron configured as `0 */6 * * *`. The daily regression is **not** automatically run by the GitHub tests; current remote 10/10 evidence is not yet present.
- Production remains pinned; the release gate remains blocked until current-version remote runtime result, independent encrypted external backup, authenticated Android acceptance, provenance and human authorization.

## Not verified / outstanding

- First live executions of the new scheduled health/backup/staging cycles: last observed counters were zero.
- Off-account encrypted backup download and local re-verification on Android.
- End-to-end production parity, rollback of the current Worker, and production D1 restoration.
- CI results: source checks, encrypted backup, core v3 contracts, v4 static preview and v4 staging synthetic contracts have passed. Remote staging HTTP/browser integration remains unverified.
- GitHub and Cloudflare continuous deployment are **not** automatically connected.

## Release gate

The application intentionally blocks promotion when current provenance, regressions, or independent backup evidence is insufficient. A passed old regression is not a license to deploy. Human approval is required for production releases.
