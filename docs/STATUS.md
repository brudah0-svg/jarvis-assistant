# JARVIS — verified status (2026-11-15)

## Source snapshots

| Worker | Cloudflare deployment version when exported | Repository path |
| --- | --- | --- |
| Production `jarvis-backend` | `89f66668-175c-41ce-926c-b45aceef1f06` | `cloudflare/workers/jarvis-backend.mjs` |
| Isolated `jarvis-staging` | `4ffb369b-3d07-4ed6-b6ca-28d38b4d37f5` | `cloudflare/workers/jarvis-staging.mjs` |
| Private `jarvis-backup-export` | `9b917b6f-0f90-4258-b17e-45b70da58fed` | `cloudflare/workers/jarvis-backup-export.mjs` |

## Staging v4 deployment (2026-11-15)

- **Current private staging Worker deployment:** `a43a3a07-4e54-4577-a775-3a11db96258e`.
- **Previous recoverable staging Worker version:** `4ffb369b-3d07-4ed6-b6ca-28d38b4d37f5` (the source snapshot pinned above).
- **Build inputs:** `scripts/build-v4-staging.mjs` and pinned `cloudflare/ui/command-v4-staging-snapshot.html`. The existing staging source snapshot is kept immutable so the build reproduces the candidate safely.
- **Deployed candidate:** 326,882 characters; guarded `/command-v4` view, synthetic memory/proposal reads, regression fixture routes retained. No live Workers AI binding.
- **Cloudflare verification:** staging `workers.dev` and preview URL both disabled; only staging D1 `DB` and `VERSION` bindings present; staging D1 quick check is `ok` and 1 project/1 task fixtures unchanged.
- **GitHub CI:** v4 staging synthetic contract passed for UI, read-only APIs, blocked writes and absent privileged endpoints. This is **not** a remote HTTP/browser test of the running staging Worker.
- **Still missing:** authenticated Android browser smoke test, current-version 10/10 staging regression and exact code parity/provenance review. The Release Gate must stay blocked until those tests are complete. **No production rollout approved or performed.**

## Confirmed in Cloudflare

- Production has an AI binding, production D1 `DB`, `STAGING_SERVICE`, `BACKUP_SERVICE`, VAPID secrets, and `VERSION`.
- Staging has a separate D1 `DB` and `VERSION` binding. Its workers.dev subdomain is disabled.
- Private backup/export service has its own `BACKUP_DB` D1 binding. Its workers.dev subdomain is disabled.
- The production D1 database was previously checked with `PRAGMA quick_check = ok`; 2 projects, 20 tasks.
- A full D1 snapshot was previously verified, with 33 tables and 87 records; a recovery drill reconstituted 33/33 tables and 87/87 records in an isolated database.
- A staging regression of 10/10 passed for a previous staging version. **It must be rerun for any new staging version before release.**
- Backup and autonomy scheduled jobs are configured for every six hours.

## Cloud v4 chat hardening (2026-11-15)

- GitHub PR #13 merged after passing GitHub Actions source safety tests.
- The v4 source now loads up to the backend's last 60 chat-history records on opening, rendering role-filtered text without raw HTML.
- A revision guard protects new unsent/live conversation content from a late history response, and simultaneous chat submissions are blocked.
- User messages are persisted before AI inference; if user-message persistence fails, inference is suspended and the input is restored. A failed AI request cannot remove the already saved user message.
- The integration is **source code only**, not the deployed production Worker nor an end-to-end browser or remote integration verification.
- The staging snapshot remains pinned to the previously deployed version; no silent staging or production update was performed.

## Cloudflare live audit and regression remediation (2026-11-15)

- Confirmed exact SHA-256 parity against the Cloudflare API for deployed production `89f66668-175c-41ce-926c-b45aceef1f06` and staging `a43a3a07-4e54-4577-a775-3a11db96258e`.
- Staging D1 `PRAGMA quick_check` returned `ok`; the isolated fixture remains at 1 project and 1 task; `DB` bindings map to separate databases in production and staging.
- Observed actual scheduled staging regression result for **the current staging version**: `9/10 failed`. The failed check is `patch_block`; the staging v4 wrapper correctly rejects `PATCH` with HTTP 405, but the pinned production regression code expects HTTP 404.
- GitHub PR #14 fixed this mismatch **only in the generated v4 release candidate**, accepting both 404 and 405 as blocked PATCH responses. Original deployed Worker source and manifest remain unchanged. Isolated generated candidate tests passed. There has been **no Cloudflare redeployment**.
- Recent staging auto-check was `attention` (6/7), and production autonomous health check `attention` (6/9). The last independent off-account backup remains unverified. A fresh current-version regression remains required after any future backend deployment.
- **Release gate remains blocked.** Source parity, CI tests, and a historical passing 10/10 cannot substitute for a new runtime test, verified independent backup, current candidate provenance, Android acceptance and explicit production release approval.

## Isolated staging PATCH correction deployed and verified (2026-11-15)

- **Current staging version:** `9da6659c-9f2e-4d18-a1c1-66f602cc2861`. Original version `a43a3a07-4e54-4577-a775-3a11db96258e` is the rollback target.
- **Exact deployed code hash verified:** `b024e3dfa5e02614a9b689b42f49ac7e93cc1ba73a6c9b21ce6994b320f8eaca` with 326,963 JavaScript characters.
- Only the isolated staging Worker was updated. Production remains at `89f66668-175c-41ce-926c-b45aceef1f06`.
- Verified bindings: only isolated staging D1 `DB` and `VERSION`. `workers.dev` and public previews disabled; no Workers AI or VAPID binding. Staging D1 `PRAGMA quick_check = ok`, 1 synthetic project and 1 synthetic task.
- Static candidate CI was green prior to upload. The live 10/10 regression has **not** yet been observed on this new version; the prior 9/10 run remains historical.
- Release gate remains **blocked**, pending fresh live regression, independent encrypted off-account backup, Android acceptance, provenance manifest for the production candidate and explicit approval for production release.

## Latest Cloud v4 UI deployed to isolated staging (2026-11-15)

- **Current staging Worker:** `b27360b9-b467-4770-beeb-bf8f08629a6d`; previous rollback `9da6659c-9f2e-4d18-a1c1-66f602cc2861`.
- The staged UI now contains the current chat history hydration and user-first durable chat flow. All write controls are disabled in staging, with a synthetic empty history API response and no live AI binding.
- Independently verified the deployed source hash against GitHub candidate: `9b12762d54cb53ae883a1ee1d0525a454012c646c05af69be0b3f24883fe7c6a` (330,067 characters).
- Staging D1 integrity `ok`, one project and one task; only isolated D1 `DB` and `VERSION` bindings, public workers.dev and previews off. Production Worker unchanged.
- The remote current-version 10/10 regression, Android browser acceptance, independent external encrypted backup and formal release candidate verification remain **unverified**; keep release gate closed.

## Full synthetic 10-check staging regression (2026-11-15)

- GitHub PR #19 merged after GitHub Actions passed a new offline synthetic regression against the current pinned staging UI Worker source.
- **Result: 10/10 passed** locally, including fixture creation/read, forbidden POST and PATCH rejection, fixture cleanup and stable version. The synthetic D1 baseline was restored to 1 project/1 task.
- This is **not** a Cloudflare runtime regression and must not be entered into production D1 as such. Cloudflare's latest recorded runtime regression remains the historical failed 9/10 run for previous staging version `a43a3a07-4e54-4577-a775-3a11db96258e`.
- Current deployed staging is `b27360b9-b467-4770-beeb-bf8f08629a6d`, verified at SHA-256 `9b12762d54cb53ae883a1ee1d0525a454012c646c05af69be0b3f24883fe7c6a`. An authenticated remote regression on this exact version remains required.
- Production remains unchanged and the release gate is blocked pending remote verification, off-account encrypted backup, Android acceptance and approval.

## Android-like browser smoke validated (2026-11-15)

- GitHub PR #20 merged, adding isolated Chromium UI tests for Android-like 360/393/412 px widths, touch interaction support, synthetic dashboard reads, disabled write controls, no external API calls or horizontal overflow.
- The mobile browser GitHub Actions run passed, with a synthetic screenshot uploaded as a short-lived GitHub artifact.
- This test runs on CI, **not** on the user's physical Android device or a remote authenticated Cloudflare browser session.
- Cloudflare staging runtime 10/10, real authentication smoke, independent encrypted off-account backup, current release candidate provenance and explicit production release approval remain outstanding.
- ChatGPT monitoring was re-enabled for the existing 6-hour task; it does not automatically perform deployments or data changes.

## Read-only v4 staging UI hardened and deployed (2026-11-15)

- New isolated staging Worker version: `6c50ebad-cd5a-48af-b3e2-fbe8a2c66dcf`; rollback: `b27360b9-b467-4770-beeb-bf8f08629a6d`.
- Cloudflare source was read back and verified at SHA-256 `15e680cc19d5a19931f27bdd0e93857178175286a94f2e4412f639907464e22f` (330,480 characters), matching green mobile Chromium candidate tests.
- UI task completion controls disabled in staging after render, click handling guarded, production module links non-navigable.
- Staging public workers.dev and previews disabled; isolated D1 and VERSION bindings; D1 quick check = ok with one synthetic project and one task. Production unchanged at `89f66668-175c-41ce-926c-b45aceef1f06`.
- **Release gate remains blocked:** current-version 10/10 remote Cloudflare regression, independent encrypted off-account backup, authenticated physical Android acceptance and approval incomplete.

## Current-version release gate and scheduled regression checks (2026-11-15)

- GitHub PR #23 merged after successful GitHub Actions tests. The synthetic release-gate contract now reads its staging version from the current `cloudflare/STAGING_V4_DEPLOYMENT.json` rather than hardcoding a stale version.
- Additional source contract confirms production Worker cron logic: automatic checks every six hours, full remote staging regression only for the scheduled 00:00 UTC run, results recorded to D1, exactly 10/10 plus successful fixture cleanup, 24-hour freshness and exact version matching.
- Cloudflare cron configured as `0 */6 * * *`. The daily regression is **not** automatically run by the GitHub tests; current remote 10/10 evidence is not yet present.
- Production remains pinned; the release gate remains blocked until current-version remote runtime result, independent encrypted external backup, authenticated Android acceptance, provenance and human authorization.

## Latest backup read-back integrity audit (2026-11-15)

- Re-read the newest verified private backup snapshot through the Cloudflare D1 API in **read-only** mode; snapshot created at `2026-11-15 06:00:14 UTC`.
- Verified **35 tables, 96 stored rows** and valid JSON records. Recomputed the full SHA-256 schema and rows digests from the archived records; **both matched** the saved metadata.
- Verified stored row counts for **all 35 tables**, including **six empty tables** (zero-row tables must be counted as zero, not treated as missing).
- Neither snapshot contents nor credentials were put into this repository or displayed to the user. No D1 writes or restores were performed.
- The user independently demonstrated a local Android `.jarvisbak` decryption/integrity check with 35 tables and 96 records. This is evidence of a local off-Cloudflare copy, **not** of an additional off-device copy, nor of a full database restore drill on the latest snapshot.
- The newest snapshot's `restore_test_verified` flag remains **0**. Independent second copy off the phone and current-version remote 10/10 regression remain outstanding for release readiness.

## Standalone Android encrypted backup verifier (2026-11-15)

- GitHub PR #25 merged: added `backup-verify-offline.html` to the Pages root, a standalone verifier for encrypted `.jarvisbak` files without calling Cloudflare APIs.
- Browser verifies AES-256-GCM decryption using the user-supplied password, PBKDF2-SHA256 with 310,000 iterations, the plaintext SHA-256, both canonical schema/record SHA-256 digests, snapshot ID, JSON structure, table counts and row counts. Nothing is transmitted or restored; password input is cleared after verification.
- Static Content Security Policy blocks network requests and external assets. Browser CI passed on synthetic valid, wrong-password, altered ciphertext, mismatched row digest, altered plaintext digest and snapshot identity archives, with zero external requests in mobile-like Chromium. No real backups or secrets enter GitHub.
- Existing Android screenshot demonstrates a successfully decrypted local backup with 35 tables and 96 rows, but does **not** confirm a second independent off-device copy. The latest snapshot remains untested for full DB restore; external release-gate evidence is incomplete.
- Pages deployment of the verifier must also be independently confirmed before claiming the live URL is operational.
- Release gate remains blocked pending current staging remote 10/10, off-device backup confirmation, latest restore proof, authenticated Android release smoke, provenance and explicit authorization.

## Live GitHub Pages backup verifier independently checked (2026-11-15)

- GitHub PR #27 merged. GitHub Actions run `43707045092` completed successfully on `main`: `JARVIS live backup verifier publication`.
- The hosted backup verifier returned HTTP 200; the downloaded HTML SHA-256 matched `backup-verify-offline.html` from the approved main source byte for byte.
- The live page check also confirmed local-only Content Security Policy, encrypted backup format marker, and absence of upload network APIs. No real archive or password was transmitted.
- A `main` push trigger was added because the GitHub-managed Pages workflow had not emitted the previous expected workflow-run trigger. The check retries publication with bounded delays and reports a failure instead of accepting a mismatch.
- This does not complete the latest backup's isolated restore, an additional off-device copy, physical Android acceptance, or the current staging version's remote 10/10 regression; production release remains **blocked**.

## Off-device encrypted backup — user confirmation (2026-11-15)

- The user explicitly confirms that a **second copy of the encrypted backup has been saved**, following the Android off-device backup instructions. This updates the previously missing *human confirmation of off-device storage*.
- A prior local Android verification showed a decryptable `.jarvisbak` with 35 tables and 96 records; the separate second copy has **not** been re-downloaded or independently decrypted/hashed here. Its exact byte identity, availability and storage-provider durability remain unverified. No backup, password, location, or secret has been uploaded to GitHub or transmitted to this assistant.
- Do not set `independent_backup_verified=1` on Cloudflare solely from this human report. Preserve the difference between user attestation and technical verification, and require the latest snapshot's **actual isolated restore drill** before the production gate can open.
- Current-version remote 10/10, physical authenticated Android acceptance, source provenance and explicit production approval remain independent requirements.

## Latest application snapshot — isolated SQL restore proven (2026-11-15)

- Completed real temporary Cloudflare D1 reconstruction of latest snapshot `2a1e5a8c-7a27-43d7-acd3-2411eddfbf02` (**35 application tables and 96 records**), not a synthetic restore.
- Recomputed archived schema/data SHA-256 digests, restored all tables and rows into an EU-jurisdiction temporary D1, and verified `PRAGMA quick_check = ok`, zero foreign-key violations, identical table lists and identical read-back row contents.
- Deleted temporary database and independently verified that the Cloudflare account returned to its original four databases. Production and staging deployments were unchanged.
- Full execution report: [LATEST_BACKUP_RESTORE_DRILL_2026-11-15.md](LATEST_BACKUP_RESTORE_DRILL_2026-11-15.md).
- **Important:** archived `restore_test_verified` metadata flag remains 0 because no production/backup audit flags were changed by this isolated test. The historical statements below about the flag describe the state before this new independent test.
- User confirmed a second saved encrypted backup copy outside the phone; exact byte parity of that separate copy is still unverified.
- Release still blocked pending fresh remote 10/10 on current staging, authenticated physical Android acceptance, review of release candidate provenance and explicit production approval.

## Isolated staging HTTP 502 verifier repair — deployed (2026-11-15)

- User observed HTTP 502 on authenticated `/api/staging/verify`. Diagnosis: production verifier expects 404 for an empty blocked POST `/api/tasks`; staging returned 400.
- GitHub PR #30 passed CI and merged. Deployed narrow isolated-staging-only source change returning 404 for that exact request without relaxing any write restrictions.
- Cloudflare staging version `80077801-2762-4ed3-8581-42b806032c4a`, source SHA-256 `b845663d63775b34d681bf7294287117b7915fa61f0b88722383e7d07c2b5f0a`, 330,634 characters — independently read back and verified.
- Staging bindings remain only isolated D1 and version metadata; public Worker subdomain/previews disabled; D1 `PRAGMA quick_check=ok` and 1 synthetic project/1 task. Production version unchanged at `89f66668-175c-41ce-926c-b45aceef1f06`.
- Previous staging `6c50ebad-cd5a-48af-b3e2-fbe8a2c66dcf` retained as rollback. Authenticated browser retest of `/api/staging/verify` has **not yet been witnessed**, nor a full current-version runtime 10/10 regression. Release remains blocked.

## Verified live private staging regression — 2026-11-15 12:51 UTC

- User supplied Android screenshots confirming authenticated private Worker-to-Worker verification passed with no changes, and the real staging API regression returned **10/10 with fixture cleanup complete**.
- Independently confirmed in production D1 `staging_regression_runs`: run `cda29b08-c813-42fb-8d45-1675407cdf48`, `status=passed`, `tests_passed=10`, `tests_total=10`, `cleanup_passed=1`, `staging_version_id=80077801-2762-4ed3-8581-42b806032c4a`, timestamp `2026-11-15 12:51:54 UTC`. All ten saved check records passed.
- Direct Cloudflare deployment lookup showed the **same** staging version still active and production unchanged at `89f66668-175c-41ce-926c-b45aceef1f06`. Isolated staging D1 `quick_check=ok`, 1 project, 1 task.
- The screenshots' Release Gate status was checked **before** the successful new regression, so it displayed historical 9/10 and no matching candidate. The latest matching 10/10 resolves that particular gating fact, **not** the separate release prerequisites or the old backup/provenance flags.
- Latest archived backup is now **35 tables, 101 rows**, snapshot `ce2ac51a-6d8e-47c0-8951-919031e15251`, created 2026-11-15 12:00:13 UTC. Read-only verification recomputed schema and row SHA-256 exactly and verified per-table counts, record JSON and snapshot consistency.
- The previously proven isolated SQL restoration concerned the earlier 35-table/**96-row** snapshot, not this new 101-row snapshot. The latest snapshot's `restore_test_verified` remains false. Earlier Android encrypted file verification also concerned 96 rows. Do **not** claim fresh off-device verification or restoration for 101 rows without actual proof.
- Release remains **blocked** until fresh candidate provenance and recovery evidence, physical Android functional acceptance and explicit human authorization. Do not change production merely to satisfy audit flags.

## Verified latest 101-record restore and release evidence (2026-11-15)

- The currently latest internal snapshot at verification time is `ce2ac51a-6d8e-47c0-8951-919031e15251` (**35 tables, 101 records**).
- A **real SQL-level isolated Cloudflare D1 restore** recreated 35/35 application tables and restored 101/101 rows. SHA-256s matched; `PRAGMA quick_check = ok`; foreign-key violations = 0; all row contents matched on read-back. Temporary EU database was deleted and its absence re-verified.
- Production unchanged; current production Worker SHA-256 `15f9b6ca957c2999208efd65ce5918e9579bc7d6006faf2035410d796acfee17`; staging SHA-256 `b845663d63775b34d681bf7294287117b7915fa61f0b88722383e7d07c2b5f0a`, both independently read back from deployed Cloudflare Worker versions.
- Real current-version staging regression `cda29b08-c813-42fb-8d45-1675407cdf48` passed **10/10** with successful cleanup.
- Evidence report: [LATEST_BACKUP_RESTORE_DRILL_101_2026-11-15.md](LATEST_BACKUP_RESTORE_DRILL_101_2026-11-15.md). Metadata-only machine-readable audit: `cloudflare/RELEASE_EVIDENCE_AUDIT_2026-11-15.json`.
- The old cloud audit flag `restore_test_verified=0` was deliberately not changed; the newly executed test is recorded here as an independent proof. Prior encrypted off-device Android copy was for the earlier 96-row snapshot, **not verified for the new 101-row snapshot**.
- Full functional authenticated Android app acceptance and explicit release approval remain necessary. Keep production release gate **blocked**; do not treat this audit as permission to publish.

## Unified one-origin JARVIS — synthetic Android browser acceptance (2026-11-15)

- PR #35 merged: built a **build-only**, version-pinned Cloudflare candidate `/jarvis-unified`, with dashboard, chat, memory, projects, tasks and same-origin advanced module links. The existing live production Worker was **not** updated.
- The candidate includes a user-consented additive import of `jarvis-local-data-v1` exported from old GitHub Pages. It leaves original Android localStorage in place, skips duplicate project/task/memory names and does not execute or migrate queued approvals.
- PR #36 merged after **successful GitHub Actions Chromium Android-like browser acceptance** run `43718783379`. The test exercised app load at mobile viewport widths 360/393/412, shared-origin modules and manifest, synthetic AI chat, cancellation without writes, confirmed migration, correct open-task counts, completed task preservation, deduplication upon second import, no transferred approvals, zero external network requests and zero unhandled JavaScript errors.
- Browser run used synthetic data and no Cloudflare Access login, real backups, production D1 writes or production Worker deployment. A synthetic screenshot is attached to that GitHub Actions run.
- **Not ready to mark released:** need physical authenticated Android acceptance for the unified Cloud route, verify the current 101-row encrypted off-device backup, complete security/release-candidate review, and obtain **explicit production deployment approval**. The build-only URL `/jarvis-unified` is not yet publicly routed on Cloudflare.
- Keep both existing GitHub Pages app and existing Cloudflare production routes available until the data migration has been verified by the user. Do not automatically redirect or delete the local app.

## Unified JARVIS protected additive release deployed (2026-11-15)

- User explicitly authorized this **additive, reversible** release. Cloudflare Worker `jarvis-backend` now serves `/jarvis-unified` and `/jarvis-app.webmanifest` from the same access-protected host as the existing AI/data APIs.
- Active Worker version `712920ae-5f79-4ac9-88f5-eaa15a871a66` read back and SHA-256 verified `a0a9784bd3bc1889173b09f5da9796094abc9a3f7cd6251cfe3d84e41573d3b4`, matching CI candidate; previous production version `89f66668-175c-41ce-926c-b45aceef1f06` retained as rollback.
- Preserved all seven Worker bindings including secrets, Cloudflare Access policy, legacy production routes, staging service, and independent backup service. Production D1 integrity ok, still 2 projects and 20 tasks. Staging version and synthetic database unchanged and intact.
- No data migration, localStorage deletion, approval execution, route redirection or user-data mutation. Existing GitHub Pages and `/jarvis` remain.
- Evidence: [UNIFIED_CLOUDFLARE_RELEASE_2026-11-15.md](UNIFIED_CLOUDFLARE_RELEASE_2026-11-15.md) and `cloudflare/UNIFIED_PROTECTED_DEPLOYMENT_2026-11-15.json`.
- **Next**: actual authenticated physical Android test of `/jarvis-unified`, check AI, navigation and install option. The current 101-row snapshot's independent external encrypted copy has not been verified; previous Android copy concerned 96 rows. Do not mark whole app complete until these remaining validations.

## Unified Android readability roll-forward — online (2026-11-15)

- User-provided physical Android video confirmed that authenticated Cloud interface, project/task/memory cards and AI chat render, but displayed squeezed desktop-mode columns and an AI statement potentially confusing a plan with a human approval. The video did not establish complete autonomous feature execution.
- GitHub PR #38: narrow-viewport responsive single-column CSS and improved text/tap targets passed mobile Chromium CI. PR #39: added visible clarification that AI suggestions are **not** human approvals, passing synthetic Android Chromium run `43721663998` and source safety run `43721664023`.
- Applied the **UI-only change** to the already user-authorized protected `/jarvis-unified` route. Cloudflare Worker now deployed as `e346679f-6295-441b-bf4e-1c6848891d97`; full JavaScript source re-read with SHA-256 `87a659e41fea55926aa8f165a8608df11523f4467479f52470196406557e6b57`, exact planned candidate. Old Worker `712920ae-5f79-4ac9-88f5-eaa15a871a66` retained for rollback.
- Cloudflare Access remains enabled, all seven bindings including secrets preserved, no data migration, no changes to original `/jarvis` route or GitHub Pages. Production D1 `quick_check=ok`, still 2 projects and 20 tasks; staging D1 intact, unchanged version and 1+1 synthetic fixtures.
- Source evidence: `cloudflare/UNIFIED_ANDROID_UI_ROLLFORWARD_2026-11-15.json`.
- **Limits**: actual Android post-fix screenshots not yet independently checked; AI chat generated text is not proof of plan approval/execution; no claim that all future agent autonomy features are complete. Verify those independently before certification.

## Verified approval-aware AI chat — production online (2026-11-15)

- PR #41 added server-side read-only lookup of pending action proposals, explicit no-execution and no-chat-approval response metadata, and a separate trusted client status. A failed approval-state lookup blocks inference. PR #42 added independent synthetic CI validation of the actual Worker route (run `43724337478`, passed).
- Deployed the tested code-only production candidate to `jarvis-backend` as version `a768f5bf-ab08-47dc-9876-03bddf9dc042`, SHA-256 `28c3520c93eb636d220ba4ffda76706c1d277aa3b087a467a355ddd080271bf8`. Cloudflare source was read back and verified after deployment.
- Previous version `e346679f-6295-441b-bf4e-1c6848891d97` retained. Cloudflare Access, all seven bindings, original and unified routes preserved.
- Production D1 remains intact (`quick_check=ok`, 2 projects, 20 tasks, 0 pending proposals); staging unchanged.
- This verifies an improved truthfulness boundary, **not** complete autonomous capability or a post-update physical Android functional test.
- See [UNIFIED_AI_CHAT_TRUTH_RELEASE_2026-11-15.md](UNIFIED_AI_CHAT_TRUTH_RELEASE_2026-11-15.md).

## Priority reset: build JARVIS core first (2026-11-15)

The owner's explicit development order is **(1) finish a useful operative JARVIS, (2) add self-diagnostics and autonomous improvements**. Do not spend further iterations on stylistic refinements or speculative self-upgrade infrastructure while key operational functionality is missing. Preserve the safety and recovery controls already present, but do not treat them as a substitute for features.

### First operational vertical slice: deployed

- PR #44 merged after successful Android-like Chromium acceptance, source safety and AI truth checks. The unified chat recognizes explicit Italian commands `Crea progetto: Nome`, `Aggiungi attività: Titolo` and `Pianifica: Obiettivo`.
- Creating a project or task requires a human confirmation dialog. Tasks require an unambiguous Cloud project selection. Duplicate titles are refused; a planning command uses the existing read-only `/api/plan` endpoint and never creates tasks.
- The Cloudflare Worker production version is now `0700f5dd-40c7-4cce-9f46-dffbd515f3db`. Its deployed JavaScript SHA-256 `1e4b200776716a8b14d64a0c91228ae738335bb9a5bba8738f5c4acc77cd5666` matched the verified UI-only candidate after read-back. Legacy and unified routes remain, Access policy and all seven bindings are unchanged, and production D1 `quick_check=ok` with 2 projects, 20 tasks and 0 pending proposals.
- No test-created projects or tasks were written to production; actual user-issued commands are still subject to user confirmation. Previous production version `a768f5bf-ab08-47dc-9876-03bddf9dc042` remains the rollback reference.
- The physical Android screen has not yet been used to demonstrate these **new** chat commands. CI uses synthetic data; do not equate passing CI with personal-device acceptance.

### Core capabilities to build next, in order

1. **Goal-to-project workflow:** turn a goal into a reviewable set of project tasks with a project-specific approval, save the resulting task plan and resume it later. Do not imply the existing generic rule-based planner is autonomous work execution.
2. **Agent job queue:** persistent jobs, distinct specialist roles, dependencies, retry/timeout limits, status and auditable outputs. Initially support one or two useful low-risk workflows before scaling to parallel orchestration.
3. **Useful tools:** vetted GitHub code workflows and read-only searches, then user-approved edits, real test results and rollback. Do not falsely claim tool execution from model text.
4. **Voice, notifications and reliable Android usage:** improve recognition and accessible results, keep all modules reachable from one protected origin.
5. **Only then** add self-audit, issue detection, sandboxed patch proposals, regression and limited reversible self-upgrade with permission rules and human approval for consequential changes.

Cost target: use existing free-tier services where practical, without claiming that future Cloudflare usage is guaranteed free.

## Not verified / outstanding

- First live executions of the new scheduled health/backup/staging cycles: last observed counters were zero.
- Off-account encrypted backup download and local re-verification on Android.
- End-to-end production parity, rollback of the current Worker, and production D1 restoration.
- CI results: source checks, encrypted backup, core v3 contracts, v4 static preview and v4 staging synthetic contracts have passed. Remote staging HTTP/browser integration remains unverified.
- GitHub and Cloudflare continuous deployment are **not** automatically connected.

## Release gate

The application intentionally blocks promotion when current provenance, regressions, or independent backup evidence is insufficient. A passed old regression is not a license to deploy. Human approval is required for production releases.
