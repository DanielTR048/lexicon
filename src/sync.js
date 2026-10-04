import { readStore, writeStore, profileKey } from './storage.js';

export const SYNC_API = import.meta.env?.VITE_SYNC_API_URL || 'https://lexicon-laboratorio.nexcoreadm.chatgpt.site';
const CODE_KEY = 'lexicon-sync-code-v1';
const locks = new Map();
const conflicts = new Map();
const statuses = new Map();
let listener = () => {};
export const setSyncListener = callback => { listener = callback; };
export const syncStatus = id => statuses.get(id) || (getSyncCode() ? 'Pronto para sincronizar' : 'Salvo neste aparelho');
export const getSyncCode = () => { try { return localStorage.getItem(CODE_KEY) || ''; } catch { return ''; } };
export const normalizeCode = code => code.trim().replace(/^LEX-/i, '').replace(/[-\s]/g, '').toLowerCase();
export const formatCode = code => 'LEX-' + code.toUpperCase().match(/.{1,4}/g)?.join('-');
export const newConnectionCode = () => crypto.randomUUID().replaceAll('-', '');
const metaKey = id => 'lexicon-sync-meta-v1:' + profileKey(id);
const metadata = id => { try { return JSON.parse(localStorage.getItem(metaKey(id))) || {}; } catch { return {}; } };
const saveMeta = (id, meta) => localStorage.setItem(metaKey(id), JSON.stringify(meta));
const raw = id => JSON.stringify(readStore(id));
function status(id, text) { statuses.set(id, text); listener(id, text); }
export function markDirty(id) {
  try { saveMeta(id, { ...metadata(id), dirty: true, stamp: crypto.randomUUID() }); } catch { /* Game storage reports failures itself. */ }
}

async function request(path, code, options = {}) {
  const response = await fetch(SYNC_API + path, { ...options, signal: AbortSignal.timeout(12000), headers: { Authorization: 'Bearer ' + code, 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || 'Não foi possível sincronizar.'); error.status = response.status; throw error; }
  return data;
}
export async function connectDevices(input, create = false) {
  const code = normalizeCode(input);
  if (!/^[a-f0-9]{32}$/.test(code)) throw new Error('Copie o código completo, começando com LEX-.');
  await request('/api/family', code, { method: create ? 'POST' : 'GET' });
  const changed = getSyncCode() !== code;
  localStorage.setItem(CODE_KEY, code);
  if (changed) for (const id of ['daniel', 'larissa']) {
    saveMeta(id, { dirty: Boolean(readStore(id)), stamp: crypto.randomUUID() });
    conflicts.delete(id);
  }
  return formatCode(code);
}
export function meaningful(save) {
  return Boolean(save && (save.profile?.words || save.profile?.wins || save.profile?.xp || save.session?.started || save.session?.customTheme || save.favorites?.length || save.settings?.sound || save.settings?.reduceMotion || save.settings?.haptics === false));
}
export const syncConflict = id => conflicts.get(id);
export function syncProfile(id, resolve) {
  if (locks.has(id)) return locks.get(id);
  const task = performSync(id, resolve).finally(() => locks.delete(id));
  locks.set(id, task);
  return task;
}
async function performSync(id, resolve) {
  const code = getSyncCode();
  if (!code) return { kind: 'local' };
  status(id, 'Sincronizando…');
  try {
    const before = raw(id);
    const local = readStore(id);
    const meta = metadata(id);
    let remote;
    try { remote = await request('/api/profiles/' + id, code); } catch (error) { if (error.status !== 404) throw error; }
    if (getSyncCode() !== code || raw(id) !== before) return { kind: 'pending' };
    const dirty = (meta.dirty ?? Boolean(local)) || Boolean(meta.savedRaw && meta.savedRaw !== before);
    const reviewed = conflicts.get(id);
    if (resolve && remote && reviewed?.etag !== remote.etag) {
      conflicts.set(id, { local, remote: remote.save, etag: remote.etag });
      status(id, 'O progresso online mudou. Confira novamente.');
      return { kind: 'conflict' };
    }
    if (remote && dirty && meta.etag !== remote.etag && meaningful(local) && !resolve) {
      if (JSON.stringify(remote.save) !== before) {
        conflicts.set(id, { local, remote: remote.save, etag: remote.etag });
        status(id, 'Escolha qual progresso continuar');
        return { kind: 'conflict' };
      }
    }
    if (remote && (resolve === 'cloud' || !dirty || !meaningful(local) && meta.etag !== remote.etag)) {
      if (local && resolve === 'cloud') localStorage.setItem('lexicon-sync-backup:' + id, JSON.stringify(local));
      if (!writeStore(remote.save, id)) throw new Error('O aparelho não conseguiu guardar o progresso recebido.');
      saveMeta(id, { etag: remote.etag, dirty: false, savedRaw: raw(id) });
      conflicts.delete(id);
      status(id, 'Sincronizado');
      return { kind: 'loaded', save: readStore(id) };
    }
    if (!local) { status(id, 'Pronto para sincronizar'); return { kind: 'local' }; }
    if (remote && (!dirty || JSON.stringify(remote.save) === before)) {
      saveMeta(id, { etag: remote.etag, dirty: false, savedRaw: before });
      conflicts.delete(id);
      status(id, 'Sincronizado');
      return { kind: 'saved' };
    }
    if (resolve === 'local' && remote) localStorage.setItem('lexicon-sync-backup:' + id, JSON.stringify(remote.save));
    const result = await request('/api/profiles/' + id, code, { method: 'PUT', headers: remote ? { 'If-Match': '"' + remote.etag + '"' } : { 'If-None-Match': '*' }, body: JSON.stringify(local) });
    if (getSyncCode() !== code) return { kind: 'pending' };
    const changed = raw(id) !== before;
    saveMeta(id, { ...metadata(id), etag: result.etag, dirty: changed, savedRaw: before });
    conflicts.delete(id);
    status(id, changed ? 'Alterações aguardando envio' : 'Sincronizado');
    return { kind: changed ? 'pending' : 'saved' };
  } catch (error) {
    status(id, error.status === 409 ? 'Progresso mudou em outro aparelho. Toque em sincronizar.' : 'Salvo no aparelho · aguardando conexão');
    return { kind: 'offline', error: error.message };
  }
}
