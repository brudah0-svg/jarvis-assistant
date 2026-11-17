import assert from 'node:assert/strict';
import {safePatch,extractPatch,hash,validateParserWithNode,verifyBehaviorChange,validatedDraftPR,TARGET} from '../scripts/autoimprove-runner.mjs';
import {trustClaims} from '../cloudflare/workers/jarvis-autoimprove-ai.mjs';
import {readFileSync} from 'node:fs';

const current=readFileSync(TARGET,'utf8');
// The same guard must validate both the baseline and the approved AI patch.
// Reconstruct the original in-memory for repeatable differential checks; never write files.
const oldASR=String.raw`mi\s*cr[eè]?\s*(?:è|e)?\s*`;
const improvedASR=String.raw`mi\s*cr[eè]?\s*(?:è|e|é)?\s*`;
const patched=current.includes(improvedASR);
assert.equal(current.includes(oldASR),!patched,'Exactly one supported ASR version must be present');
const original=patched?current.replace(improvedASR,oldASR):current;
assert.equal(validateParserWithNode(current),true,'Actual checked-out source must be valid JavaScript');
if(patched)assert.equal(verifyBehaviorChange(original,current).regressions_checked,10,'Committed AI fix must improve the target utterance');

const anchor=' const noisyPrefix=input.match(';
const start=original.indexOf(anchor),end=original.indexOf(' if(noisyPrefix){',start);
assert(start>0&&end>start,'Allowed region in real UI');
const section=original.slice(start,end);
assert(section.includes('const noisyPrefix=input.match('));
const find=String.raw`micr\s*(?:è|e)?\s*`;
assert(section.includes(find),'An atomic ASR expression must be available');
const valid=String.raw`micr\s*(?:è|e)?\s{0,3}`;
assert.notEqual(valid,find);
const candidate=safePatch(original,{find,replace:valid,reason:'Normalize short ASR fragments'});
assert(candidate.changed&&candidate.source!==original);
assert.equal(candidate.original_sha256,hash(original));
assert.equal(validateParserWithNode(candidate.source),true);

const supported=String.raw`mi\s*cr[eè]?\s*(?:è|e|é)?\s*`;
const edgeFind=String.raw`mi\s*cr[eè]?\s*(?:è|e)?\s*`;
const fix=safePatch(original,{find:edgeFind,replace:supported,reason:'Support alternative acute accent in first ASR branch'});
const chosen=extractPatch(JSON.stringify({operation_id:'asr-acute-accent-v1',reason:'Handle micr é ASR'}));
assert.equal(chosen.catalogue_id,'asr-acute-accent-v1');
assert.equal(chosen.find,edgeFind);
assert.equal(chosen.replace,supported);
assert.equal(verifyBehaviorChange(original,safePatch(original,chosen).source).regressions_checked,10);
assert.throws(()=>extractPatch(JSON.stringify({operation_id:'dangerous-command',reason:'try'})),/Unknown improvement operation/);
assert.throws(()=>extractPatch(JSON.stringify({operation_id:'asr-acute-accent-v1',reason:1})),/Invalid proposal fields/);

assert.equal(validateParserWithNode(fix.source),true);
assert.equal(verifyBehaviorChange(original,fix.source).regressions_checked,10,'Only approved ASR improvement may pass');
assert.throws(()=>verifyBehaviorChange(original,candidate.source),/does not improve the target ASR edge case/,'Cosmetic regex changes must not be proposed as improvements');

assert.equal(original.includes(valid),false);
assert.deepEqual(safePatch(original,{find,replace:find,reason:'nothing'}),{changed:false,reason:'No change'});
assert.throws(()=>safePatch(original,{find,replace:'fetch("https://evil")',reason:'malicious'}),/Forbidden/);
assert.throws(()=>safePatch(original,{find:'fake-pattern',replace:'another',reason:'not found'}),/does not match/);
assert.throws(()=>safePatch(original,{find:find.repeat(20),replace:valid,reason:'oversized'}),/Patch size/);
assert.throws(()=>safePatch(original,{find:section.slice(0,48),replace:'  changed=input.match(/^(?:',reason:'boundary shift'}),/ASR regex boundary changed/);
assert.throws(()=>safePatch(original,{find,replace:valid+'\nalert(1)',reason:'malicious newline'}),/Patch must not add lines/);
assert.throws(()=>extractPatch('not JSON'),/Unexpected token|JSON/);
assert.equal(extractPatch('```json\n{"find":"","replace":"","reason":"none"}\n```').reason,'none');
const claims={iss:'https://token.actions.githubusercontent.com',aud:'jarvis-autoimprove-v1',repository:'brudah0-svg/jarvis-assistant',repository_id:'1434871186',workflow_ref:'brudah0-svg/jarvis-assistant/.github/workflows/autoimprove.yml@refs/heads/main',runner_environment:'github-hosted',ref:'refs/heads/main',event_name:'workflow_dispatch',run_id:'1234567',iat:1770000000,exp:1770000600};
const branch='jarvis/autoimprove-43862231083';
const verified={url:'https://github.com/brudah0-svg/jarvis-assistant/pull/100',isDraft:true,state:'OPEN',headRefName:branch,baseRefName:'main'};
assert.equal(validatedDraftPR(verified,branch),verified.url,'Verified open draft PR requires all expected fields');
for(const patch of [{isDraft:false},{state:'CLOSED'},{headRefName:'attacker'}, {baseRefName:'production'},{url:'https://example.com/pr/100'},{url:'https://github.com/brudah0-svg/jarvis-assistant/pull/0'}]){
 assert.equal(validatedDraftPR({...verified,...patch},branch),null,'Untrusted PR evidence must fail closed');
}
assert.equal(trustClaims(claims,1770000100),true);
assert.equal(trustClaims({...claims,event_name:'push'},1770000100),true,'Only signed main-branch push may start the on-merge live cycle');
assert.equal(trustClaims({...claims,event_name:'pull_request'},1770000100),false,'Untrusted PR build cannot request AI writes');
for(const [key,bad] of [['repository','attacker/fork'],['repository_id','1'],['workflow_ref','evil'],['runner_environment','self-hosted'],['ref','refs/heads/feature'],['event_name','pull_request'],['aud','other']]){
 assert.equal(trustClaims({...claims,[key]:bad},1770000100),false,key+' should fail closed');
}
assert.equal(trustClaims(claims,1770001000),false,'Expired token rejected');
assert.equal(trustClaims(claims,1769999800),false,'Future-issued token rejected');
console.log('JARVIS AutoImprove contracts PASS: isolated parser patch, fail-closed OIDC, syntax and no external writes.');
