# JARVIS — conversational website command release (2026-11-15)

## Release summary
- Changes: PR #52 and #53, merged to `main`; chat and tap-to-talk commands now enqueue and immediately run a recoverable website job, display an isolated inline HTML preview, list job statuses and reopen the most recent completed private website.
- GitHub source commit: `8ccb7d2157f30818028134376b60de4365d90b6b`
- Cloudflare Worker: `jarvis-backend`, Access-protected `/jarvis-unified`
- New active version: `fbfac9d9-15da-48e8-88aa-229ea643d7b3` (version number 107)
- Deployment: `ee82f052-d692-4b0a-9a38-88e5874f4c7d`, serving version 107 at 100%
- Deployed full module source SHA-256: `d2870ca1263676149bf78b0f604263217a90494f8bf4d97e1dae6006c5ea4f8c` (verified by Cloudflare readback)
- Frontend HTML SHA-256: `436b97c7f05f7fb9de55393947080b91111c86608f23b7687f938b39fa307807`, matches GitHub source and live route embedded HTML

## Rollback
- Previous 100% deployed version: `32cb1cc1-35d9-4478-9867-14851ea6d41d`
- Previous complete source SHA-256: `e48b36cc889184532578e5d78771061e8f6fbe3da7cd3ef310850d81d2b9e51a`
- Previous deployment: `47046b1b-0bf8-4b08-a9cd-7381a713db4a`
- Rollback means a new Worker deployment assigning **100%** traffic to the previous version. Do not overwrite or drop database records. A code rollback does not restore D1 data.

## Safety and verification
- Only the existing `/jarvis-unified` HTML response was replaced, retaining the previously deployed backend source, all routes and method handlers.
- No schema migrations, public website publishing, or new permissions. Seven bindings verified intact on uploaded version and post-deployment: `AI`, `DB`, `BACKUP_SERVICE`, `STAGING_SERVICE`, `VAPID_PRIVATE_JWK`, `VAPID_PUBLIC_KEY`, `VERSION`.
- Compatibility date retained: `2026-11-13`; Cloudflare Access policy unchanged.
- GitHub CI passed **4/4** on each of PR #52 and #53 (source safety, approval truth, website builder and synthetic Chromium Android workflow).
- Post-deploy Cloudflare source readback matches expected SHA; deployment metadata confirms 100% new version.
- D1 read-only `PRAGMA quick_check` returned `ok`. Read-only counts at verification: `projects=2`, `tasks=20`, `site_jobs=0`, `site_drafts=1`. No data was modified by the release verification.

## Limitations
- Real Android microphone / voice playback on the user's physical device, authenticated live AI site output, and end-to-end real interaction still need manual acceptance. Synthetic mobile tests alone are not proof of these.
- Microphone is tap-to-talk, **not** Android screen-off wake-word.
- Multi-agent autonomous app construction, self-editing and automatic public website deployment remain out of scope.
- Rollback should be considered on post-release regression; approvals remain mandatory for new high-impact writes or external publication.
