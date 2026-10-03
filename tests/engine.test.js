import test from "node:test";
import assert from "node:assert/strict";
import {
  DIFFICULTIES,
  generatePuzzle,
  getLine,
  matchSelection,
  normalizeWord,
  seededRandom,
} from "../src/engine.js";

const WORDS = [
  "Relatividade",
  "Gravidade",
  "Fóton",
  "Einstein",
  "Newton",
  "Galáxia",
  "Quântico",
  "Átomo",
  "Hipótese",
  "Ciência",
  "Elétron",
  "Próton",
  "Nêutron",
  "Cosmos",
  "Energia",
  "Órbita",
  "Teorema",
  "Molécula",
  "Frequência",
  "Espectro",
  "Tensão",
  "Magnetismo",
  "Inércia",
  "Matéria",
].map((word) => ({ word, clue: `Pista de ${word}.` }));

function assertValidPuzzle(puzzle, expectedCount) {
  const { size, grid, placements } = puzzle;
  assert.equal(grid.length, size);
  assert.ok(
    grid.every(
      (row) =>
        row.length === size && row.every((letter) => /^[A-Z]$/.test(letter)),
    ),
  );
  assert.equal(placements.length, expectedCount);
  assert.equal(
    new Set(placements.map(({ normalized }) => normalized)).size,
    expectedCount,
  );
  const paths = new Set();
  for (const placement of placements) {
    assert.equal(placement.cells.length, placement.normalized.length);
    assert.equal(
      placement.cells.map(({ row, col }) => grid[row][col]).join(""),
      placement.normalized,
    );
    assert.deepEqual(
      getLine(placement.cells[0], placement.cells.at(-1)),
      placement.cells,
    );
    const path = [placement.cells[0], placement.cells.at(-1)]
      .map(({ row, col }) => `${row},${col}`)
      .sort()
      .join(":");
    assert.ok(
      !paths.has(path),
      `Two answers cannot occupy the same selectable path: ${path}`,
    );
    paths.add(path);
    assert.equal(matchSelection(placement.cells, placements), placement);
    assert.equal(
      matchSelection([...placement.cells].reverse(), placements),
      placement,
    );
    assert.equal(
      matchSelection(placement.cells, placements, [placement.normalized]),
      null,
    );
    if (puzzle.difficulty === "easy") {
      assert.ok(placement.cells.at(-1).row >= placement.cells[0].row);
      assert.ok(placement.cells.at(-1).col >= placement.cells[0].col);
    }
  }
}

test("normalization strips accents, spaces, punctuation and digits", () => {
  assert.equal(
    normalizeWord("  Gênio: Ciência, Época & ação 1950! "),
    "GENIOCIENCIAEPOCAACAO",
  );
  assert.equal(normalizeWord("Homem-Aranha"), "HOMEMARANHA");
  assert.equal(normalizeWord("a\u0301gua"), "AGUA");
  assert.equal(normalizeWord(null), "");
});

test("seeded random is deterministic and always between zero and one", () => {
  const first = seededRandom("laboratório");
  const second = seededRandom("laboratório");
  const third = seededRandom("outra semente");
  const values = Array.from({ length: 100 }, () => first());
  assert.deepEqual(
    values,
    Array.from({ length: 100 }, () => second()),
  );
  assert.notDeepEqual(
    values,
    Array.from({ length: 100 }, () => third()),
  );
  assert.ok(values.every((value) => value >= 0 && value < 1));
});

test("same seed reproduces the exact puzzle without modifying source data", () => {
  const original = structuredClone(WORDS);
  const first = generatePuzzle({
    words: WORDS,
    difficulty: "hard",
    seed: "invenção-42",
  });
  const second = generatePuzzle({
    words: WORDS,
    difficulty: "hard",
    seed: "invenção-42",
  });
  assert.deepEqual(first, second);
  assert.deepEqual(WORDS, original);
  assert.notDeepEqual(
    first.grid,
    generatePuzzle({ words: WORDS, difficulty: "hard", seed: "invenção-43" })
      .grid,
  );
});

for (const difficulty of Object.keys(DIFFICULTIES)) {
  test(`${difficulty}: complete, selectable, correct puzzles for 60 seeds`, () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const puzzle = generatePuzzle({
        words: WORDS,
        difficulty,
        seed: `stress-${seed}`,
      });
      assertValidPuzzle(puzzle, DIFFICULTIES[difficulty].count);
    }
  });
}

test("duplicate normalized words and words exceeding the board are excluded", () => {
  const words = [
    { word: "Átomo", clue: "primeira pista" },
    { word: "ATOMO", clue: "duplicada" },
    { word: "Ciência" },
    { word: "Newton" },
    { word: "Fóton" },
    { word: "Anticonstitucionalissimamente" },
    { word: "123--" },
    null,
  ];
  const puzzle = generatePuzzle({ words, difficulty: "easy", seed: "filtrar" });
  assertValidPuzzle(puzzle, 4);
  assert.equal(
    puzzle.placements.find(({ normalized }) => normalized === "ATOMO").clue,
    "primeira pista",
  );
});

test("invalid configuration produces clear errors", () => {
  assert.throws(
    () => generatePuzzle({ words: WORDS, difficulty: "impossível" }),
    /Dificuldade inválida/,
  );
  assert.throws(
    () => generatePuzzle({ words: [{ word: "Átomo" }, { word: "átomo" }] }),
    /pelo menos 4/,
  );
  assert.throws(() => generatePuzzle(), /pelo menos 4/);
});

test("adversarial full-width answers are never silently dropped", () => {
  for (const [difficulty, { size, count }] of Object.entries(DIFFICULTIES)) {
    const words = Array.from({ length: count }, (_, index) => ({
      word: String.fromCharCode(65 + index).repeat(size),
      clue: "Palavra no limite da grade.",
    }));
    for (let seed = 0; seed < 12; seed += 1) {
      assertValidPuzzle(
        generatePuzzle({ words, difficulty, seed: `limite-${seed}` }),
        count,
      );
    }
  }
});

test("getLine handles both directions, diagonals and single cells", () => {
  assert.deepEqual(getLine({ row: 1, col: 1 }, { row: 1, col: 3 }), [
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 1, col: 3 },
  ]);
  assert.deepEqual(getLine({ row: 3, col: 2 }, { row: 1, col: 0 }), [
    { row: 3, col: 2 },
    { row: 2, col: 1 },
    { row: 1, col: 0 },
  ]);
  assert.deepEqual(getLine({ row: 0, col: 3 }, { row: 2, col: 1 }), [
    { row: 0, col: 3 },
    { row: 1, col: 2 },
    { row: 2, col: 1 },
  ]);
  assert.deepEqual(getLine({ row: 2, col: 2 }, { row: 2, col: 2 }), [
    { row: 2, col: 2 },
  ]);
  assert.deepEqual(getLine({ row: 0, col: 0 }, { row: 2, col: 1 }), []);
  assert.deepEqual(getLine({ row: -1, col: 0 }, { row: 2, col: 0 }), []);
  assert.deepEqual(getLine(null, { row: 2, col: 0 }), []);
  assert.deepEqual(getLine({ row: 0.5, col: 0 }, { row: 2, col: 0 }), []);
});

test("selection rejects partial, reordered and already found answers", () => {
  const placement = {
    word: "Lua",
    normalized: "LUA",
    clue: "Satélite",
    cells: getLine({ row: 0, col: 0 }, { row: 2, col: 2 }),
  };
  assert.equal(matchSelection(placement.cells.slice(0, 2), [placement]), null);
  assert.equal(
    matchSelection(
      [placement.cells[0], placement.cells[2], placement.cells[1]],
      [placement],
    ),
    null,
  );
  assert.equal(
    matchSelection([...placement.cells].reverse(), [placement]),
    placement,
  );
  assert.equal(
    matchSelection(placement.cells, [placement], new Set(["LUA"])),
    null,
  );
  assert.equal(matchSelection([], [placement]), null);
  assert.equal(matchSelection([null], [placement]), null);
});

test("optional grid accepts an incidental answer and returns its actual path", () => {
  const grid = [
    ["L", "U", "A", "X"],
    ["X", "X", "X", "X"],
    ["A", "U", "L", "X"],
    ["X", "X", "X", "X"],
  ];
  const placement = {
    word: "Lua",
    normalized: "LUA",
    clue: "Satélite natural",
    cells: getLine({ row: 0, col: 0 }, { row: 0, col: 2 }),
  };
  const incidental = getLine({ row: 2, col: 2 }, { row: 2, col: 0 });
  assert.equal(matchSelection(incidental, [placement]), null);
  const match = matchSelection(incidental, [placement], [], grid);
  assert.deepEqual(match, { ...placement, cells: incidental });
  assert.deepEqual(
    matchSelection([...incidental].reverse(), [placement], [], grid),
    match,
  );
  assert.equal(
    match.cells.map(({ row, col }) => grid[row][col]).join(""),
    placement.normalized,
  );
  assert.notEqual(
    match.cells,
    incidental,
    "The result must not reuse mutable caller arrays",
  );
  assert.deepEqual(
    placement.cells,
    getLine({ row: 0, col: 0 }, { row: 0, col: 2 }),
    "Matching must not mutate the original placement",
  );
  assert.equal(
    matchSelection(placement.cells, [placement], [], grid),
    placement,
    "Original paths retain their previous behavior",
  );
  assert.equal(matchSelection(incidental, [placement], ["LUA"], grid), null);
});

test("grid matching rejects non-contiguous, bent, repeated, partial and out-of-bounds paths", () => {
  const grid = [
    ["L", "X", "U", "A"],
    ["X", "U", "X", "X"],
    ["X", "X", "A", "X"],
    ["X", "X", "X", "X"],
  ];
  const placement = {
    word: "Lua",
    normalized: "LUA",
    clue: "Satélite",
    cells: getLine({ row: 3, col: 0 }, { row: 3, col: 2 }),
  };
  const invalidPaths = [
    [
      { row: 0, col: 0 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ],
    [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
      { row: 0, col: 3 },
    ],
    [
      { row: 0, col: 0 },
      { row: 0, col: 0 },
      { row: 0, col: 0 },
    ],
    [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    ],
    [
      { row: 0, col: 2 },
      { row: 1, col: 3 },
      { row: 2, col: 4 },
    ],
  ];
  for (const cells of invalidPaths)
    assert.equal(matchSelection(cells, [placement], [], grid), null);
  assert.equal(
    matchSelection(placement.cells, [placement], [], grid),
    null,
    "When given a grid, stale placement coordinates cannot bypass letter validation",
  );
  const diagonal = getLine({ row: 0, col: 0 }, { row: 2, col: 2 });
  assert.deepEqual(
    matchSelection(diagonal, [placement], [], grid).cells,
    diagonal,
  );
});
