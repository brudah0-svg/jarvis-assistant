import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Reuse the exact deployed staging source, but do not mutate its version manifest or hash.
execFileSync(process.execPath,['scripts/build-v4-ui-next.mjs'],{stdio:'inherit'});
const source=readFileSync('dist/jarvis-v4-ui-next.mjs','utf8');
const pinned=JSON.parse(readFileSync('cloudflare/STAGING_V4_DEPLOYMENT.json','utf8'));
const hash=text=>createHash('sha256').update(text,'utf8').digest('hex');
assert.equal(hash(source),pinned.source_sha256,'Original deployed source must remain reproducible');
const begin='const STAGING_V4_HTML=',end=';\nconst STAGING_V4_HEADERS=';
const i=source.indexOf(begin),j=source.indexOf(end,i);
assert(i===0&&j>i,'Expected one embedded staging HTML value');
let html=JSON.parse(source.slice(i+begin.length,j));
function replace(oldText,newText){
 assert.equal(html.split(oldText).length,2,'Read-only staging UI anchor changed: '+oldText);
 html=html.replace(oldText,newText);
}
// Buttons generated when project/task data loads must be disabled, not just toolbar controls.
replace(
 "const q=$('memorySearch').value.toLocaleLowerCase('it');",
 "if(ISOLATED_STAGING){$('tasks').querySelectorAll('[data-task-toggle]').forEach(button=>{button.disabled=true;button.setAttribute('aria-disabled','true')});}\n const q=$('memorySearch').value.toLocaleLowerCase('it');"
);
// Suppress even programmatic click events in the read-only preview.
replace(
 "$('tasks').addEventListener('click',async e=>{",
 "$('tasks').addEventListener('click',async e=>{\n if(ISOLATED_STAGING)return;"
);
// Prevent browsing into real production modules from isolated staging.
replace(
 "function tick(){",
 "if(ISOLATED_STAGING){for(const anchor of document.querySelectorAll('a.module[href^=\"/\"],a[href=\"/autonomy-control-v3\"]')){anchor.removeAttribute('href');anchor.setAttribute('aria-disabled','true');anchor.tabIndex=-1;}}\nfunction tick(){"
);
const output=source.slice(0,i+begin.length)+JSON.stringify(html)+source.slice(j);
assert(output.includes('const STAGING_ONLY_MODE = true;'));
assert(output.includes("if(method==='PATCH')return json({error:'Staging: endpoint not exposed'},404,'');"));
writeFileSync('dist/jarvis-v4-ui-hardened.mjs',output,'utf8');
console.log('Generated additional read-only staging candidate, SHA-256:',hash(output),'— no deployment.');
