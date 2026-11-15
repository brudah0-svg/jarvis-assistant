# Cloud v4 regression: exact current-version release gate

The production Worker cron runs on \`0 */6 * * *\` (verified via Cloudflare API on 2026-11-15). The handler executes the **full remote staging regression only on a trigger whose scheduled UTC hour is 00**, and does a smaller automatic staging health check on other runs.

- Midnight UTC corresponds to **01:00 in Rome during CET**. The current-version remote result is only valid after the 10-check suite has actually executed, recorded to production D1, and cleaned up its synthetic fixtures.
- The release gate reads the active staging version and rejects a passing regression from an earlier version. Its freshness window is limited to 24 hours.
- GitHub CI \`tests/staging-cron-contract.mjs\` checks these source invariants. Passing this test, or the offline synthetic 10/10, **must never be recorded as a Cloudflare runtime 10/10 result**.
- After the next scheduled runtime cycle, compare \`staging_regression_runs.staging_version_id\` with the current Cloudflare deployment ID, verify 10/10, cleanup, then inspect \`staging_auto_checks\` and the release-gate output. Do not falsify rows in D1 or change production scheduling to force a pass.
- A completed remote staging regression alone cannot authorize production. An independently verified encrypted off-account backup, authentic Android login/interaction check, source provenance and explicit human approval are still required.
