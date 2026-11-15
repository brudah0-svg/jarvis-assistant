# JARVIS v4 staging — PATCH guard correction

The current deployed isolated Worker `a43a3a07-4e54-4577-a775-3a11db96258e` denies a PATCH request with HTTP 405. The pinned backend runtime regression expects HTTP 404, yielding 9/10. Both codes mean the operation was blocked.

For the isolated staging Worker only, `scripts/build-v4-staging-next.mjs` reproduces the deployed source and adds an early method guard so that PATCH returns 404. Other non-GET API methods remain blocked. The exact candidate SHA-256 is `b024e3dfa5e02614a9b689b42f49ac7e93cc1ba73a6c9b21ce6994b320f8eaca`.

This is not a production candidate and does not authorize production deployment. Preserve the original source snapshot and deployment manifest for rollback. Verify Cloudflare version, bindings, workers.dev/private previews disabled and D1 integrity after deploying. Run the 10-check live regression through the existing private service-bound backend scheduler; a static Node test alone is not a live regression. Maintain the release gate closed while independent encrypted off-account backup, browser acceptance and provenance approvals remain outstanding.
