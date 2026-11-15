# JARVIS v4 — mobile browser smoke test

The \`mobile-smoke.yml\` workflow runs Chromium with an Android-like viewport (360–412 CSS px, touch, device scale 3) using a synthetic D1 fixture. It opens the actual built isolated staging Worker HTML served from a local ephemeral test HTTP origin.

Assertions: no uncaught browser JavaScript errors, no calls to external/live API origins, zero writes, disabled read-only controls, synthetic projects/tasks/memory display, history read, and no horizontal overflow.

This test **does not** prove that the application functions on the owner's physical Android device, nor that Cloudflare Access/authentication or the *remotely deployed* Worker is operating. Those checks remain release requirements. It does not access production D1, decrypt backup files, or touch billing.

The workflow can be triggered manually on GitHub Actions from an Android browser, without installing a desktop tool. GitHub Actions usage depends on the repository/account plan and any applicable limits.
