import assert from 'node:assert/strict';
import {verifyReleaseEvidence} from '../scripts/verify-release-evidence.mjs';

const now=Date.parse('2026-11-16T01:30:00Z');
const newId='4346ead5-0502-4ddb-b4ab-bd4115eb81a4';
const stageId='6c50ebad-cd5a-48af-b3e2-fbe8a2c66dcf';
const a='a'.repeat(64);
const complete={
 snapshot:{id:newId,tables:35,rows:96,hash_verified:true},
 restore:{snapshot_id:newId,passed:true,production_modified:false},
 external:{snapshot_id:newId,aes_gcm_verified:true,off_device_verified:true},
 staging:{version_id:stageId,isolated:true,database_separate:true},
 regression:{version_id:stageId,tests_passed:10,tests_total:10,cleanup_passed:true,executed_at:'2026-11-16T00:00:10Z'},
 code:{production_sha256:a,staging_sha256:a,provenance_verified:true,rollback_ready:true},
 android:{authenticated_physical_device_test:true}
};
function expectBlocked(change,reason){
 const v=verifyReleaseEvidence({...complete,...change},now);
 assert.equal(v.review_allowed,false);
 assert.equal(v.status,'blocked');
 assert(v.reasons.includes(reason),JSON.stringify(v.reasons));
 assert.equal(v.production_deployment,false);
 assert.equal(v.production_release_approved,false);
}
const eligible=verifyReleaseEvidence(complete,now);
assert.equal(eligible.review_allowed,true);
assert.equal(eligible.production_release_approved,false);
assert.equal(eligible.production_deployment,false);
assert.equal(eligible.requires_human_approval,true);
expectBlocked({restore:{snapshot_id:'old-snapshot',passed:true,production_modified:false}},'latest_snapshot_isolated_restore_missing_or_mismatched');
expectBlocked({restore:{snapshot_id:newId,passed:false,production_modified:false}},'latest_snapshot_isolated_restore_missing_or_mismatched');
expectBlocked({external:{snapshot_id:newId,aes_gcm_verified:true,off_device_verified:false}},'verified_encrypted_second_copy_not_confirmed');
expectBlocked({regression:{...complete.regression,version_id:'a43a3a07-4e54-4577-a775-3a11db96258e'}},'current_staging_remote_10_of_10_missing_or_stale');
expectBlocked({regression:{...complete.regression,executed_at:'2026-11-14T00:00:10Z'}},'current_staging_remote_10_of_10_missing_or_stale');
expectBlocked({android:{authenticated_physical_device_test:false}},'authenticated_android_device_acceptance_missing');
expectBlocked({code:{...complete.code,provenance_verified:false}},'code_provenance_or_rollback_unverified');
expectBlocked({snapshot:{...complete.snapshot,hash_verified:false}},'latest_snapshot_hash_or_metadata_unverified');
assert.equal(verifyReleaseEvidence(null,now).review_allowed,false);
console.log('Latest-snapshot release-evidence gates passed: old restore or old staging 10/10 cannot unlock review, off-device copy and physical Android acceptance enforced, human approval mandatory.');
