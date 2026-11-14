import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const workers = [
  'cloudflare/workers/jarvis-backend.mjs',
  'cloudflare/workers/jarvis-staging.mjs',
  'cloudflare/workers/jarvis-backup-export.mjs',
];
for (const file of [...workers, 'app.js']) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  console.log('Syntax OK:', file);
}
const read = path => readFileSync(path, 'utf8');
const prod = read(workers[0]);
const stage = read(workers[1]);
const backup = read(workers[2]);
const requiredRoutes = ['/jarvis', '/api/autonomy/status', '/api/autonomy/remediations', '/api/recovery/preflight', '/api/recovery/backup-download', '/recovery-download-v3', '/autonomy-control-v3', '/api/staging/release-gate'];
for (const route of requiredRoutes) assert(prod.includes(route), 'Missing production route: ' + route);
assert(prod.includes('jarvisScheduledFullSnapshot'), 'Missing scheduled snapshot logic');
assert(prod.includes('jarvisAutonomyDiagnostics'), 'Missing autonomy diagnostic loop');
assert(prod.includes('jarvisRemediationEngine'), 'Missing remediation engine');
assert(prod.includes('BACKUP_SERVICE'), 'Missing backup service reference');
assert(stage.includes('STAGING_ONLY_MODE'), 'Staging isolation guard missing');
assert(stage.includes('staging-check'), 'Staging verification route missing');
assert(backup.includes('/verified-snapshot'), 'Backup service read route missing');
assert(backup.includes('/internal/snapshot-write'), 'Backup service write route missing');
assert(backup.includes('Readback verification failed'), 'Backup readback guard missing');

for (const file of workers) {
  const source=read(file);
  const patterns = [
    /ghp_[a-zA-Z0-9]{20,}/,
    /github_pat_[a-zA-Z0-9_]{20,}/,
    /sk-[a-zA-Z0-9_-]{20,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/,
    /Bearer\s+[a-zA-Z0-9_.-]{24,}/,
  ];
  for (const regex of patterns) assert(!regex.test(source), 'Potential credential in ' + file);
}
assert(read('cloudflare/configs/jarvis-staging.example.toml').includes('workers_dev = false'));
assert(read('cloudflare/configs/jarvis-backup-export.example.toml').includes('workers_dev = false'));
console.log('Static JARVIS checks passed. No deployment performed.');
