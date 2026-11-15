# JARVIS unified chat — verified production update

Date: 2026-11-15.

## Change released

- Active Cloudflare production Worker: `jarvis-backend`, version `a768f5bf-ab08-47dc-9876-03bddf9dc042`.
- SHA-256 of actual deployed Worker source, independently read back: `28c3520c93eb636d220ba4ffda76706c1d277aa3b087a467a355ddd080271bf8`, matching the tested build-only candidate.
- Previous production Worker for rollback: `e346679f-6295-441b-bf4e-1c6848891d97` (SHA-256 `87a659e41fea55926aa8f165a8608df11523f4467479f52470196406557e6b57`).
- Changes: AI chat now reads the number of *pending* action proposals from D1 and adds read-only, non-execution metadata to responses. It explicitly warns the language model not to claim approvals/execution without evidence. The client displays the trusted metadata separately from the model response.
- A missing or failed pending-proposals D1 read fails closed with HTTP 503 rather than providing potentially misleading approval status.
- No chat response can approve a proposal through this endpoint or mutate project/task data. Chat history remains a separate existing API.
- GitHub CI confirmed synthetic Worker execution through `tests/unified-chat-truth.mjs` (Actions run `43724337478`), alongside mobile UI and source checks.

## Post-release verification

- Active source SHA-256 matched tested output, exact version confirmed after deploy.
- Existing `/jarvis` and unified `/jarvis-unified` routes still present.
- Responsive Android layout retained (`@media(max-width:980px)`).
- Cloudflare Access remains configured; all seven Worker bindings, including secrets, retained.
- Production D1 `PRAGMA quick_check=ok`; **2 projects, 20 tasks, 0 pending action proposals**.
- Staging Worker unchanged at `80077801-2762-4ed3-8581-42b806032c4a`.
- No D1 schema changes, data migration, approval changes, deletion, payment or production record updates.

## Remaining validation

- Independent post-release authenticated physical Android verification of newly updated chat has not yet been observed.
- This improvement guards against the AI *claiming* actions as facts but is not proof of full autonomous multi-agent execution.
- The latest 101-record backup's external encrypted file was not independently verified after snapshot rotation.
- Keep prior production version available for rollback, and treat actual approval records, not model prose, as authoritative.
