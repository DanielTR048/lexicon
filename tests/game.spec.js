import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { THEMES } from "../src/data.js";
import { DIFFICULTIES, generatePuzzle } from "../src/engine.js";

const STORE_KEY = "lexicon-lab-v1";
const OUTPUT = resolve("output");
const pageErrors = new WeakMap();

test.beforeAll(() => mkdirSync(OUTPUT, { recursive: true }));
test.beforeEach(({ page }) => {
  pageErrors.set(page, []);
  page.on("pageerror", (error) => pageErrors.get(page).push(error.message));
});
test.afterEach(({ page }) => {
  expect(
    pageErrors.get(page),
    "The game must not throw browser runtime errors.",
  ).toEqual([]);
});

async function loadGame(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Entrar como Daniel" }).click();
  await expect(page.getByRole("grid")).toBeVisible();
}

async function store(page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    STORE_KEY,
  );
}

// Reproduce a publicly saved seed in the test process. No app state or debug
// hooks are changed: all words are selected through real browser input.
async function currentPuzzle(page) {
  const { session } = await store(page);
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

async function selectByEndpoints(
  page,
  placement,
  { reverse = false, touch = false } = {},
) {
  const cells = reverse ? [...placement.cells].reverse() : placement.cells;
  await cell(page, cells[0])[touch ? "tap" : "click"]();
  await cell(page, cells.at(-1))[touch ? "tap" : "click"]();
  await expect(
    page.locator(`.word-item[data-word="${placement.normalized}"]`),
  ).toHaveClass(/found/);
}

async function selectByDrag(page, placement, reverse = false) {
  const cells = reverse ? [...placement.cells].reverse() : placement.cells;
  await page.getByRole("grid").scrollIntoViewIfNeeded();
  const start = await cell(page, cells[0]).boundingBox();
  const end = await cell(page, cells.at(-1)).boundingBox();
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
    steps: cells.length,
  });
  await page.mouse.up();
  await expect(
    page.locator(`.word-item[data-word="${placement.normalized}"]`),
  ).toHaveClass(/found/);
}

async function solveCurrentGame(page) {
  const puzzle = await currentPuzzle(page);
  const { session } = await store(page);
  for (const placement of puzzle.placements) {
    if (!session.found.includes(placement.normalized))
      await selectByEndpoints(page, placement);
  }
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Eureka, mente brilhante!" }),
  ).toBeVisible();
  return puzzle;
}

async function openCatalog(page) {
  await page.locator('.main-nav [data-view="themes"]').click();
  await expect(
    page.getByRole("searchbox", { name: "Buscar temas" }),
  ).toBeVisible();
}

test("loads the complete lab, accepts endpoint and reversed drag selections, and restores progress", async ({
  page,
}) => {
  await loadGame(page);
  await expect(page.locator(".theme-select strong")).toHaveText(
    "Mentes brilhantes",
  );
  await expect(page.getByRole("gridcell")).toHaveCount(169);
  await expect(page.locator(".word-item")).toHaveCount(12);
  await expect(page.locator(".hero-art img")).toBeVisible();
  expect(
    await page
      .locator(".hero-art img")
      .evaluate((img) => img.complete && img.naturalWidth > 0),
  ).toBe(true);
  const puzzle = await currentPuzzle(page);
  await selectByEndpoints(page, puzzle.placements[0]);
  await selectByDrag(page, puzzle.placements[1], true);
  const before = await store(page);
  expect(before.session.found).toHaveLength(2);
  expect(before.profile.words).toBe(2);
  expect(before.session.score).toBe(150);
  await page.screenshot({
    path: resolve(OUTPUT, "game-desktop.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator(".word-item.found")).toHaveCount(2);
  const after = await store(page);
  expect(after.session.seed).toBe(before.session.seed);
  expect(after.session.found).toEqual(before.session.found);
  expect(after.profile.words).toBe(2);
  await page
    .locator(`.word-item[data-word="${puzzle.placements[0].normalized}"]`)
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    puzzle.placements[0].clue,
  );
});

test("pause, dialogs and alternate views stop the research clock", async ({
  page,
}) => {
  const fixed = new Date("2026-10-03T15:00:00-03:00");
  await page.clock.install({ time: fixed });
  await page.clock.pauseAt(new Date(fixed.getTime() + 1_000));
  await loadGame(page);
  const puzzle = await currentPuzzle(page);
  await selectByEndpoints(page, puzzle.placements[0]);
  await page.clock.runFor(2_000);
  await expect(page.locator("#timer-text")).toHaveText("00:02");
  await page
    .getByRole("button", { name: "Pausar experimento", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Intervalo para o café." }),
  ).toBeVisible();
  await page.clock.runFor(5_000);
  await expect(page.locator("#timer-text")).toHaveText("00:02");
  await page
    .getByRole("button", { name: "Continuar experimento", exact: true })
    .last()
    .click();
  await page.clock.runFor(2_000);
  await expect(page.locator("#timer-text")).toHaveText("00:04");
  await page.locator(".how-button").click();
  await page.clock.runFor(3_000);
  await expect(page.locator("#timer-text")).toHaveText("00:04");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await openCatalog(page);
  await page.clock.runFor(3_000);
  await page.locator('.main-nav [data-view="lab"]').click();
  await expect(page.locator("#timer-text")).toHaveText("00:04");
});

test("catalog searches accents, filters categories, saves favorites and opens the selected theme", async ({
  page,
}) => {
  await loadGame(page);
  await openCatalog(page);
  await expect(page.locator(".catalog-grid .theme-card")).toHaveCount(42);
  await page
    .locator('[data-action="category"][data-category="filosofia"]')
    .click();
  await expect(page.locator(".catalog-grid .theme-card")).toHaveCount(7);
  await page.getByRole("searchbox").fill("filosofos");
  await expect(page.locator(".catalog-grid .theme-card")).toHaveCount(1);
  await expect(page.locator(".catalog-grid h3")).toHaveText(
    "O clube dos filósofos",
  );
  await page.locator('[data-action="category"][data-category="all"]').click();
  await page.getByRole("searchbox").fill("Liga Marvel");
  await expect(page.locator(".catalog-grid .theme-card")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Adicionar aos favoritos: Liga Marvel",
      exact: true,
    })
    .click();
  expect((await store(page)).favorites).toContain("herois-marvel");
  await page.getByRole("searchbox").fill("");
  await page.locator('[data-action="favorites"]').click();
  await expect(page.locator(".catalog-grid .theme-card")).toHaveCount(1);
  await page.reload();
  await openCatalog(page);
  await expect(
    page.getByRole("button", { name: "Remover dos favoritos: Liga Marvel" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .locator('.catalog-grid [data-action="theme"][data-id="herois-marvel"]')
    .click();
  await expect(page.locator(".theme-select strong")).toHaveText("Liga Marvel");
  expect((await store(page)).session.themeId).toBe("herois-marvel");
});

test("all difficulties render the correct board and abandoning an active game requires the explicit UI choice", async ({
  page,
}) => {
  await loadGame(page);
  for (const [difficulty, { size, count }] of Object.entries(DIFFICULTIES)) {
    await page
      .locator(`[data-action="difficulty"][data-difficulty="${difficulty}"]`)
      .click();
    await expect(page.getByRole("gridcell")).toHaveCount(size * size);
    await expect(page.locator(".word-item")).toHaveCount(count);
    await expect(
      page.locator(`[data-difficulty="${difficulty}"]`),
    ).toHaveAttribute("aria-pressed", "true");
  }
  const puzzle = await currentPuzzle(page);
  await selectByEndpoints(page, puzzle.placements[0]);
  const seed = (await store(page)).session.seed;
  await page
    .getByRole("button", { name: "Novo experimento", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Trocar de pesquisa?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continuar este", exact: true })
    .click();
  expect((await store(page)).session.seed).toBe(seed);
  await expect(page.locator(".word-item.found")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Novo experimento", exact: true })
    .click();
  await page.getByRole("button", { name: "Começar o novo" }).click();
  expect((await store(page)).session.seed).not.toBe(seed);
  await expect(page.locator(".word-item.found")).toHaveCount(0);
  expect((await store(page)).profile.words).toBe(1);
});

test("custom themes validate their title and cannot crash when long words are switched to a smaller board", async ({
  page,
}) => {
  await loadGame(page);
  await openCatalog(page);
  await page.getByRole("button", { name: "Criar meu tema" }).click();
  await page.getByLabel("Nome do experimento").fill("   ");
  await page
    .getByLabel("Palavras (uma por linha ou separadas por vírgula)")
    .fill(
      [
        "Industrialização",
        "Existencialismo",
        "Eletromagnetismo",
        "Responsabilidade",
        "Desenvolvimento",
        "Extraordinário",
        "Interplanetário",
        "Biodiversidade",
      ].join("\n"),
    );
  await page
    .getByRole("button", { name: "Criar experimento", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Dê um nome ao seu experimento.",
  );
  await page
    .getByLabel("Nome do experimento")
    .fill("Meu laboratório de palavras longas");
  await page
    .getByRole("button", { name: "Criar experimento", exact: true })
    .click();
  await expect(page.locator(".theme-select strong")).toHaveText(
    "Meu laboratório de palavras longas",
  );
  await expect(page.getByRole("gridcell")).toHaveCount(256);
  const original = (await store(page)).session;
  expect(original.difficulty).toBe("hard");
  await page.locator('[data-difficulty="easy"]').click();
  await expect(page.getByRole("status")).toContainText(
    "Este tema precisa de um tabuleiro maior.",
  );
  expect((await store(page)).session.seed).toBe(original.seed);
  await expect(page.getByRole("gridcell")).toHaveCount(256);
  const puzzle = await currentPuzzle(page);
  await selectByEndpoints(page, puzzle.placements[0]);
  await page.locator('[data-difficulty="medium"]').click();
  await page.getByRole("button", { name: "Começar o novo" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Este tema precisa de um tabuleiro maior.",
  );
  await expect(page.locator(".word-item.found")).toHaveCount(1);
  expect((await store(page)).session.seed).toBe(original.seed);
  await page.reload();
  await expect(page.locator(".theme-select strong")).toHaveText(
    original.customTheme.title,
  );
  await expect(page.locator(".word-item.found")).toHaveCount(1);
});

test("the board supports keyboard navigation, cancellation and selecting both ends", async ({
  page,
}) => {
  await loadGame(page);
  await page.locator('[data-difficulty="easy"]').click();
  const puzzle = await currentPuzzle(page);
  const placement = puzzle.placements[0];
  await page
    .getByRole("button", { name: "Pausar experimento", exact: true })
    .focus();
  await page.keyboard.press("Tab");
  await expect(cell(page, { row: 0, col: 0 })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(cell(page, { row: 0, col: 0 })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".letter-cell.selecting")).toHaveCount(0);
  let cursor = { row: 0, col: 0 };
  async function moveTo(target) {
    for (const axis of ["row", "col"]) {
      const positive = axis === "row" ? "ArrowDown" : "ArrowRight";
      const negative = axis === "row" ? "ArrowUp" : "ArrowLeft";
      while (cursor[axis] !== target[axis]) {
        const step = target[axis] > cursor[axis] ? 1 : -1;
        await page.keyboard.press(step > 0 ? positive : negative);
        cursor[axis] += step;
      }
    }
    await expect(cell(page, target)).toBeFocused();
  }
  await moveTo(placement.cells[0]);
  await page.keyboard.press("Enter");
  await moveTo(placement.cells.at(-1));
  await page.keyboard.press("Space");
  await expect(
    page.locator(`.word-item[data-word="${placement.normalized}"]`),
  ).toHaveClass(/found/);
  expect((await store(page)).session.found).toEqual([placement.normalized]);
});

test("completing a puzzle awards XP and achievements exactly once across reloads", async ({
  page,
}) => {
  await loadGame(page);
  await page.locator('[data-difficulty="easy"]').click();
  await solveCurrentGame(page);
  const completed = await store(page);
  expect(completed.session.completed).toBe(true);
  expect(completed.session.earnedXP).toBe(475);
  expect(completed.profile).toMatchObject({ xp: 475, wins: 1, words: 8 });
  expect(completed.profile.history).toHaveLength(1);
  expect(completed.profile.achievements).toEqual(
    expect.arrayContaining(["first", "nohint"]),
  );
  await expect(page.locator(".result-stats")).toContainText("+475");
  await page.reload();
  await expect(page.locator(".word-item.found")).toHaveCount(8);
  await page.getByRole("button", { name: "Ver resultado" }).click();
  await expect(page.locator(".result-stats")).toContainText("+475");
  const restored = await store(page);
  expect(restored.profile).toEqual(completed.profile);
  await page.getByRole("button", { name: "Meu caderno", exact: true }).click();
  await expect(page.locator(".history-item")).toHaveCount(1);
  await expect(page.locator(".achievement.unlocked")).toHaveCount(2);
  await expect(page.locator(".discovery-entries article")).toHaveCount(8);
});

test("the daily challenge is deterministic and awards its daily bonus only once", async ({
  page,
  browser,
}) => {
  const fixed = new Date("2026-10-03T15:00:00-03:00");
  await page.clock.install({ time: fixed });
  await loadGame(page);
  await page.locator('[data-action="daily"]').click();
  const original = (await store(page)).session;
  expect(original).toMatchObject({
    mode: "daily",
    difficulty: "medium",
    day: "2026-10-03",
    seed: "lexicon-daily-2026-10-03",
  });
  const letters = await page.getByRole("gridcell").allTextContents();
  const otherContext = await browser.newContext({
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  try {
    const other = await otherContext.newPage();
    await other.clock.install({ time: fixed });
    await other.goto("http://127.0.0.1:5184");
    await other.getByRole("button", { name: "Entrar como Daniel" }).click();
    await other.locator('[data-action="daily"]').click();
    expect((await store(other)).session.seed).toBe(original.seed);
    expect((await store(other)).session.themeId).toBe(original.themeId);
    expect(await other.getByRole("gridcell").allTextContents()).toEqual(
      letters,
    );
  } finally {
    await otherContext.close();
  }
  await solveCurrentGame(page);
  const completed = await store(page);
  expect(completed.session.earnedXP).toBe(1_125);
  expect(completed.profile).toMatchObject({
    xp: 1_125,
    wins: 1,
    words: 12,
    dailyDays: ["2026-10-03"],
  });
  await page.getByRole("button", { name: "Próxima descoberta" }).click();
  await page.locator('[data-action="daily"]').click();
  await expect(
    page.getByRole("heading", { name: "Sua dose de eureka está em dia." }),
  ).toBeVisible();
  expect((await store(page)).profile.xp).toBe(1_125);
  expect((await store(page)).profile.wins).toBe(1);
  await page.reload();
  await page.locator('[data-action="daily"]').click();
  await expect(
    page.getByRole("heading", { name: "Sua dose de eureka está em dia." }),
  ).toBeVisible();
  expect((await store(page)).profile).toEqual(completed.profile);
});

test("hints rotate between unfound words, survive reload and stop at three; focus and sound remain usable", async ({
  page,
}) => {
  await loadGame(page);
  await page.getByRole("button", { name: "Ativar sons", exact: true }).click();
  expect((await store(page)).settings.sound).toBe(true);
  await page.getByRole("button", { name: "Ampliar tabuleiro", exact: true }).click();
  await expect(page.locator(".workbench")).toHaveClass(/focus-mode/);
  const puzzle = await currentPuzzle(page);
  await selectByEndpoints(page, puzzle.placements[0]);
  await expect(page.locator(".workbench")).toHaveClass(/focus-mode/);
  await expect(page.locator(".controls-panel")).toBeHidden();
  const observedHints = [];

  async function requestHint(expectedCount) {
    await page.locator('[data-action="hint"]').click();
    const { session } = await store(page);
    expect(session.hintsUsed).toBe(expectedCount);
    expect(session.score).toBe(Math.max(0, 75 - expectedCount * 25));
    expect(session.hintedWords).toHaveLength(expectedCount);
    const hintedWord = session.hintedWords.at(-1);
    expect(observedHints).not.toContain(hintedWord);
    expect(session.found).not.toContain(hintedWord);
    observedHints.push(hintedWord);
    const placement = puzzle.placements.find(
      ({ normalized }) => normalized === hintedWord,
    );
    expect(placement, "The hint must refer to a real answer.").toBeTruthy();
    expect(session.hintCell).toEqual(placement.cells[0]);
    await expect(cell(page, placement.cells[0])).toHaveClass(/hinted/);
    await expect(page.locator(".letter-cell.hinted")).toHaveCount(1);
    await expect(page.getByRole("status")).toContainText(placement.word);
    await expect(page.locator('[data-action="hint"]')).toContainText(
      `${3 - expectedCount}/3 dicas`,
    );
    return session;
  }

  await requestHint(1);
  const beforeReload = await requestHint(2);
  await page.reload();
  await expect(page.getByRole("button", { name: "Desativar sons", exact: true })).toBeVisible();
  expect((await store(page)).settings.sound).toBe(true);
  expect((await store(page)).session.hintedWords).toEqual(observedHints);
  await expect(cell(page, beforeReload.hintCell)).toHaveClass(/hinted/);
  await expect(page.locator(".letter-cell.hinted")).toHaveCount(1);
  await expect(page.locator('[data-action="hint"]')).toContainText("1/3 dicas");
  await requestHint(3);
  await expect(page.locator('[data-action="hint"]')).toBeDisabled();
  expect(new Set(observedHints).size).toBe(3);
  await page.getByRole("button", { name: "Desativar sons", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Ativar sons", exact: true })).toBeVisible();
  await expect(page.locator('[data-action="hint"]')).toBeDisabled();
  expect((await store(page)).session.hintsUsed).toBe(3);
  expect((await store(page)).settings.sound).toBe(false);
});

test.describe("mobile", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  test("small viewports stay within the screen and real touch endpoints find words", async ({
    page,
  }) => {
    await loadGame(page);
    const assertNoOverflow = async () => {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
    };
    await assertNoOverflow();
    await page.setViewportSize({ width: 320, height: 740 });
    await assertNoOverflow();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-difficulty="easy"]').tap();
    const puzzle = await currentPuzzle(page);
    await selectByEndpoints(page, puzzle.placements[0], {
      touch: true,
      reverse: true,
    });
    expect((await store(page)).session.found).toEqual([
      puzzle.placements[0].normalized,
    ]);
    await page.screenshot({
      path: resolve(OUTPUT, "game-mobile.png"),
      fullPage: true,
    });
    await openCatalog(page);
    await assertNoOverflow();
    await page.getByRole("button", { name: "Criar meu tema" }).tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    await assertNoOverflow();
    await page.getByRole("button", { name: "Fechar", exact: true }).tap();
    await page.locator('.main-nav [data-view="discoveries"]').tap();
    await assertNoOverflow();
  });
});
