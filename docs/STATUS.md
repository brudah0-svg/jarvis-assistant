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
- **Build inputs:** `scripts/build-v4-staging.mjs` and `cloudflare/ui/command-v4.html`. The existing staging source snapshot is kept immutable so the build reproduces the candidate safely.
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

## Not verified / outstanding

- First live executions of the new scheduled health/backup/staging cycles: last observed counters were zero.
- Off-account encrypted backup download and local re-verification on Android.
- End-to-end production parity, rollback of the current Worker, and production D1 restoration.
- CI results: source checks, encrypted backup, core v3 contracts, v4 static preview and v4 staging synthetic contracts have passed. Remote staging HTTP/browser integration remains unverified.
- GitHub and Cloudflare continuous deployment are **not** automatically connected.

## Release gate

The application intentionally blocks promotion when current provenance, regressions, or independent backup evidence is insufficient. A passed old regression is not a license to deploy. Human approval is required for production releases.
