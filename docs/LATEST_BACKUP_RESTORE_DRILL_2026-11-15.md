# Isolated recovery drill — latest JARVIS D1 snapshot

Date: 2026-11-15.

## Scope and actual execution

- Snapshot ID: `2a1e5a8c-7a27-43d7-acd3-2411eddfbf02` (latest verified full application snapshot at the time of this test, saved 2026-11-15 06:00:14 UTC).
- Source: private Cloudflare D1 backup `jarvis-project-backup`; 35 application tables and 96 records.
- Independently recomputed SHA-256 over ordered archived table definitions and ordered archived records: **both hashes matched the stored snapshot**.
- Compared all application table names against the current production D1. Cloudflare's internal `_cf_KV` table is not an application table and was intentionally excluded.
- Created a **new, temporary EU-jurisdiction D1 database**, with no Worker bindings and no public URL. No existing D1 database was reused or overwritten.
- Recreated 35 SQL tables from the archived schema. Inserted 96 archived application records into the temporary database.
- Performed actual SQLite `PRAGMA quick_check`: **ok**.
- Performed `PRAGMA foreign_key_check`: **zero violations**.
- Read back every restored table and compared all restored row contents with the saved archived records, allowing order-independent comparison: **35/35 tables, 96/96 records matched exactly**.
- Deleted the temporary D1 database after verification. Queried the Cloudflare account again to confirm its absence and the original list of four databases.
- Production Worker and staging Worker version IDs did not change. No production/staging data or app backups were overwritten.
- No raw rows, credentials, encryption passwords, or personal backup data were written to GitHub or this report.

## Result

**PASS — SQL-level reconstruction and integrity of the latest snapshot verified in an isolated database, with cleanup verified.**

This test provides genuine restore evidence for the latest 35-table/96-record application snapshot and supersedes the historical caveat that only the older 33-table/87-record snapshot had been restored.

It does **not** prove every user-facing feature on a live restored JARVIS application, physical Android authentication, or successful production rollback. Such scenarios remain separate acceptance requirements. It does not verify that the user's second off-device encrypted file is byte-identical with the locally checked file.

**Audit limitation:** The archival `restore_test_verified` flag in Cloudflare D1 still reads 0 because this test deliberately did not mutate backup metadata or the production release gate. This GitHub report records the independently executed test, but should not be presented as if that flag had been updated.

## Remaining release conditions

- A **fresh remote Cloudflare regression** recorded 10/10 with successful cleanup on the current deployed staging version `6c50ebad-cd5a-48af-b3e2-fbe8a2c66dcf`.
- Authenticated end-to-end Android acceptance on the actual device.
- Exact production-candidate provenance and rollback planning.
- User confirmation of any required final off-device evidence and explicit approval before production deployment.

No new purchase or paid service was authorized.
