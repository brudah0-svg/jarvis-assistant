# JARVIS v109 — conversation-first and turn-based voice dialogue

Date: 2026-11-15. Deployment confirmed at 20:27:05 UTC.

## Production evidence
- Worker: `jarvis-backend`, Cloudflare Access-protected `/jarvis-unified`.
- Deployed version 109, UUID `7cd6332e-646c-48f0-9768-22659adc1cb6`, serving 100% traffic.
- Deployment UUID `99f25fba-439b-4966-a0b9-588e20b35e49`.
- GitHub changes: PR #58, squash merge commit `80a6b62a19512bbae58e8462575b93c3d00cda0b`.
- Read-back deployed JavaScript SHA-256: `5f1cf1570d143fdc72da847f540c13d89a90eeb096e611e1e6c75786f109bf6a` (matched planned upload).
- Read-back embedded app HTML SHA-256: `951585dd4456cb2813a8ee781766932c3cc30f7155ccfa3321328aae3923a762`.
- Seven existing bindings unchanged: AI, BACKUP_SERVICE, DB, STAGING_SERVICE, VAPID_PRIVATE_JWK, VAPID_PUBLIC_KEY, VERSION. Compatibility date unchanged.
- Existing routes for site creation, job recovery, private ZIP export, planning and AI chat remain present.

## User-facing behavior
- Chat is visually first, before secondary dashboard tools.
- "Avvia dialogo" starts a user-initiated Web Speech API session using Italian recognition, voices a response and attempts to restart recognition after TTS completion. "Termina dialogo" stops; visibility change to background stops for safety.
- Single-tap dictation and manual text chat remain available.
- Workers AI receives up to eight recent bounded chat turns, while its answer remains explicitly read-only unless an independent application route verifies an action.
- Manual Website Builder still exists; conversational website commands must go to the main chat.
- Four GitHub checks passed, including synthetic Android Chromium scenario with two recognized utterances, voice website creation, recovery and stopping.

## DB integrity and rollback
- Post-deployment `PRAGMA quick_check` returned `ok`; `PRAGMA foreign_key_check` returned zero violations.
- Read-only counts at this verification: 2 projects, 20 tasks, 2 site drafts, 0 site jobs, 0 multi-page projects. No database migration was performed for v109.
- Prior v108: UUID `74bd0f94-87f8-44a4-8575-1473c3f8ce5b`, previous deployment `a75505e7-76bb-4898-b7f5-01d8e24455a7`. Rollback requires a new 100%-traffic Cloudflare Worker deployment to that version, without altering D1.

## Limitations
- Synthetic Web Speech tests are not proof of functionality in physical Android Chrome/Redmi. Browser microphone permissions, audio service and background restrictions may prevent automatic resumption after a response.
- Audio is turn-based, not full duplex / barge-in. No guaranteed screen-off wake-word, always-on hotword service, or system integration. These require a dedicated Android application/service and platform-specific permission handling.
- This release does not add arbitrary autonomous app development or auto publishing.
- The latest full D1 encrypted/off-device backup state was not reverified as part of this UI/AI context update.
