import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { validNeonSave } from '../sync-service/worker.js';
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
function neonState(seed = 'neon-test', mode = 'classic', level = 1) {
  return {
    version: 1, seed, results: { classic: {}, cascade: {} }, settings: { sound: true, reducedMotion: false },
    sessions: {
      [`${mode}:${level}`]: {
        puzzle: {
          id: `${seed}:${mode}:${level}`, mode, level, themeIds: ['nature', 'science', 'art', 'travel', 'history'], rows: 1, cols: 3, difficulty: 'Iniciante',
          words: [{ id: 'nature:abc', answer: 'ABC', clue: 'Primeiras três letras', difficulty: 1, themeId: 'nature', themeName: 'Natureza', row: 0, col: 0, direction: 'across', number: 1 }],
        },
        values: { '0:0': 'A' }, solved: [], revealed: { '0:0': 'A' }, mistakes: 0, hints: 1, elapsed: 12.5, completed: false,
      },
    },
  };
}
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
test('crossword sync reuses family codes while isolating games, people and conditional revisions', async () => {
  const env = { BUCKET: memoryBucket() }; const request = client(env);
  await request('family', 'POST');
  assert.equal((await request('neon/profiles/daniel')).status, 404);
  assert.equal((await request('profiles/daniel', 'PUT', state(42), { 'If-None-Match': '*' })).status, 200);
  assert.equal((await request('neon/profiles/daniel', 'PUT', neonState('daniel'), { 'If-None-Match': '*' })).status, 200);
  assert.equal((await request('neon/profiles/larissa', 'PUT', neonState('larissa'), { 'If-None-Match': '*' })).status, 200);
  assert.equal((await (await request('profiles/daniel')).json()).save.profile.xp, 42);
  assert.equal((await request('profiles/larissa')).status, 404);
  const firstResponse = await request('neon/profiles/daniel');
  const first = await firstResponse.json();
  assert.equal(first.save.seed, 'daniel');
  assert.equal(firstResponse.headers.get('ETag'), `"${first.etag}"`);
  assert.equal((await (await request('neon/profiles/larissa')).json()).save.seed, 'larissa');
  assert.equal((await request('neon/profiles/daniel', 'PUT', neonState('updated'), { 'If-Match': `"${first.etag}"` })).status, 200);
  assert.equal((await request('neon/profiles/daniel', 'PUT', neonState('stale'), { 'If-Match': first.etag })).status, 409);
  assert.equal((await request('neon/profiles/daniel', 'PUT', neonState('stale'), { 'If-None-Match': '*' })).status, 409);
  assert.equal((await request('neon/profiles/daniel', 'PUT', neonState('stale'))).status, 428);
  assert.equal((await (await request('neon/profiles/daniel')).json()).save.seed, 'updated');
  assert.equal((await (await request('neon/profiles/larissa')).json()).save.seed, 'larissa');
  assert.equal((await (await request('profiles/daniel')).json()).save.profile.xp, 42);
  assert.equal((await client(env, 'ffeeddccbbaa99887766554433221100')('neon/profiles/daniel')).status, 404);
  assert.equal((await request('neon/profiles/other')).status, 404);
  assert.equal((await request('profiles/daniel', 'PUT', neonState(), { 'If-Match': first.etag })).status, 400);
  assert.equal((await request('neon/profiles/daniel', 'PUT', state(1), { 'If-Match': first.etag })).status, 400);
});
test('crossword sync validates grids, solved letters, settings and bounded collection formats', async () => {
  const env = { BUCKET: memoryBucket() }; const request = client(env);
  await request('family', 'POST');
  const invalidChanges = [
    save => { save.seed = ''; },
    save => { save.settings.reducedMotion = 'false'; },
    save => { save.results.classic['101'] = { stars: 3, score: 10, seconds: 1 }; },
    save => { save.results.classic['1'] = { stars: 4, score: 10, seconds: 1 }; },
    save => { save.results.classic['1'] = { stars: 3, score: -1, seconds: 1 }; },
    save => { save.results.classic['1'] = { stars: 3, score: 10, seconds: 1_000_000_001 }; },
    save => { save.sessions['classic:1'].puzzle.level = 2; },
    save => { save.sessions['classic:1'].puzzle.words[0].row = 1; },
    save => { save.sessions['classic:1'].puzzle.words[0].answer = 'ABCD'; },
    save => { save.sessions['classic:1'].puzzle.words[0].clue = 'x'.repeat(601); },
    save => { save.sessions['classic:1'].puzzle.words.push({ ...save.sessions['classic:1'].puzzle.words[0], id: 'other', answer: 'AXC' }); },
    save => { save.sessions['classic:1'].values['99:99'] = 'X'; },
    save => { save.sessions['classic:1'].revealed['0:0'] = 'X'; },
    save => { save.sessions['classic:1'].solved = ['unknown']; },
    save => { save.sessions['classic:1'].completed = true; },
    save => { save.sessions['classic:1'].solved = ['nature:abc']; save.sessions['classic:1'].completed = true; },
    save => { save.sessions['classic:1'].values = null; },
    save => { save.sessions['classic:1'].elapsed = -1; },
    save => { for (let level = 1; level <= 101; level++) save.results.classic[level] = { stars: 3, score: 10, seconds: 1 }; },
    save => { for (let level = 0; level <= 200; level++) save.sessions[`classic:${level}`] = structuredClone(save.sessions['classic:1']); },
  ];
  for (const change of invalidChanges) {
    const save = neonState(); change(save);
    assert.equal(validNeonSave(save), false);
    assert.equal((await request('neon/profiles/daniel', 'PUT', save, { 'If-None-Match': '*' })).status, 400);
  }
  const complete = neonState(); const session = complete.sessions['classic:1'];
  session.values = { '0:0': 'A', '0:1': 'B', '0:2': 'C' }; session.revealed = { ...session.values };
  session.solved = ['nature:abc']; session.completed = true;
  complete.results.classic['1'] = { stars: 3, score: 100, seconds: 12.5 };
  assert.equal(validNeonSave(complete), true);
  assert.equal((await request('neon/profiles/daniel', 'PUT', complete, { 'If-None-Match': '*' })).status, 200);
});
test('crossword supports full 200-session backups above Lexicon limit but caps streamed bytes at 8 MB', async () => {
  const env = { BUCKET: memoryBucket() }; const request = client(env);
  await request('family', 'POST');
  const save = neonState(); save.sessions = {};
  for (const mode of ['classic', 'cascade']) {
    for (let level = 1; level <= 100; level++) {
      const session = neonState('large-save', mode, level).sessions[`${mode}:${level}`];
      session.puzzle.words[0].clue = 'x'.repeat(600);
      save.sessions[`${mode}:${level}`] = session;
      save.results[mode][level] = { stars: 3, score: 100, seconds: 12.5 };
    }
  }
  assert.ok(new TextEncoder().encode(JSON.stringify(save)).length > 131072);
  assert.equal((await request('neon/profiles/daniel', 'PUT', save, { 'If-None-Match': '*' })).status, 200);
  const retrieved = await (await request('neon/profiles/daniel')).json();
  assert.equal(Object.keys(retrieved.save.sessions).length, 200);
  assert.equal((await request('neon/profiles/larissa', 'PUT', { ...save, huge: 'x'.repeat(8_000_001) }, { 'If-None-Match': '*' })).status, 413);
  assert.equal((await request('profiles/larissa', 'PUT', { ...state(1), huge: 'x'.repeat(131073) }, { 'If-None-Match': '*' })).status, 413);
});
test('crossword QA browser origins get CORS access and health preserves existing fields', async () => {
  const env = { BUCKET: memoryBucket() }; const request = client(env);
  for (const origin of ['http://localhost:5185', 'http://127.0.0.1:5185', 'http://localhost:4185', 'http://127.0.0.1:4185']) {
    const response = await request('neon/profiles/daniel', 'OPTIONS', undefined, { Origin: origin });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(response.headers.get('Access-Control-Expose-Headers'), 'ETag');
  }
  const health = await (await request('health')).json();
  assert.equal(health.service, 'lexicon-sync'); assert.equal(health.version, 1); assert.equal(health.ready, true);
  assert.deepEqual(health.games, ['lexicon', 'neon']);
});
