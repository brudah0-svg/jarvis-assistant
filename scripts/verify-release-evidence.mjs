// Pure evidence validator. Metadata only: no database access, API calls or deployments.
// Records must be obtained from independently verified trusted sources.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function verifyReleaseEvidence(evidence, now=Date.now()){
 const gaps=[];
 const check=(condition,reason)=>{if(!condition)gaps.push(reason)};
 const snapshot=evidence?.snapshot||{};
 const restore=evidence?.restore||{};
 const external=evidence?.external||{};
 const stage=evidence?.staging||{};
 const regression=evidence?.regression||{};
 const code=evidence?.code||{};
 const android=evidence?.android||{};
 const validId=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(id);
 const validDigest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
 check(validId(snapshot.id)&&snapshot.hash_verified===true&&Number.isInteger(snapshot.tables)&&snapshot.tables>0&&Number.isInteger(snapshot.rows)&&snapshot.rows>=0,'latest_snapshot_hash_or_metadata_unverified');
 check(restore.passed===true&&restore.snapshot_id===snapshot.id&&restore.production_modified===false,'latest_snapshot_isolated_restore_missing_or_mismatched');
 check(external.snapshot_id===snapshot.id&&external.aes_gcm_verified===true&&external.off_device_verified===true,'verified_encrypted_second_copy_not_confirmed');
 check(validId(stage.version_id)&&stage.isolated===true&&stage.database_separate===true,'current_staging_isolation_unverified');
 const age=Date.parse(String(regression.executed_at||''));
 check(regression.version_id===stage.version_id&&regression.tests_passed===10&&regression.tests_total===10&&regression.cleanup_passed===true&&Number.isFinite(age)&&age<=now&&now-age<=24*3600000,'current_staging_remote_10_of_10_missing_or_stale');
 check(validDigest(code.production_sha256)&&validDigest(code.staging_sha256)&&code.provenance_verified===true&&code.rollback_ready===true,'code_provenance_or_rollback_unverified');
 check(android.authenticated_physical_device_test===true,'authenticated_android_device_acceptance_missing');
 const reviewAllowed=gaps.length===0;
 return {
  status:reviewAllowed?'eligible_for_human_review':'blocked',
  review_allowed:reviewAllowed,
  reasons:gaps,
  production_deployment:false,
  production_release_approved:false,
  requires_human_approval:true
 };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const path=process.argv[2];
 if(!path){console.error('Usage: node scripts/verify-release-evidence.mjs <metadata-only-json>');process.exitCode=2}
 else {
  const evidence=JSON.parse(readFileSync(path,'utf8'));
  const verdict=verifyReleaseEvidence(evidence);
  console.log(JSON.stringify(verdict,null,2));
  if(!verdict.review_allowed)process.exitCode=1;
 }
}
