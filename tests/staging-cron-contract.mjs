import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync('cloudflare/workers/jarvis-backend.mjs','utf8');
const manifest=JSON.parse(readFileSync('cloudflare/STAGING_V4_DEPLOYMENT.json','utf8'));
const old=JSON.parse(readFileSync('cloudflare/STAGING_V4_DEPLOYMENT_UI_PREV.json','utf8'));

// This checks production source scheduling semantics only. It is NOT a remote runtime run.
assert.match(main,/async scheduled\(controller,env,ctx\)/,'Production scheduler handler absent');
assert.match(main,/getUTCHours\(\)===0/,'Full staging regression must only run at midnight UTC');
assert.match(main,/await jarvisDailyStagingRegression\(env\)/);
assert.match(main,/await jarvisAutomaticStagingCheck\(env\)/);
assert.match(main,/INSERT INTO staging_regression_runs/,'Runtime regression evidence must be persisted in D1');
assert.match(main,/cleanupPass&&passed===10&&checks.length===10/,'Regressions must be exactly 10/10 and clean');
assert.match(main,/latest\.staging_version_id===stagingVersion/,'Monitor must reject old-version runtime results');
assert.match(main,/age<=24/,'Monitor must reject stale evidence');
assert.equal(manifest.security.production_database_binding,false);
assert.equal(manifest.security.ai_binding,false);
assert.equal(manifest.security.workers_dev,false);
assert.equal(manifest.security.previews_enabled,false);
assert.notEqual(manifest.version_id,old.version_id,'Current staging must not reuse a rollback evidence ID');
assert.match(manifest.source_sha256,/^[a-f0-9]{64}$/);
console.log('Staging cron contract: midnight UTC automatic remote regression, same-version 10/10+cleanup requirement, 24h freshness and isolated source manifest verified in code. This does NOT execute a remote regression.');
