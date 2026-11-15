# JARVIS operational core — durable website jobs + Android tap-to-talk

Date: 2026-11-15. Release made on the existing Cloudflare Access-protected Worker, preserving the legacy paths and all seven bindings.

## Release 1: persistent website jobs
- PR #49 merged, all 4 suites passed: source safety, approval truth, Website Builder Worker contract and Chromium Android-like browser acceptance.
- Additive D1 `site_jobs` table and index. No existing data modified or deleted. SQL `PRAGMA quick_check = ok`; project count 2, task count 20, draft count 0, new jobs count 0 at verification.
- Authenticated APIs: `GET/POST /api/site-jobs`, `GET /api/site-jobs/:uuid`, `POST /api/site-jobs/:uuid/run`. A job persists through browser reload. A user explicitly starts a job; it runs AI generation, renders static HTML and stores a draft using a stable ID. Status can be queued, running, completed or failed, with up to three attempts and an execution lease to avoid simultaneous duplicate work. The result opens as a private iframe preview and can be downloaded.
- The backend contains no public publishing, external code execution, money-spending or scheduler. Running requires an interactive authenticated request; it is **not** a background autonomous multi-agent workforce.
- Worker deployed for job support as `4b344963-6ff7-4162-8b55-77784e6eed40`, deployed code SHA-256 `ea8113946bdbdc6aa4b88f6cf671b24c95423a16dbc8a5508e446c9e926529b8` matched CI build exactly. Previous Worker `4cd57d3f-38ac-459e-8c81-a1c4b737dcc6` was retained for rollback.

## Release 2: Android spoken request/reply
- PR #50 merged after synthetic Chromium Android mobile test of a recognized Italian speech request, submission to existing authenticated AI chat and spoken server reply. The user may switch voice output on and off, and Website Builder announces generation completion.
- Browser recognition uses the Android browser's Web Speech API; voice playback uses speechSynthesis. Microphone is user-initiated, rather than always listening.
- Deployed as code-only **UI update** to the same Worker. Active Worker version `32cb1cc1-35d9-4478-9867-14851ea6d41d`; read-back SHA-256 `e48b36cc889184532578e5d78771061e8f6fbe3da7cd3ef310850d81d2b9e51a` matches the planned exact candidate.
- All existing API routes, Cloudflare Access policies, seven bindings and private staging remained intact; quick check ok and project/task/website job/draft counts unchanged.

## Truthful current capabilities

The user can use one protected JARVIS Cloud interface to enter a site brief, use supported Android dictation, generate and save private static single-page sites with existing Workers AI, queue a website job, explicitly start and retry it, recover the result later, preview and download the HTML, and hear some responses via browser speech.

**Not delivered / not yet demonstrated:** 'Hey JARVIS' at screen-off, always-on listening, fully autonomous multi-agent site/app development, public publication of the generated site, reliable actual Workers AI generation with a physical Android session for these latest updates, multiple specialist agents that research, code and test, and supervised autonomous self-upgrades. Chromium uses simulated D1 and AI.

The existing independent off-device encrypted backup verification predates `site_drafts` and `site_jobs`; updated full-backup and restore verification remains a separate recovery task. Do not label the full JARVIS project complete or imply asynchronous development continuing after the conversation.
