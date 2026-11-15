# Live GitHub Pages verification — JARVIS backup tool

GitHub Actions runs a **read-only** publication smoke test after a successful `pages build and deployment` workflow, and can be triggered manually. It checks that the public independent backup verifier returns HTTP 200, has a safe HTML content type, and is **byte-identical (SHA-256)** to `backup-verify-offline.html` on the current main branch.

The check rejects a published page missing strict CSP restrictions or containing network upload APIs. It requires **no credentials or user backup** and does not decrypt, upload, modify or export personal records. The workflow is independent from the synthetic Android-like browser verification in `offline-backup-verifier.yml`.

A GitHub deployment success alone proves only that Pages published a build. This workflow is intended to verify what is actually served. A passing result does not verify a physical Android offline file, full D1 restore or remote Cloudflare staging 10/10 regression.

GitHub Actions usage remains subject to repository/account plan limits. No paid Cloudflare service is introduced.

The GitHub Actions job also runs on changes to the verifier or parity workflow pushed to `main`, because GitHub's managed Pages deployment may not emit the named `workflow_run` event consistently. The public check retries up to five times to allow for deployment propagation. A failure stays visible as a failed workflow rather than being presented as a verified deployment.
