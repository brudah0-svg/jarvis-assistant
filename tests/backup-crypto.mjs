import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

const { subtle } = webcrypto;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Synthetic backup only. Never place real user data or credentials in tests.
const fixture = {
  format: 'JARVIS_VERIFIED_D1_BACKUP_V1',
  metadata: { id: 'synthetic-only', table_count: 1, rows_total: 1, verified: true },
  schema: [{ object_type: 'table', object_name: 'fixture', definition: 'CREATE TABLE fixture(id TEXT PRIMARY KEY)' }],
  rows: [{ table_name: 'fixture', record_key: '000000', record_json: '{"id":"synthetic"}' }],
};

async function derive(password, salt) {
  const material = await subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

const password = 'only-for-test-strong-password';
const wrongPassword = 'another-test-password';
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const iv = webcrypto.getRandomValues(new Uint8Array(12));
const plain = encoder.encode(JSON.stringify(fixture));

const key = await derive(password, salt);
const encrypted = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
assert.notDeepEqual(encrypted.subarray(0, plain.length), plain, 'ciphertext must differ from plaintext');

const decrypted = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted));
assert.deepEqual(JSON.parse(decoder.decode(decrypted)), fixture, 'round trip must preserve snapshot exactly');

const otherKey = await derive(wrongPassword, salt);
await assert.rejects(() => subtle.decrypt({ name: 'AES-GCM', iv }, otherKey, encrypted), 'wrong password must fail');

const modified = new Uint8Array(encrypted);
modified[0] ^= 0x01;
await assert.rejects(() => subtle.decrypt({ name: 'AES-GCM', iv }, key, modified), 'tampered ciphertext must fail');

const modifiedTag = new Uint8Array(encrypted);
modifiedTag[modifiedTag.length - 1] ^= 0x01;
await assert.rejects(() => subtle.decrypt({ name: 'AES-GCM', iv }, key, modifiedTag), 'tampered authentication tag must fail');

console.log('Backup encryption test passed: AES-256-GCM, 310k PBKDF2, roundtrip, wrong password, tampering.');
