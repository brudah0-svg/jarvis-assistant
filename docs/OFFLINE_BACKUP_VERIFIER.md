# JARVIS — verifica backup indipendente, senza Cloudflare

A root-level, self-contained backup verifier is available in GitHub Pages at:
\`/backup-verify-offline.html\`

This page reads the encrypted \`.jarvisbak\` selected by the user and uses Web Crypto in the browser to derive the PBKDF2-SHA256 key (310,000 iterations), decrypt AES-256-GCM, verify SHA-256 of the plaintext, and independently recompute SHA-256 of the snapshot schema and rows. It verifies counts, valid JSON rows, duplicate records, snapshot ID and verified metadata. No data is restored and no plaintext is uploaded or logged.

The CSP sets \`connect-src 'none'\`, \`default-src 'none'\`, and \`form-action 'none'\`; all CSS and JS are inline. Download a local copy of this HTML if verification must still work while GitHub Pages or Cloudflare is unavailable. The page can also be opened directly on GitHub Pages and uses no live Cloudflare APIs.

**Security boundary:** This static local check is independent of the Cloudflare account, but loading a web page from GitHub Pages requires trusting the code served at that time. For the most robust disconnected recovery, save an offline copy of this verifier, record its SHA-256 and store it separately from the encrypted archive. Do not put actual backup payloads or passwords in Git, actions logs, or chat.

**Not equivalent to:** complete database restoration; verified second off-device copy; fresh remote 10/10 regression; production release approval. These require separate evidence.
