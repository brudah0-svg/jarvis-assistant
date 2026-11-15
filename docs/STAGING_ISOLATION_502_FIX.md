# JARVIS v4 staging isolation verifier 502 repair

The authenticated production dashboard `/api/staging/verify` checks a prohibited `POST /api/tasks` with **no request body** or `Content-Type`. The isolated staging Worker correctly rejected it with HTTP 400 (invalid request), but the production verifier specifically expects HTTP 404 (blocked route). As a result, the dashboard displayed HTTP 502 even though the POST did not modify data.

Build `scripts/build-v4-staging-isolation-fix.mjs` uses the exact SHA-256 pinned deployed isolated staging source. It adds a guard accepting that specific no-body POST as a blocked 404; normal authorized synthetic regression POST requests still use the existing validation logic. No new write permission, AI binding, public URL, or production data access is introduced.

CI `tests/staging-isolation-verify-fix.mjs` exercises the exact private verification request and other protected writes against synthetic D1. Once deployed in **isolated staging only**, read back the Cloudflare version/source SHA-256, confirm only staging D1 and VERSION bindings, public subdomains disabled, no production version change, then run authenticated `/api/staging/verify`. Do not record 10/10 remote regression unless a real run is successfully logged on the current version. A 404 fix for this isolated verification does not override release-gate requirements.

No production Worker deployment is authorized by this change.
