# JARVIS — latest snapshot release evidence guard

This independent, fail-closed metadata check is a safeguard for preparing a human review. Run `node scripts/verify-release-evidence.mjs <metadata-only-json>` or `npm run test:release-proof`. It never reads an actual backup, sends a network request, edits a database, or deploys production.

The supplied metadata must come from trustworthy evidence: Cloudflare current deployed version, actual same-version runtime regression and cleanup; latest snapshot with exact snapshot ID and hash verification; restore drill **of the same latest snapshot** without touching production; separately stored off-device encrypted copy of that snapshot; proven production/staging source hashes and rollback; and authenticated acceptance on the owner's physical Android.

CI uses synthetic metadata only. A passing synthetic fixture **does not** mean these prerequisites have been met in the real account. Even a complete trustworthy metadata bundle returns `eligible_for_human_review`, never `production_release_approved`. Actual production deployment always requires explicit human authorization.

This supplement intentionally does not alter the pinned deployed Cloudflare Worker source or its production API. The old recovery audit may pass using an earlier restore; this guard prevents a release packet from treating that as evidence for the latest backup. Never fabricate external-copy or restore evidence.
