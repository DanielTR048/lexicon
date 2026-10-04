import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../sync-service/worker.js';
import { emptyProfile } from '../src/storage.js';

export function memoryBucket() {
  const objects = new Map(); let version = 0;
  return {
    head: async key => objects.get(key) || null,
    get: async key => objects.get(key) || null,
    put: async (key, value, options) => {
      const existing = objects.get(key);
      if (options?.onlyIf?.etagDoesNotMatch === '*' && existing) return null;
      if (options?.onlyIf?.etagMatches && existing?.etag !== options.onlyIf.etagMatches) return null;
      const etag = 'revision-' + ++version;
      const object = { etag, httpEtag: '"' + etag + '"', json: async () => JSON.parse(value) };
      objects.set(key, object); return object;
    },
  };
}
const state = xp => ({ version: 1, profile: { ...emptyProfile(), xp }, favorites: [], settings: { sound: false } });
const code = '00112233445566778899aabbccddeeff';
function client(env, token = code) {
  return (path, method = 'GET', data, headers = {}) => worker.fetch(new Request('https://sync.test/api/' + path, {
    method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...headers }, body: data === undefined ? undefined : JSON.stringify(data),
  }), env);
}
test('sync protects saves with connection code, separates people and rejects stale overwrites', async () => {
  const env = { BUCKET: memoryBucket() }; const request = client(env);
  assert.equal((await request('family')).status, 404);
  assert.equal((await request('family', 'POST')).status, 200);
  assert.equal((await request('profiles/daniel', 'PUT', state(100), { 'If-None-Match': '*' })).status, 200);
  assert.equal((await request('profiles/larissa', 'PUT', state(200), { 'If-None-Match': '*' })).status, 200);
  const first = await (await request('profiles/daniel')).json();
  assert.equal(first.save.profile.xp, 100);
  assert.equal((await (await request('profiles/larissa')).json()).save.profile.xp, 200);
  assert.equal((await request('profiles/daniel', 'PUT', state(300), { 'If-Match': first.etag })).status, 200);
  assert.equal((await request('profiles/daniel', 'PUT', state(10), { 'If-Match': first.etag })).status, 409);
  assert.equal((await request('profiles/daniel', 'PUT', state(10))).status, 428);
  assert.equal((await request('profiles/daniel', 'PUT', state(10), { 'If-None-Match': '*' })).status, 409);
  assert.equal((await client(env, 'ffeeddccbbaa99887766554433221100')('profiles/daniel')).status, 404);
  assert.equal((await client(env, 'wrong')('profiles/daniel')).status, 401);
});
test('sync rejects malformed and oversized saves and unapproved browser origins', async () => {
  const env = { BUCKET: memoryBucket() }; const request = client(env);
  await request('family', 'POST');
  assert.equal((await request('profiles/daniel', 'PUT', state(-1), { 'If-None-Match': '*' })).status, 400);
  assert.equal((await request('profiles/daniel', 'PUT', { ...state(1), huge: 'x'.repeat(140000) }, { 'If-None-Match': '*' })).status, 413);
  assert.equal((await request('family', 'GET', undefined, { Origin: 'https://attacker.test' })).status, 403);
  const preflight = await request('profiles/daniel', 'OPTIONS', undefined, { Origin: 'https://danieltr048.github.io' });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'https://danieltr048.github.io');
});
