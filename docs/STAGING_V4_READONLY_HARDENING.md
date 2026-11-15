# Staging v4 read-only UI hardening

The deployed staging v4 is source-pinned. The new builder \`scripts/build-v4-ui-hardened.mjs\` starts from the exact verified deployed source and adds UI-level defensive measures **without touching the deployed Worker**:

- Task status buttons rendered from data are disabled in staging.
- Delegated task click handling exits immediately in staging even for synthetic/programmatic events.
- Module links into the production Worker are disabled in the read-only staging preview.
- All existing Worker-level HTTP write denials, separate synthetic D1 binding and no-AI constraints remain unchanged.

\`mobile-smoke.yml\` runs the ordinary pinned staging browser test first and the hardened candidate browser test second. Both run only on loopback with synthetic D1 and Android-like viewport/touch settings. A pass does not prove the release on a physical Android device or on remote Cloudflare. If promoted to staging, rehash and update the release manifest **only after independently verifying the deployed source**. Never deploy this UI candidate directly to production.
