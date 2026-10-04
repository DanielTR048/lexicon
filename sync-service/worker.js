const WEB = 'https://danieltr048.github.io/lexicon/';
const ORIGINS = new Set(['https://danieltr048.github.io', 'https://lexicon-laboratorio.nexcoreadm.chatgpt.site', 'http://127.0.0.1:5184', 'http://127.0.0.1:4184']);
const LIMIT = 131072;
const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

async function body(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  const chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > LIMIT) { await reader.cancel(); throw new Error('size'); }
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

async function api(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/health') return json({ service: 'lexicon-sync', version: 1, ready: Boolean(env.BUCKET) });
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
  const id = url.pathname.match(/^\/api\/profiles\/(daniel|larissa)$/)?.[1];
  if (!id) return json({ error: 'Perfil não encontrado.' }, 404);
  const key = `families/${namespace}/${id}.json`;
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
  try { save = await body(request); } catch (error) { return json({ error: 'Salvamento inválido.' }, error.message === 'size' ? 413 : 400); }
  if (!validSave(save)) return json({ error: 'Formato de progresso inválido.' }, 400);
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
