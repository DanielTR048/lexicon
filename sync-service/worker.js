const WEB = 'https://danieltr048.github.io/lexicon/';
const ORIGINS = new Set(['https://danieltr048.github.io', 'https://lexicon-laboratorio.nexcoreadm.chatgpt.site', 'http://127.0.0.1:5184', 'http://127.0.0.1:4184', 'http://localhost:5185', 'http://127.0.0.1:5185', 'http://localhost:4185', 'http://127.0.0.1:4185']);
const LIMIT = 131072;
const NEON_LIMIT = 8_000_000;
const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

async function body(request, limit = LIMIT) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  const chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new Error('size'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function validSave(save) {
  return save?.version === 1 && save.profile && ['xp', 'wins', 'words', 'seconds'].every(key => Number.isInteger(save.profile[key]) && save.profile[key] >= 0 && save.profile[key] <= 2147483647)
    && ['themes', 'dailyDays', 'history', 'discoveries', 'achievements'].every(key => Array.isArray(save.profile[key]) && save.profile[key].length <= 500)
    && Array.isArray(save.favorites) && save.favorites.length <= 100 && save.settings && typeof save.settings.sound === 'boolean'
    && (!save.session || (typeof save.session.seed === 'string' && save.session.seed.length <= 256 && ['easy', 'medium', 'hard'].includes(save.session.difficulty) && Array.isArray(save.session.found) && save.session.found.length <= 16));
}

// Mirror the crossword backup format without importing its browser-only code.
// Limits bound validation work as well as storage; semantic checks prevent a
// corrupted grid or completion flag from replacing a healthy device save.
export function validNeonSave(save) {
  const modes = ['classic', 'cascade'];
  const record = value => value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).every(key => !['__proto__', 'prototype', 'constructor'].includes(key));
  const keys = (value, expected) => record(value) && Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
  const text = (value, limit) => typeof value === 'string' && value.length > 0 && value.length <= limit && !/[\u0000-\u001f\u007f]/.test(value);
  const identifier = value => text(value, 120) && /^[a-zA-Z0-9_:-]+$/.test(value);
  const number = (value, max, min = 0, integer = true) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));
  const list = (value, max) => Array.isArray(value) && value.length <= max && value.every(identifier) && new Set(value).size === value.length;
  if (!keys(save, ['version', 'seed', 'results', 'sessions', 'settings']) || save.version !== 1 || !text(save.seed, 128)
    || !keys(save.results, modes) || !record(save.sessions) || Object.keys(save.sessions).length > 200
    || !keys(save.settings, ['sound', 'reducedMotion']) || typeof save.settings.sound !== 'boolean' || typeof save.settings.reducedMotion !== 'boolean') return false;
  for (const mode of modes) {
    const results = save.results[mode];
    if (!record(results) || Object.keys(results).length > 100) return false;
    for (const [level, result] of Object.entries(results)) {
      if (!/^(?:[1-9]\d?|100)$/.test(level) || !keys(result, ['stars', 'score', 'seconds'])
        || !number(result.stars, 3) || !number(result.score, 10_000_000) || !number(result.seconds, 1_000_000_000, 0, false)) return false;
    }
  }
  for (const [key, session] of Object.entries(save.sessions)) {
    if (!/^(classic|cascade):(?:[1-9]\d?|100)$/.test(key)
      || !keys(session, ['puzzle', 'values', 'solved', 'revealed', 'mistakes', 'hints', 'elapsed', 'completed'])) return false;
    const puzzle = session.puzzle;
    if (!keys(puzzle, ['id', 'mode', 'level', 'themeIds', 'words', 'rows', 'cols', 'difficulty'])
      || !modes.includes(puzzle.mode) || !number(puzzle.level, 100, 1) || key !== `${puzzle.mode}:${puzzle.level}`
      || !text(puzzle.id, 700) || !text(puzzle.difficulty, 60) || !list(puzzle.themeIds, 5) || puzzle.themeIds.length !== 5
      || !number(puzzle.rows, 64, 1) || !number(puzzle.cols, 64, 1) || !Array.isArray(puzzle.words) || puzzle.words.length < 1 || puzzle.words.length > 40) return false;
    const solution = Object.create(null); const ids = new Set();
    for (const word of puzzle.words) {
      if (!keys(word, ['id', 'answer', 'clue', 'difficulty', 'themeId', 'themeName', 'row', 'col', 'direction', 'number'])
        || !identifier(word.id) || ids.has(word.id) || !text(word.answer, 40) || !/^[A-Z]+$/.test(word.answer)
        || !text(word.clue, 600) || !number(word.difficulty, 3, 1) || !puzzle.themeIds.includes(word.themeId)
        || !text(word.themeName, 100) || !number(word.row, puzzle.rows - 1) || !number(word.col, puzzle.cols - 1)
        || !['across', 'down'].includes(word.direction) || !number(word.number, 100, 1)
        || (word.direction === 'across' ? word.col : word.row) + word.answer.length > (word.direction === 'across' ? puzzle.cols : puzzle.rows)) return false;
      ids.add(word.id);
      for (let index = 0; index < word.answer.length; index++) {
        const cell = `${word.row + (word.direction === 'down' ? index : 0)}:${word.col + (word.direction === 'across' ? index : 0)}`;
        if (solution[cell] && solution[cell] !== word.answer[index]) return false;
        solution[cell] = word.answer[index];
      }
    }
    if (!list(session.solved, puzzle.words.length) || session.solved.some(id => !ids.has(id))
      || typeof session.completed !== 'boolean' || session.completed !== (session.solved.length === puzzle.words.length)
      || !number(session.mistakes, 1_000_000) || !number(session.hints, 1_000_000) || !number(session.elapsed, 1_000_000_000, 0, false)) return false;
    for (const field of ['values', 'revealed']) {
      if (!record(session[field]) || Object.keys(session[field]).length > Object.keys(solution).length) return false;
      for (const [cell, letter] of Object.entries(session[field])) {
        if (!Object.hasOwn(solution, cell) || typeof letter !== 'string' || !/^[A-Z]$/.test(letter)
          || (field === 'revealed' && (solution[cell] !== letter || session.values[cell] !== letter))) return false;
      }
    }
    for (const word of puzzle.words.filter(word => session.solved.includes(word.id))) {
      for (let index = 0; index < word.answer.length; index++) {
        const cell = `${word.row + (word.direction === 'down' ? index : 0)}:${word.col + (word.direction === 'across' ? index : 0)}`;
        if (session.values[cell] !== word.answer[index] || session.revealed[cell] !== word.answer[index]) return false;
      }
    }
  }
  return true;
}

async function api(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/health') return json({ service: 'lexicon-sync', version: 1, ready: Boolean(env.BUCKET), games: ['lexicon', 'neon'] });
  const token = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{32})$/)?.[1];
  if (!token) return json({ error: 'Código de conexão inválido.' }, 401);
  if (!env.BUCKET) return json({ error: 'Sincronização indisponível.' }, 503);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lexicon-sync-v1:' + token));
  const namespace = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const familyKey = `families/${namespace}/family.json`;
  if (url.pathname === '/api/family' && request.method === 'POST') {
    await env.BUCKET.put(familyKey, JSON.stringify({ version: 1, profiles: ['daniel', 'larissa'] }), { onlyIf: { etagDoesNotMatch: '*' } });
    return json({ profiles: ['daniel', 'larissa'] });
  }
  if (!(await env.BUCKET.head(familyKey))) return json({ error: 'Código não encontrado. Copie o código do outro aparelho.' }, 404);
  if (url.pathname === '/api/family' && request.method === 'GET') return json({ profiles: ['daniel', 'larissa'] });
  const route = url.pathname.match(/^\/api\/(neon\/)?profiles\/(daniel|larissa)$/);
  const id = route?.[2]; const neon = Boolean(route?.[1]);
  if (!id) return json({ error: 'Perfil não encontrado.' }, 404);
  const key = `families/${namespace}/${neon ? 'neon-' : ''}${id}.json`;
  if (request.method === 'GET') {
    const stored = await env.BUCKET.get(key);
    if (!stored) return json({ error: 'Este perfil ainda não tem um salvamento online.' }, 404);
    return json({ save: await stored.json(), etag: stored.etag }, 200, { ETag: stored.httpEtag });
  }
  if (request.method !== 'PUT') return json({ error: 'Método não permitido.' }, 405);
  const match = request.headers.get('If-Match')?.replace(/^"|"$/g, '');
  const create = request.headers.get('If-None-Match') === '*';
  if ((!match || match === '*') && !create) return json({ error: 'A versão do salvamento é obrigatória.' }, 428);
  let save;
  try { save = await body(request, neon ? NEON_LIMIT : LIMIT); } catch (error) { return json({ error: 'Salvamento inválido.' }, error.message === 'size' ? 413 : 400); }
  if (!(neon ? validNeonSave(save) : validSave(save))) return json({ error: 'Formato de progresso inválido.' }, 400);
  const stored = await env.BUCKET.put(key, JSON.stringify(save), { onlyIf: create ? { etagDoesNotMatch: '*' } : { etagMatches: match }, httpMetadata: { contentType: 'application/json' } });
  if (!stored) return json({ error: 'Há progresso mais recente em outro aparelho.' }, 409);
  return json({ etag: stored.etag }, 200, { ETag: stored.httpEtag });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Keep the previous Sites origin usable so its local saves can be connected.
    // Public game assets come from the primary GitHub Pages publication.
    if (!url.pathname.startsWith('/api/')) {
      if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405 });
      return fetch(new URL(url.pathname.replace(/^\//, '') + url.search, WEB), { method: request.method });
    }
    const origin = request.headers.get('Origin');
    if (origin && !ORIGINS.has(origin)) return json({ error: 'Origem não permitida.' }, 403);
    const headers = { Vary: 'Origin', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-Match, If-None-Match', 'Access-Control-Expose-Headers': 'ETag' };
    if (origin) headers['Access-Control-Allow-Origin'] = origin;
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    let response;
    try { response = await api(request, env); } catch { response = json({ error: 'Não foi possível sincronizar agora. O progresso continua salvo no aparelho.' }, 503); }
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    return response;
  },
};
