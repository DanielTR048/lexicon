import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, THEMES } from "../src/data.js";
import {
  DIFFICULTIES,
  generatePuzzle,
  matchSelection,
  normalizeWord,
} from "../src/engine.js";

const CATEGORY_IDS = [
  "ficcao",
  "historia",
  "filosofia",
  "ciencia",
  "politica",
  "cultura",
];
const COLORS = new Set(["green", "coral", "gold", "blue", "purple"]);
const ICONS = new Set([
  "Atom",
  "Rocket",
  "FlaskConical",
  "Brain",
  "Landmark",
  "BookOpen",
  "Zap",
  "Shield",
  "Sparkles",
  "Skull",
  "Globe",
  "Telescope",
  "Dna",
  "Microscope",
  "Leaf",
  "Compass",
  "Music",
  "Palette",
  "Scroll",
  "Scale",
  "Crown",
  "Orbit",
]);

test("catalog provides the promised breadth and all six thematic categories", () => {
  assert.deepEqual(
    CATEGORIES.map(({ id }) => id).sort(),
    [...CATEGORY_IDS].sort(),
  );
  assert.ok(
    CATEGORIES.every(({ label }) => typeof label === "string" && label.trim()),
  );
  assert.ok(
    THEMES.length >= 40,
    "The built-in library must contain at least 40 themes.",
  );
  assert.ok(
    THEMES.reduce((total, theme) => total + theme.words.length, 0) >= 720,
  );
  assert.equal(new Set(THEMES.map(({ id }) => id)).size, THEMES.length);
  assert.equal(new Set(THEMES.map(({ title }) => title)).size, THEMES.length);
  assert.equal(THEMES[0].id, "mentes-brilhantes");
  for (const { id } of CATEGORIES) {
    assert.ok(
      THEMES.some((theme) => theme.category === id),
      `Empty category: ${id}`,
    );
  }
});

test("every theme has supported metadata and complete, unique educational entries", () => {
  for (const theme of THEMES) {
    assert.match(theme.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(
      CATEGORY_IDS.includes(theme.category),
      `${theme.id}: unknown category`,
    );
    assert.ok(ICONS.has(theme.icon), `${theme.id}: unsupported icon`);
    assert.ok(COLORS.has(theme.color), `${theme.id}: unsupported color`);
    assert.ok(
      typeof theme.description === "string" &&
        theme.description.trim().length > 12,
    );
    assert.ok(
      theme.words.length >= 18,
      `${theme.id}: not enough curated words`,
    );
    const normalized = new Set();
    for (const { word, clue } of theme.words) {
      assert.equal(typeof word, "string", `${theme.id}: invalid display word`);
      assert.equal(word, word.trim(), `${theme.id}: stray word whitespace`);
      assert.equal(typeof clue, "string", `${theme.id}/${word}: missing clue`);
      assert.ok(
        clue.length >= 20,
        `${theme.id}/${word}: incomplete educational clue`,
      );
      assert.ok(
        !/[|\uFFFD]/.test(`${word}${clue}`),
        `${theme.id}/${word}: broken entry encoding`,
      );
      const answer = normalizeWord(word);
      assert.match(
        answer,
        /^[A-Z]{3,16}$/,
        `${theme.id}/${word}: unsuitable board answer`,
      );
      assert.ok(
        !normalized.has(answer),
        `${theme.id}: duplicate normalized word ${answer}`,
      );
      normalized.add(answer);
    }
    assert.ok(
      [...normalized].filter((word) => word.length <= 10).length >= 10,
      `${theme.id}: insufficient variety for the small board`,
    );
    for (const [difficulty, { size, count }] of Object.entries(DIFFICULTIES)) {
      assert.ok(
        [...normalized].filter((word) => word.length <= size).length >= count,
        `${theme.id}/${difficulty}: the theme cannot fill the intended answer list`,
      );
    }
  }
});

for (const [difficulty, { size, count }] of Object.entries(DIFFICULTIES)) {
  test(`${difficulty}: every built-in theme generates a complete, solvable game with its original clues`, () => {
    for (const theme of THEMES) {
      const context = `${theme.id}/${difficulty}`;
      const sourceWords = new Map(
        theme.words.map((entry) => [normalizeWord(entry.word), entry]),
      );
      const puzzle = generatePuzzle({
        words: theme.words,
        difficulty,
        seed: `catalog:${context}`,
      });
      assert.equal(puzzle.size, size, context);
      assert.equal(puzzle.grid.length, size, context);
      assert.ok(
        puzzle.grid.every((row) => row.length === size),
        context,
      );
      assert.equal(
        puzzle.placements.length,
        count,
        `${context}: missing answers`,
      );
      const found = new Set();
      for (const placement of puzzle.placements) {
        const source = sourceWords.get(placement.normalized);
        assert.ok(source, `${context}: an answer was not part of this theme`);
        assert.equal(
          placement.word,
          source.word,
          `${context}: lost display spelling`,
        );
        assert.equal(
          placement.clue,
          source.clue,
          `${context}: incorrect educational clue`,
        );
        assert.equal(
          placement.cells
            .map(({ row, col }) => puzzle.grid[row]?.[col])
            .join(""),
          placement.normalized,
          `${context}: answer is not readable in the grid`,
        );
        const selection = matchSelection(
          placement.cells,
          puzzle.placements,
          found,
        );
        assert.equal(
          selection,
          placement,
          `${context}: an answer cannot be selected`,
        );
        found.add(selection.normalized);
      }
      assert.equal(
        found.size,
        count,
        `${context}: this game cannot be completed`,
      );
    }
  });
}
