# JARVIS — verified status (2026-11-14)

## Source snapshots

| Worker | Cloudflare deployment version when exported | Repository path |
| --- | --- | --- |
| Production `jarvis-backend` | `89f66668-175c-41ce-926c-b45aceef1f06` | `cloudflare/workers/jarvis-backend.mjs` |
| Isolated `jarvis-staging` | `4ffb369b-3d07-4ed6-b6ca-28d38b4d37f5` | `cloudflare/workers/jarvis-staging.mjs` |
| Private `jarvis-backup-export` | `9b917b6f-0f90-4258-b17e-45b70da58fed` | `cloudflare/workers/jarvis-backup-export.mjs` |

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
- CI test results for this new GitHub sync branch.
- GitHub and Cloudflare continuous deployment are **not** automatically connected.

## Release gate

The application intentionally blocks promotion when current provenance, regressions, or independent backup evidence is insufficient. A passed old regression is not a license to deploy. Human approval is required for production releases.
