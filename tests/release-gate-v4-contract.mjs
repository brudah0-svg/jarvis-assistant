import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../cloudflare/workers/jarvis-backend.mjs';

// These tests exercise the real release gate using synthetic, in-memory
// database and service-binding responses. They cannot deploy production.
const prodVersion='89f66668-175c-41ce-926c-b45aceef1f06';
const stagingVersion=JSON.parse(readFileSync('cloudflare/STAGING_V4_DEPLOYMENT.json','utf8')).version_id;
assert.match(stagingVersion,/^[0-9a-f-]{36}$/,'Release gate must test current pinned staging version');
const historicalStagingVersion='f126a794-698e-454f-ae63-3185a91632d2';
const goodHash='a'.repeat(64);
const fresh=()=>new Date().toISOString().replace('T',' ').replace('Z','');
const healthyStaging=()=>({
 environment:'staging',ok:true,staging_version_id:stagingVersion,
 isolated_database:{projects:1,tasks:1},
 push_secret_available:false,ai_binding_available:false
});
const priorRegression=()=>({
 id:'synthetic-regression',status:'passed',tests_passed:10,tests_total:10,
 cleanup_passed:1,staging_version_id:historicalStagingVersion,created_at:fresh()
});
const goodRegression=()=>({...priorRegression(),staging_version_id:stagingVersion});
const goodRecovery=()=>({
 production_integrity:'ok',staging_integrity:'ok',
 independent_backup_verified:1,isolated_restore_drill:1,created_at:fresh()
});
const goodDrill=()=>({status:'passed',production_modified:0,created_at:fresh()});
const goodManifest=()=>({
 production_version_id:prodVersion,staging_version_id:stagingVersion,
 production_core_sha256:goodHash,staging_core_sha256:goodHash,
 staging_guard_sha256:goodHash,status:'review'
});
function environment({
 stage=healthyStaging(),regression=priorRegression(),recovery=null,
 drill=goodDrill(),manifest=null,stageHttpStatus=200,dbError=false
}={}){
 const db={prepare(sql){
  if(dbError)throw Error('Synthetic D1 failure');
  const prepared={
   bind(){return this},
   async first(){
    if(sql.includes('FROM staging_regression_runs'))return regression;
    if(sql.includes('FROM rollback_drill_results'))return drill;
    if(sql.includes('FROM recovery_preflight_audit'))return recovery;
    if(sql.includes('FROM release_candidate_manifests'))return manifest;
    throw Error('Unexpected SQL: '+sql);
   }
  };
  return prepared;
 }};
 const service={fetch:async()=>Response.json(stage,{status:stageHttpStatus})};
 return {DB:db,STAGING_SERVICE:service,VERSION:{id:prodVersion}};
}
async function gate(env){
 const r=await worker.fetch(new Request('https://jarvis.example/api/staging/release-gate'),env,{waitUntil:()=>{}});
 const body=await r.json();return {status:r.status,body};
}
let result=await gate(environment());
assert.equal(result.status,200);
assert.equal(result.body.status,'blocked');
assert.equal(result.body.review_allowed,false);
assert.equal(result.body.production_deployment,false);
assert(result.body.reasons.some(x=>x.includes('diversa da quella testata')),'Old 10/10 test MUST be invalidated after staging update');
assert(result.body.reasons.some(x=>x.includes('Backup indipendente')),'No external backup MUST block release');
assert(result.body.reasons.some(x=>x.includes('Versione non collegata')),'Missing source manifest MUST block release');
assert.equal(result.body.staging_version_id,stagingVersion);
assert.equal(result.body.tested_version_id,historicalStagingVersion);

result=await gate(environment({regression:goodRegression(),recovery:goodRecovery(),manifest:null}));
assert.equal(result.body.review_allowed,false,'Same-version regression alone does not authorize release');
assert.equal(result.body.source_parity_provenance_verified,false);

result=await gate(environment({regression:goodRegression(),recovery:null,manifest:goodManifest()}));
assert.equal(result.body.review_allowed,false,'Missing independent backup MUST still block a valid provenance manifest');

result=await gate(environment({regression:goodRegression(),recovery:goodRecovery(),manifest:goodManifest()}));
assert.equal(result.body.review_allowed,true,'A fully synthetic approved evidence bundle may be reviewed');
assert.equal(result.body.status,'eligible_for_review');
assert.equal(result.body.production_deployment,false,'Eligibility NEVER performs deployment');
assert.equal(result.body.production_release_approved,false,'Human still needs to approve release');
assert.equal(result.body.requires_human_approval,true);

result=await gate(environment({stage:{...healthyStaging(),ok:false},regression:goodRegression(),recovery:goodRecovery(),manifest:goodManifest()}));
assert.equal(result.body.review_allowed,false,'Unhealthy staging must block');

result=await gate(environment({regression:{...goodRegression(),tests_passed:9},recovery:goodRecovery(),manifest:goodManifest()}));
assert.equal(result.body.review_allowed,false,'9/10 regression must block');

result=await gate(environment({regression:{...goodRegression(),cleanup_passed:0},recovery:goodRecovery(),manifest:goodManifest()}));
assert.equal(result.body.review_allowed,false,'Fixture cleanup failure must block');

result=await gate(environment({regression:{...goodRegression(),created_at:'2020-01-01 00:00:00'},recovery:goodRecovery(),manifest:goodManifest()}));
assert.equal(result.body.review_allowed,false,'Expired regression must block');

result=await gate(environment({regression:goodRegression(),recovery:goodRecovery(),manifest:goodManifest(),stageHttpStatus:503}));
assert.equal(result.body.review_allowed,false,'Staging HTTP 503 must block');

result=await gate(environment({dbError:true}));
assert.equal(result.status,503);
assert.equal(result.body.review_allowed,false);

result=await gate({DB:null,STAGING_SERVICE:null});
assert.equal(result.status,503,'Missing backend dependencies must not expose release permission');

console.log('Release Gate v4 passed: old staging results rejected, backup and provenance enforced, no automatic production deploy.');
