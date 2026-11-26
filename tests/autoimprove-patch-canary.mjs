import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {safePatch,extractPatch,validateParserWithNode,TARGET} from '../scripts/autoimprove-runner.mjs';

// Execute one synthetic agent proposal against the actual UI source, without any network,
// filesystem writes, GitHub permissions, Cloudflare credentials or production deployment.
// This is a contract canary; it cannot prove a future AI-generated patch is correct.
const original=readFileSync(TARGET,'utf8');
const find=String.raw`micr\s*(?:è|e)?\s*`;
const replacement=String.raw`micr\s*(?:è|e)?\s{0,3}`;
assert(original.includes(find),'Expected current ASR fragment');
const proposal=extractPatch(JSON.stringify({find,replace:replacement,reason:'Constrain a noisy voice transcription fragment'}));
const update=safePatch(original,proposal);
assert.equal(update.changed,true,'Canary patch must change code');
assert.equal(validateParserWithNode(update.source),true,'Patched UI syntax must remain valid');
function makeParser(html){
 const from=html.indexOf('function parseJarvisCoreCommand(message){');
 const to=html.indexOf('function showSitePreviewInChat(',from);
 assert(from!==-1&&to>from);
 const parserSource=html.slice(from,to);
 return runInNewContext('let pendingVoiceAction=null,pendingWebsiteBrief=null;\n'+parserSource+'\nparseJarvisCoreCommand;',{}, {timeout:1000});
}
const baseline=makeParser(original),candidate=makeParser(update.source);
const utterances=[
 'Hey Jarvis micr è un sito un sito web per un idraulico per piacere',
 'Hey Jarvis, creami un sito web per Pinco Pallo elettricista in Veneto',
 'Jarvis, migliorati autonomamente',
 'e Jarvis migliorati autonomamente',
 'Jarvis è migliorati autonomamente',
 'Jarvis, stato automiglioramento',
 'Jarvis, riprova a migliorarti',
 'Jarvis, quanto costa un sito web per un idraulico?',
 'Ciao Jarvis mi crei un progetto per il sito di un elettricista',
 'Jarvis, apri l’ultimo sito multipagina'
];
for(const phrase of utterances){
 const oldResult=JSON.stringify(baseline(phrase));
 const nextResult=JSON.stringify(candidate(phrase));
 assert.equal(nextResult,oldResult,'Synthetic ASR patch changed a protected command: '+phrase);
}
const malicious=[
 {find,replace:'fetch("https://malicious.example")',reason:'egress'},
 {find,replace:replacement+'\nconsole.log("surprise")',reason:'new statement'}
];
for(const p of malicious)assert.throws(()=>safePatch(original,p),'Unsafe patch must not be accepted');
assert.equal(readFileSync(TARGET,'utf8'),original,'Canary must never write to the project source');
console.log('JARVIS AutoImprove canary PASS: real parser, 10 command equivalence checks, forbidden edits rejected, no writes.');
