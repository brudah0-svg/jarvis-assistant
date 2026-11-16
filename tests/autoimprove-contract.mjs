import assert from 'node:assert/strict';
import {safePatch,extractPatch,hash,validateParserWithNode,TARGET} from '../scripts/autoimprove-runner.mjs';
import {trustClaims} from '../cloudflare/workers/jarvis-autoimprove-ai.mjs';
import {readFileSync} from 'node:fs';

const original=readFileSync(TARGET,'utf8');
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
assert.equal(original.includes(valid),false);
assert.deepEqual(safePatch(original,{find,replace:find,reason:'nothing'}),{changed:false,reason:'No change'});
assert.throws(()=>safePatch(original,{find,replace:'fetch("https://evil")',reason:'malicious'}),/Forbidden/);
assert.throws(()=>safePatch(original,{find:'fake-pattern',replace:'another',reason:'not found'}),/does not match/);
assert.throws(()=>safePatch(original,{find:find.repeat(20),replace:valid,reason:'oversized'}),/Patch size/);
assert.throws(()=>safePatch(original,{find,replace:'const noisyPrefix=input.match(',reason:'boundary shift'}),/ASR regex boundary changed|does not match|Only ASR/);
assert.throws(()=>safePatch(original,{find,replace:valid+'\nalert(1)',reason:'malicious newline'}),/Patch must not add lines/);
assert.throws(()=>extractPatch('not JSON'),/Unexpected token|JSON/);
assert.equal(extractPatch('```json\n{"find":"","replace":"","reason":"none"}\n```').reason,'none');
const claims={iss:'https://token.actions.githubusercontent.com',aud:'jarvis-autoimprove-v1',repository:'brudah0-svg/jarvis-assistant',repository_id:'1434871186',workflow_ref:'brudah0-svg/jarvis-assistant/.github/workflows/autoimprove.yml@refs/heads/main',runner_environment:'github-hosted',ref:'refs/heads/main',event_name:'workflow_dispatch',run_id:'1234567',iat:1770000000,exp:1770000600};
assert.equal(trustClaims(claims,1770000100),true);
for(const [key,bad] of [['repository','attacker/fork'],['repository_id','1'],['workflow_ref','evil'],['runner_environment','self-hosted'],['ref','refs/heads/feature'],['event_name','pull_request'],['aud','other']]){
 assert.equal(trustClaims({...claims,[key]:bad},1770000100),false,key+' should fail closed');
}
assert.equal(trustClaims(claims,1770001000),false,'Expired token rejected');
assert.equal(trustClaims(claims,1769999800),false,'Future-issued token rejected');
console.log('JARVIS AutoImprove contracts PASS: isolated parser patch, fail-closed OIDC, syntax and no external writes.');
