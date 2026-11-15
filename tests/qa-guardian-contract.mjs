import assert from 'node:assert/strict';
import {SUITES,redactLog,diagnoseFailure,markdownReport} from '../scripts/qa-guardian.mjs';

assert.deepEqual(Object.keys(SUITES).sort(),['android','contracts']);
assert.equal(SUITES.contracts.command,'npm');
assert.equal(SUITES.android.args[0],'tests/unified-browser-android.mjs');
for(const [name,s] of Object.entries(SUITES)){
  assert(s.timeoutMs<=10*60*1000,name+' must not hang indefinitely');
  assert(!s.args.join(' ').includes('deploy'),name+' must not deploy');
}

const dirty='Token ghp_12345678901234567890 and Bearer abcdef12345678901234567890123\n'+
  '-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----\nAssertionError: mismatch';
const clean=redactLog(dirty);
assert(!clean.includes('ghp_12345678901234567890'));
assert(!clean.includes('abcdef12345678901234567890123'));
assert(!clean.includes('-----BEGIN PRIVATE KEY-----'));
assert.match(clean,/AssertionError/);
assert.equal(diagnoseFailure('AssertionError: mismatch').category,'regression');
assert.equal(diagnoseFailure('Timeout 10000 ms exceeded').category,'timeout');
assert.equal(diagnoseFailure('Potential credential detected').priority,'critical');
assert.equal(diagnoseFailure('ERR_MODULE_NOT_FOUND').category,'environment');
assert.equal(diagnoseFailure('unexpected error').category,'unknown');

const report={
  suite:'android',commit:'synthetic',passed:false,duration_seconds:3,
  diagnosis:diagnoseFailure('AssertionError'),log_excerpt:redactLog('AssertionError'),
  production_modified:false
};
const markdown=markdownReport(report);
assert(markdown.includes('## Diagnosi preliminare'));
assert(markdown.includes('Mutazioni su produzione: **nessuna**'));
assert(markdown.includes('Auto-deployment: **disabilitato**'));
assert(!markdown.includes('**PASS**'));
console.log('JARVIS QA Guardian contract tests passed; no external actions, data writes or deployments.');
