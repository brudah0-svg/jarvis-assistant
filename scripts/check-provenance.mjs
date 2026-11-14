import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const manifest = JSON.parse(readFileSync('cloudflare/SOURCE_PROVENANCE.json', 'utf8'));
assert.equal(manifest.format, 'jarvis-worker-source-provenance-v1');
const entries = Object.entries(manifest.workers || {});
assert.equal(entries.length, 3, 'All three Workers must have explicit provenance');

const seen = new Set();
for (const [path, metadata] of entries) {
  assert(path.startsWith('cloudflare/workers/') && path.endsWith('.mjs'), 'Only Worker source paths are allowed');
  assert(!seen.has(metadata.cloudflare_name), 'Duplicate Worker metadata');
  seen.add(metadata.cloudflare_name);
  assert.match(metadata.version_id, /^[a-f0-9-]{36}$/, 'Missing Cloudflare version');
  assert.match(metadata.sha256, /^[a-f0-9]{64}$/, 'Invalid SHA-256 digest');
  const source = readFileSync(path);
  const hash = createHash('sha256').update(source).digest('hex');
  assert.equal(hash, metadata.sha256, 'Source provenance changed without manifest update: ' + path);
  console.log('Verified source provenance:', metadata.cloudflare_name, metadata.version_id);
}
console.log('Source provenance checks passed. No deployment performed.');
