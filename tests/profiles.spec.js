import { test, expect } from '@playwright/test';
import { THEMES } from '../src/data.js';
import { generatePuzzle } from '../src/engine.js';
import worker from '../sync-service/worker.js';

const key = id => id === 'daniel' ? 'lexicon-lab-v1' : 'lexicon-lab-v1:larissa';
const read = (page, id) => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key(id));
async function discover(page, id) {
  const save = await read(page, id);
  const theme = THEMES.find(t => t.id === save.session.themeId);
  const puzzle = generatePuzzle({ words: theme.words, difficulty: save.session.difficulty, seed: save.session.seed });
  const word = puzzle.placements.find(word => !save.session.found.includes(word.normalized));
  for (const { row, col } of [word.cells[0], word.cells.at(-1)]) await page.locator(`[data-row="${row}"][data-col="${col}"]`).click();
  await expect(page.locator(`.word-item[data-word="${word.normalized}"]`)).toHaveClass(/found/);
  return word.normalized;
}
function bucket() {
  const values = new Map(); let revision = 0;
  return {
    head: async key => values.get(key) || null,
    get: async key => values.get(key) || null,
    put: async (key, value, options) => {
      const previous = values.get(key);
      if (options.onlyIf?.etagDoesNotMatch === '*' && previous || options.onlyIf?.etagMatches && previous?.etag !== options.onlyIf.etagMatches) return null;
      const etag = `v${++revision}`;
      const saved = { etag, httpEtag: `"${etag}"`, json: async () => JSON.parse(value) };
      values.set(key, saved); return saved;
    },
  };
}
async function mockSync(context, env, offline = () => false) {
  await context.route('https://lexicon-laboratorio.nexcoreadm.chatgpt.site/api/**', async route => {
    if (offline()) { await route.abort('internetdisconnected'); return; }
    const request = route.request();
    const response = await worker.fetch(new Request(request.url(), { method: request.method(), headers: await request.allHeaders(), body: request.postData() || undefined }), env);
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
  });
}

test('startup picker isolates both profiles and resumes their real boards and preferences', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Quem vai explorar hoje?' })).toBeVisible();
  await expect(page.getByRole('grid')).toHaveCount(0);
  await page.screenshot({ path: 'output/profiles-desktop.png' });
  await page.getByRole('button', { name: 'Entrar como Daniel' }).click();
  await page.locator('[data-difficulty="easy"]').click();
  const word = await discover(page, 'daniel');
  await page.getByRole('button', { name: 'Ativar sons' }).click();
  const daniel = await read(page, 'daniel');
  await page.getByRole('button', { name: 'Trocar perfil' }).click();
  await page.getByRole('button', { name: 'Entrar como Larissa' }).click();
  expect((await read(page, 'larissa')).profile.words).toBe(0);
  await expect(page.getByRole('button', { name: 'Ativar sons' })).toBeVisible();
  await discover(page, 'larissa');
  const larissa = await read(page, 'larissa');
  await page.getByRole('button', { name: 'Trocar perfil' }).click();
  await page.getByRole('button', { name: 'Entrar como Daniel' }).click();
  await expect(page.locator(`.word-item[data-word="${word}"]`)).toHaveClass(/found/);
  await expect(page.getByRole('button', { name: 'Desativar sons' })).toBeVisible();
  expect((await read(page, 'daniel')).session.seed).toBe(daniel.session.seed);
  expect((await read(page, 'larissa')).session.seed).toBe(larissa.session.seed);
  await page.reload();
  await expect(page.locator('.active-player')).toHaveText('Daniel');
});

test('two devices pair, exchange progress and protect simultaneous offline progress', async ({ browser }) => {
  const env = { BUCKET: bucket() };
  let firstOffline = false;
  const first = await browser.newContext(); const second = await browser.newContext();
  await mockSync(first, env, () => firstOffline); await mockSync(second, env);
  const a = await first.newPage(); const b = await second.newPage();
  try {
    await a.goto('http://127.0.0.1:5184/');
    await a.getByRole('button', { name: 'Conectar site e app Android' }).click();
    await a.getByRole('button', { name: 'Criar código de conexão' }).click();
    await expect(a.locator('#device-code')).toHaveAttribute('readonly', '');
    const code = await a.locator('#device-code').inputValue();
    await a.getByRole('button', { name: 'Fechar', exact: true }).click();
    await a.getByRole('button', { name: 'Entrar como Daniel' }).click();
    await a.locator('[data-difficulty="easy"]').click();
    const word = await discover(a, 'daniel');
    await expect.poll(() => a.evaluate(() => JSON.parse(localStorage.getItem('lexicon-sync-meta-v1:lexicon-lab-v1')).dirty)).toBe(false);
    await expect(a.locator('.profile-sync-status')).toHaveText('Sincronizado', { timeout: 10000 });
    await b.goto('http://127.0.0.1:5184/');
    await b.getByRole('button', { name: 'Conectar site e app Android' }).click();
    await b.locator('#device-code').fill(code);
    await b.getByRole('button', { name: 'Conectar aparelhos', exact: true }).click();
    await b.getByRole('button', { name: 'Entrar como Daniel' }).click();
    await expect(b.locator(`.word-item[data-word="${word}"]`)).toHaveClass(/found/);
    expect((await read(b, 'daniel')).session.seed).toBe((await read(a, 'daniel')).session.seed);
    firstOffline = true;
    await first.setOffline(true);
    await discover(a, 'daniel');
    await b.getByRole('button', { name: 'Ativar sons' }).click();
    await expect.poll(() => b.evaluate(() => JSON.parse(localStorage.getItem('lexicon-sync-meta-v1:lexicon-lab-v1')).dirty)).toBe(false);
    await expect(b.locator('.profile-sync-status')).toHaveText('Sincronizado', { timeout: 10000 });
    firstOffline = false;
    await first.setOffline(false);
    await a.evaluate(() => dispatchEvent(new Event('online')));
    await expect(a.getByRole('heading', { name: 'Qual progresso continuar?' })).toBeVisible();
    await a.getByRole('button', { name: 'Usar este aparelho' }).click();
    await expect(a.getByRole('dialog')).not.toBeVisible();
    expect((await read(a, 'daniel')).session.found).toHaveLength(2);
    expect(await a.evaluate(() => Boolean(localStorage.getItem('lexicon-sync-backup:daniel')))).toBe(true);
    await b.getByRole('button', { name: 'Trocar perfil' }).click();
    await b.getByRole('button', { name: 'Entrar como Larissa' }).click();
    await expect(b.locator('.active-player')).toHaveText('Larissa');
    expect((await read(b, 'larissa')).profile.words).toBe(0);
  } finally { await first.close(); await second.close(); }
});

test('mobile picker fits the screen and can be operated with keyboard or touch', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/profiles-mobile.png' });
  await page.getByRole('button', { name: 'Entrar como Larissa' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.active-player')).toHaveText('Larissa');
});
