# Architecture

```text
Android browser / installable web app
   ├─ legacy GitHub Pages local-only prototype (root files)
   └─ Cloudflare Access → jarvis-backend Worker
                         ├─ D1 DB (projects, tasks, memory, plans, audits)
                         ├─ Workers AI
                         ├─ STAGING_SERVICE → private jarvis-staging → isolated staging D1
                         └─ BACKUP_SERVICE → private jarvis-backup-export → separate backup D1
```

## Functional modules

- JARVIS command center and text/AI chat
- Planner v3 (plans and reviewable steps)
- Task and project operations
- Android push notification preview and monitored tasks
- Read-only executor checks, sandbox simulation, staging regressions
- Release eligibility gate and version provenance records
- Recovery preflight, full snapshot archive and isolated restore drill
- Autonomy health checks and deduplicated remediation proposals
- Encrypted backup download page (AES-256-GCM, key derived on the device)

## Safety model

1. Read-only diagnosis can be scheduled.
2. Synthetic tests run on isolated D1 and must clean up fixtures.
3. Remediation cases record diagnosis, rollback plan, testing instructions and risk.
4. Consequential changes (data mutation, publishing, restoring production, sending messages, purchases) require explicit human authorization.
5. A backup within the same Cloudflare account is not independent disaster recovery.
6. Source files must not embed credentials or sensitive user records.

## Android-first

Use mobile-accessible GitHub and browser workflows; do not require a desktop. GitHub Actions can run syntax/test checks in the cloud.

## Source of truth

Cloudflare currently hosts production. GitHub is being synchronized to enable version control and code review. The legacy root PWA and Cloudflare Worker are separate interfaces: do not claim they are the same app or combine their storage without an explicit migration design.
