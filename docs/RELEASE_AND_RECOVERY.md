# Release safety and recovery

**No automatic production deploy configured.** CI validates code only.

## Before any proposed release

1. Check Cloudflare deployed version IDs and binding names.
2. Confirm isolation: staging must not have production D1, Workers AI, VAPID private secrets or a public workers.dev route.
3. Run tests in staging, including a fresh regression with fixture cleanup.
4. Verify exact source/provenance of the release candidate (not only a staging route health check).
5. Verify an up-to-date complete D1 snapshot and an isolated restore. Off-account backup remains required by the current release gate.
6. Ensure a previous Worker version can be restored and note database migration/rollback limitations.
7. Obtain explicit approval before deployment or data restore.

## D1 backups

Cloudflare production: `jarvis-memory` D1. Backup: `jarvis-project-backup` D1. Staging: `jarvis-staging` D1. Never share the IDs or snapshots as credentials. Snapshot metadata, schemas and records can contain personal information, so do not commit exports.

The backup UI is hosted by the production Worker at `/recovery-download-v3`. It is designed to encrypt downloaded data locally on Android with AES-256-GCM; a user's password is not sent to the Worker.

**Do not assume** an off-Cloudflare copy exists until the encrypted archive has been downloaded and validated elsewhere. Production D1 restore must remain a deliberate human-approved operation.

## Security operations

Keep VAPID private keys and any other secrets in Cloudflare Worker secrets; provide no secret values in Git. Cloudflare Access/auth policy must be tested before expanding any public API. Treat source of worker v3 as a snapshot, not a safe production deployment recipe without reviewing the code and bindings.
