# Latest JARVIS snapshot — isolated Cloudflare D1 restore audit

Execution date: 2026-11-15.

## Reproducible evidence

- Latest verified internal backup snapshot at audit time: `ce2ac51a-6d8e-47c0-8951-919031e15251`, created `2026-11-15 12:00:13 UTC`.
- Full application data: **35 tables, 101 records**.
- Read the archived schema definitions and records directly from the private backup D1, with read-only source queries.
- Independently recomputed both SHA-256 digests from the canonical ordered stored data: the schema hash and records hash matched the stored metadata.
- Compared the 35 archived application table names with current production's application schema (excluding only Cloudflare internal `_cf_KV`).
- Created a **new EU-jurisdiction temporary D1 database**, unrelated to production, staging, the backup store or other projects. No Worker bound to the temporary database.
- Recreated all 35 archived table definitions, inserted 101 records, then executed `PRAGMA quick_check` and `PRAGMA foreign_key_check`.
- SQLite reported **quick_check = ok**, **zero foreign-key violations**.
- Read back all 35 restored tables and compared every one of the **101 actual restored records** with the archived records. Result: **all contents matched**.
- Deleted the temporary D1 database after verification. Re-queried the Cloudflare account to confirm it was absent and that the original four databases remained.
- Independently re-read both deployed Worker versions and their full module bytes from Cloudflare. Production unchanged at `89f66668-175c-41ce-926c-b45aceef1f06`; staging unchanged at `80077801-2762-4ed3-8581-42b806032c4a`.

**Outcome: PASS — latest 101-record backup restored and independently read back in isolated D1, cleanup confirmed, production unchanged.**

## Current deployed provenance (read-back from Cloudflare)

| Worker | Deployed version | SHA-256 of currently deployed JavaScript | JS characters |
| --- | --- | --- | ---: |
| Production `jarvis-backend` | `89f66668-175c-41ce-926c-b45aceef1f06` | `15f9b6ca957c2999208efd65ce5918e9579bc7d6006faf2035410d796acfee17` | 334931 |
| Isolated `jarvis-staging` | `80077801-2762-4ed3-8581-42b806032c4a` | `b845663d63775b34d681bf7294287117b7915fa61f0b88722383e7d07c2b5f0a` | 330634 |

## Current regression

- Cloudflare production D1 records an actual private staging regression run ID `cda29b08-c813-42fb-8d45-1675407cdf48`, created `2026-11-15 12:51:54 UTC`.
- The test ran against the currently deployed staging version `80077801-2762-4ed3-8581-42b806032c4a` and passed **10/10**, with `cleanup_passed=1`.
- The user supplied authenticated Android screenshots confirming private Worker-to-Worker verification and this exact 10/10 regression. No production application data was modified.

## Release restrictions still in place

- The archived snapshot's `restore_test_verified` flag remains 0 because this test deliberately **did not write or falsify backup metadata**. This report is evidence of an independently executed restore, not a claim that Cloudflare's old audit flag automatically updated.
- The user previously verified a local AES-GCM file with **96 rows** and confirmed storage of an additional encrypted copy away from the phone. Those files were not verified as equivalent to this later **101-row** snapshot. A current off-device copy and its byte-integrity still require proof.
- An older `release_candidate_manifests` D1 record references outdated Worker versions; no current candidate was approved or deployed by this audit.
- A complete **functional authenticated Android acceptance test** of the production candidate remains separate from successful infrastructure verification.
- A final explicit human decision is still mandatory before any production release.
- No production Worker, production D1, cloud secret, or existing database was changed or overwritten for this audit. No private backup records were committed to GitHub.

No purchase was authorized; this report does not make any claim about future usage-based account charges.
