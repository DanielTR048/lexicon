import { test, expect } from "@playwright/test";
import { THEMES } from "../src/data.js";
import { generatePuzzle } from "../src/engine.js";

test.use({ baseURL: "http://127.0.0.1:4184", serviceWorkers: "allow" });

const STORE_KEY = "lexicon-lab-v1";
const store = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORE_KEY);
const cell = (page, { row, col }) =>
  page.locator(`.letter-cell[data-row="${row}"][data-col="${col}"]`);

async function selectWord(page, placement) {
  await cell(page, placement.cells[0]).click();
  await cell(page, placement.cells.at(-1)).click();
  await expect(
    page.locator(`.word-item[data-word="${placement.normalized}"]`),
  ).toHaveClass(/found/);
}

async function expectProductionArtwork(page) {
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(page.locator("i[data-lucide]")).toHaveCount(0);
  expect(await page.locator("svg.lucide").count()).toBeGreaterThan(15);
  await expect
    .poll(() =>
      page
        .locator(".hero-art img")
        .evaluate((image) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  const loadedFonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return Array.from(document.fonts)
      .filter((font) => font.status === "loaded")
      .map((font) => font.family.replaceAll('"', ""));
  });
  expect(loadedFonts).toEqual(
    expect.arrayContaining(["DM Sans Variable", "Space Mono"]),
  );
}

test("production installs its cache, reloads offline, finds real words and restores progress offline", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  const runtimeErrors = [];
  const failedRequests = [];
  const unsuccessfulResponses = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("requestfailed", (request) =>
    failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText,
    }),
  );
  page.on("response", (response) => {
    if (response.status() >= 400)
      unsuccessfulResponses.push({
        url: response.url(),
        status: response.status(),
      });
  });

  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Entrar como Daniel" }).click();
    await expectProductionArtwork(page);
    expect(
      await page.locator('script[type="module"]').getAttribute("src"),
    ).toMatch(/^(?:\.\/|\/)assets\/.*\.js$/);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) =>
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            resolve,
            { once: true },
          ),
        );
      }
    });
    const cached = await page.evaluate(async () => {
      const names = (await caches.keys()).filter((name) =>
        name.startsWith("lexicon-"),
      );
      const entries = await Promise.all(
        names.map(async (name) => {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          return Promise.all(
            requests.map(async (request) => ({
              pathname: new URL(request.url).pathname,
              ok: (await cache.match(request)).ok,
            })),
          );
        }),
      );
      return { names, entries: entries.flat() };
    });
    expect(cached.names).toHaveLength(1);
    expect(cached.entries.every((entry) => entry.ok)).toBe(true);
    const paths = cached.entries.map((entry) => entry.pathname);
    expect(paths).toEqual(
      expect.arrayContaining([
        "/",
        "/index.html",
        "/favicon.svg",
        "/manifest.webmanifest",
        "/images/lab-genius.png",
      ]),
    );
    expect(paths.some((path) => /^\/assets\/.*\.js$/.test(path))).toBe(true);
    expect(paths.some((path) => /^\/assets\/.*\.css$/.test(path))).toBe(true);
    expect(
      paths.filter((path) => path.endsWith(".woff2")).length,
    ).toBeGreaterThanOrEqual(2);

    const initial = await store(page);
    const theme = THEMES.find((entry) => entry.id === initial.session.themeId);
    const puzzle = generatePuzzle({
      words: theme.words,
      difficulty: initial.session.difficulty,
      seed: initial.session.seed,
    });
    await selectWord(page, puzzle.placements[0]);
    const onlineProgress = await store(page);
    expect(onlineProgress.session.found).toEqual([
      puzzle.placements[0].normalized,
    ]);

    await context.setOffline(true);
    const offlineResponse = await page.reload({ waitUntil: "networkidle" });
    expect(offlineResponse.fromServiceWorker()).toBe(true);
    await expectProductionArtwork(page);
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);
    await expect(page.locator(".word-item.found")).toHaveCount(1);
    expect((await store(page)).session.seed).toBe(initial.session.seed);

    await selectWord(page, puzzle.placements[1]);
    const offlineProgress = await store(page);
    expect(offlineProgress.session.found).toEqual([
      puzzle.placements[0].normalized,
      puzzle.placements[1].normalized,
    ]);
    expect(offlineProgress.profile.words).toBe(2);
    expect(offlineProgress.session.score).toBe(150);
    expect(
      offlineProgress.session.foundPaths[puzzle.placements[1].normalized],
    ).toEqual(puzzle.placements[1].cells);

    const restoredResponse = await page.reload({ waitUntil: "networkidle" });
    expect(restoredResponse.fromServiceWorker()).toBe(true);
    await expectProductionArtwork(page);
    await expect(page.locator(".word-item.found")).toHaveCount(2);
    const restored = await store(page);
    expect(restored.session.found).toEqual(offlineProgress.session.found);
    expect(restored.session.foundPaths).toEqual(
      offlineProgress.session.foundPaths,
    );
    expect(restored.session.score).toBe(offlineProgress.session.score);
    expect(restored.profile).toEqual(offlineProgress.profile);
    for (const { row, col } of puzzle.placements[1].cells)
      await expect(cell(page, { row, col })).toHaveClass(/found-cell/);
  } finally {
    await context.setOffline(false);
    expect(
      runtimeErrors,
      "Production must not throw browser runtime errors.",
    ).toEqual([]);
    expect(
      failedRequests,
      "Every page resource must remain available when offline.",
    ).toEqual([]);
    expect(
      unsuccessfulResponses,
      "Production resources must not return HTTP errors.",
    ).toEqual([]);
  }
});
