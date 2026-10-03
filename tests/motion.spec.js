import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { THEMES } from "../src/data.js";
import { generatePuzzle, getLine, matchSelection } from "../src/engine.js";

const STORE_KEY = "lexicon-lab-v1";
const OUTPUT = resolve("output");
const pageErrors = new WeakMap();

// Exercise the experience users see by default; the functional suite also
// covers reduced motion, which is its global Playwright preference.
test.use({ reducedMotion: "no-preference" });
test.beforeAll(() => mkdirSync(OUTPUT, { recursive: true }));
test.beforeEach(({ page }) => {
  pageErrors.set(page, []);
  page.on("pageerror", (error) => pageErrors.get(page).push(error.message));
});
test.afterEach(({ page }) => {
  expect(
    pageErrors.get(page),
    "Animation must not throw runtime errors",
  ).toEqual([]);
});

async function savedGame(page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    STORE_KEY,
  );
}

async function loadPuzzle(page) {
  await page.goto("/");
  await expect(page.getByRole("grid")).toBeVisible();
  const { session } = await savedGame(page);
  const theme =
    session.customTheme || THEMES.find(({ id }) => id === session.themeId);
  return generatePuzzle({
    words: theme.words,
    difficulty: session.difficulty,
    seed: session.seed,
  });
}

const cell = (page, { row, col }) =>
  page.locator(`.letter-cell[data-row="${row}"][data-col="${col}"]`);
const word = (page, placement) =>
  page.locator(`.word-item[data-word="${placement.normalized}"]`);

async function choose(page, cells, method = "click", { force = false } = {}) {
  await cell(page, cells[0])[method]({ force });
  await cell(page, cells.at(-1))[method]({ force });
}

async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

test("selection previews animate, discoveries commit immediately, and written text stays complete", async ({
  page,
}) => {
  const puzzle = await loadPuzzle(page);
  const placement = puzzle.placements[0];
  await expect(page.locator(".hero h1")).toHaveText(
    /Grandes ideias começam\s*com uma\s+boa descoberta\./,
  );
  await expect(page.locator(".letter-glyph")).toHaveCount(puzzle.size ** 2);
  await page.getByRole("grid").scrollIntoViewIfNeeded();
  const start = await cell(page, placement.cells[0]).boundingBox();
  const end = await cell(page, placement.cells.at(-1)).boundingBox();
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
    steps: placement.cells.length,
  });
  await expect(cell(page, placement.cells[0])).toHaveClass(/selection-start/);
  await expect(cell(page, placement.cells.at(-1))).toHaveClass(/selection-tip/);
  await expect(page.locator(".letter-cell.selecting")).toHaveCount(
    placement.cells.length,
  );
  await expect(page.locator(".motion-word-bubble")).toContainText(
    placement.normalized,
  );
  await expect(page.locator("#motion-layer")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  expect(
    await page
      .locator("#motion-layer")
      .evaluate((layer) => !document.querySelector("#app").contains(layer)),
  ).toBe(true);
  await expect(page.locator("#motion-layer")).toHaveCSS(
    "pointer-events",
    "none",
  );
  await page.mouse.up();
  await expect(word(page, placement)).toHaveClass(/found/);
  const saved = await savedGame(page);
  expect(saved.session.found).toEqual([placement.normalized]);
  expect(saved.session.score).toBe(75);
  await expect(page.locator(".motion-score")).toContainText("+75");
  await expect(page.locator(".letter-cell.motion-hit")).toHaveCount(
    placement.cells.length,
  );
  expect(
    await page.evaluate(() =>
      document
        .getAnimations()
        .some(
          (animation) =>
            animation.playState === "running" &&
            animation.effect?.target?.closest(
              ".motion-hit, .motion-found, .motion-score, .discovery-note",
            ),
        ),
    ),
  ).toBe(true);
  await expect(page.locator(".discovery-note p")).toHaveText(
    `${placement.word}. ${placement.clue}`,
  );
  expect(
    await page.locator(".discovery-note .ink-letter").count(),
  ).toBeGreaterThan(0);
  await page.screenshot({
    path: resolve(OUTPUT, "motion-success.png"),
    fullPage: true,
  });
  await expect(page.locator(".motion-particle, .motion-score")).toHaveCount(0, {
    timeout: 2_000,
  });
  await expect(page.locator(".score b")).toHaveText("75");
  await expect(page.locator(".discovery-note p")).toHaveText(
    `${placement.word}. ${placement.clue}`,
  );
  await expect(page.locator(".letter-cell.selecting")).toHaveCount(0);
});

test("wrong straight and crooked selections react without changing progress or delaying the next answer", async ({
  page,
}) => {
  const puzzle = await loadPuzzle(page);
  const before = await savedGame(page);
  let wrongLine;
  for (let row = 0; row < puzzle.size && !wrongLine; row++) {
    const candidate = getLine({ row, col: 0 }, { row, col: 1 });
    if (!matchSelection(candidate, puzzle.placements, [], puzzle.grid))
      wrongLine = candidate;
  }
  expect(wrongLine).toBeTruthy();
  await choose(page, wrongLine);
  await expect(page.locator(".experiment")).toHaveClass(/motion-error/);
  expect(await page.locator(".motion-miss").count()).toBeGreaterThan(0);
  await expect(page.getByRole("status")).toContainText(/Ainda não|linha reta/);
  await page.screenshot({
    path: resolve(OUTPUT, "motion-error.png"),
    fullPage: true,
  });
  await expect(page.locator(".experiment")).not.toHaveClass(/motion-error/, {
    timeout: 650,
  });
  await choose(page, [
    { row: 0, col: 0 },
    { row: 1, col: 2 },
  ]);
  await expect(page.locator(".experiment")).toHaveClass(/motion-error/);
  const missed = await savedGame(page);
  expect(missed.session.found).toEqual(before.session.found);
  expect(missed.session.score).toBe(before.session.score);
  expect(missed.profile.words).toBe(before.profile.words);
  // Real input must still work while the previous error reaction is active.
  await choose(page, puzzle.placements[0].cells, "click", { force: true });
  await expect(word(page, puzzle.placements[0])).toHaveClass(/found/);
  expect((await savedGame(page)).session.found).toEqual([
    puzzle.placements[0].normalized,
  ]);
  await expect(page.locator(".motion-miss")).toHaveCount(0, { timeout: 650 });
});

test("completing a puzzle celebrates inside the visible dialog and cleans up its particles", async ({
  page,
}) => {
  await loadPuzzle(page);
  await page.locator('[data-difficulty="easy"]').click();
  const { session } = await savedGame(page);
  const puzzle = generatePuzzle({
    words: THEMES.find(({ id }) => id === session.themeId).words,
    difficulty: session.difficulty,
    seed: session.seed,
  });
  for (const placement of puzzle.placements) {
    await choose(page, placement.cells);
    await expect(word(page, placement)).toHaveClass(/found/);
  }
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Eureka, mente brilhante!" }),
  ).toBeVisible();
  expect(await dialog.locator(".motion-particle").count()).toBeGreaterThan(0);
  expect((await savedGame(page)).session.completed).toBe(true);
  await expect(dialog.locator(".result-stats")).toContainText("+475");
  await expect(page.locator(".motion-particle")).toHaveCount(0, {
    timeout: 2_000,
  });
  await expect(dialog).toBeVisible();
});

test("reduced motion keeps answer and error feedback usable without running effects", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const puzzle = await loadPuzzle(page);
  await choose(page, [
    { row: 0, col: 0 },
    { row: 1, col: 2 },
  ]);
  await expect(page.getByRole("status")).toContainText(/Ainda não|linha reta/);
  await choose(page, puzzle.placements[0].cells);
  await expect(word(page, puzzle.placements[0])).toHaveClass(/found/);
  await expect(page.locator(".discovery-note p")).toHaveText(
    `${puzzle.placements[0].word}. ${puzzle.placements[0].clue}`,
  );
  await expect(page.locator(".score b")).toHaveText("75");
  await expect(page.locator(".motion-particle, .motion-score")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);
});

test.describe("animated mobile", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  test("touch feedback stays within the viewport even on a 320 pixel screen", async ({
    page,
  }) => {
    const puzzle = await loadPuzzle(page);
    await noOverflow(page);
    await page.setViewportSize({ width: 320, height: 740 });
    await cell(page, puzzle.placements[0].cells[0]).tap();
    await expect(page.locator(".motion-word-bubble")).toBeVisible();
    await noOverflow(page);
    await cell(page, puzzle.placements[0].cells.at(-1)).tap({ force: true });
    await expect(word(page, puzzle.placements[0])).toHaveClass(/found/);
    expect(await page.locator(".motion-particle").count()).toBeGreaterThan(0);
    await noOverflow(page);
    await expect(page.locator(".motion-particle, .motion-score")).toHaveCount(
      0,
      { timeout: 2_000 },
    );
    await noOverflow(page);
    await choose(page, puzzle.placements[1].cells, "tap");
    await expect(word(page, puzzle.placements[1])).toHaveClass(/found/);
    expect((await savedGame(page)).session.found).toHaveLength(2);
  });
});
