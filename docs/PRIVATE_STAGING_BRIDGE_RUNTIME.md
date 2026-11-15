# Private JARVIS staging bridge — two-Worker integration test

The earlier isolated endpoint contract tested the staging Worker and source references, but did not invoke the production Worker's actual `/api/staging/verify` request handler.

This addition invokes both **real pinned Worker implementations** in Node using synthetic in-memory D1 fixtures and an emulated `STAGING_SERVICE` binding. It checks HTTP 200 and the complete successful private verification payload. It also ensures the route **fails closed** for a missing service binding, an unexpected blocked POST status, or an indistinguishable production/staging database.

The test does not call any Cloudflare hostname, perform real database writes, bypass Cloudflare Access or claim authenticated physical Android coverage. It does not count as a new 10/10 remote regression. Run it with `npm run test:private-staging-bridge`.
