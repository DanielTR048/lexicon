/** Pure, deterministic word-search rules shared by the game and its tests. */
export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ label: "Aprendiz", size: 10, count: 8 }),
  medium: Object.freeze({ label: "Pesquisador", size: 13, count: 12 }),
  hard: Object.freeze({ label: "Gênio", size: 16, count: 16 }),
});

const FORWARD_DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
];
const ALL_DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
  [0, -1],
  [-1, 0],
  [-1, -1],
  [1, -1],
];
const FILLER_LETTERS = "AAAAAAAABCDEEEEEEEFGHIIIIIIJLMNNOOOOOOPQRSTUUUVXZ";

export function normalizeWord(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/** FNV-1a followed by Mulberry32: stable across browsers and Node. */
export function seededRandom(seed) {
  let state = 2166136261;
  for (const character of String(seed)) {
    state ^= character.codePointAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function emptyGrid(size) {
  return Array.from({ length: size }, () => Array(size).fill(""));
}

function pathKey(cells) {
  const first = cells[0];
  const last = cells[cells.length - 1];
  return [`${first.row},${first.col}`, `${last.row},${last.col}`]
    .sort()
    .join(":");
}

function writePlacement(grid, entry, cells) {
  cells.forEach(({ row, col }, index) => {
    grid[row][col] = entry.normalized[index];
  });
  return { ...entry, cells };
}

function tryCrosswordLayout(entries, size, directions, random) {
  const grid = emptyGrid(size);
  const placements = [];
  const occupiedPaths = new Set();
  // Long words have fewer legal positions, so reserve their space first.
  const ordered = [...entries].sort(
    (a, b) => b.normalized.length - a.normalized.length,
  );

  for (const entry of ordered) {
    let best = null;
    for (const [rowStep, colStep] of directions) {
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          const endRow = row + rowStep * (entry.normalized.length - 1);
          const endCol = col + colStep * (entry.normalized.length - 1);
          if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size)
            continue;

          const cells = [];
          let overlaps = 0;
          let fits = true;
          for (let index = 0; index < entry.normalized.length; index += 1) {
            const nextRow = row + rowStep * index;
            const nextCol = col + colStep * index;
            const letter = grid[nextRow][nextCol];
            if (letter && letter !== entry.normalized[index]) {
              fits = false;
              break;
            }
            if (letter) overlaps += 1;
            cells.push({ row: nextRow, col: nextCol });
          }
          if (!fits || occupiedPaths.has(pathKey(cells))) continue;
          const score = overlaps * 2 + random() * 3;
          if (!best || score > best.score) best = { cells, score };
        }
      }
    }
    if (!best) return null;
    occupiedPaths.add(pathKey(best.cells));
    placements.push(writePlacement(grid, entry, best.cells));
  }
  return { grid, placements };
}

/**
 * A separate row per word guarantees a complete board even for adversarial
 * word lists. Every built-in difficulty deliberately has count <= size.
 */
function guaranteedLayout(entries, size, allowReverse, random) {
  const grid = emptyGrid(size);
  const rows = shuffle(
    Array.from({ length: size }, (_, row) => row),
    random,
  );
  const placements = entries.map((entry, index) => {
    const reverse = allowReverse && random() < 0.5;
    const offset = Math.floor(random() * (size - entry.normalized.length + 1));
    const cells = Array.from(
      { length: entry.normalized.length },
      (_, letterIndex) => ({
        row: rows[index],
        col:
          offset +
          (reverse ? entry.normalized.length - 1 - letterIndex : letterIndex),
      }),
    );
    return writePlacement(grid, entry, cells);
  });
  return { grid, placements };
}

export function generatePuzzle({ words, difficulty = "medium", seed } = {}) {
  if (!Object.hasOwn(DIFFICULTIES, difficulty)) {
    throw new Error(
      "Dificuldade inválida. Escolha Aprendiz, Pesquisador ou Gênio.",
    );
  }
  const { size, count } = DIFFICULTIES[difficulty];
  const seen = new Set();
  const fitting = [];
  for (const item of Array.isArray(words) ? words : []) {
    if (!item || typeof item.word !== "string") continue;
    const normalized = normalizeWord(item.word);
    if (!normalized || normalized.length > size || seen.has(normalized))
      continue;
    seen.add(normalized);
    fitting.push({
      word: item.word.trim(),
      normalized,
      clue: String(item.clue ?? ""),
    });
  }
  if (fitting.length < 4) {
    throw new Error(
      `O tema precisa de pelo menos 4 palavras diferentes com até ${size} letras para esta dificuldade.`,
    );
  }

  const actualSeed = String(seed ?? `${Date.now()}-${Math.random()}`);
  const random = seededRandom(actualSeed);
  const selected = shuffle(fitting, random).slice(0, count);
  const directions =
    difficulty === "easy" ? FORWARD_DIRECTIONS : ALL_DIRECTIONS;
  let layout = null;
  for (let attempt = 0; attempt < 6 && !layout; attempt += 1) {
    layout = tryCrosswordLayout(selected, size, directions, random);
  }
  layout ??= guaranteedLayout(selected, size, difficulty !== "easy", random);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      layout.grid[row][col] ||=
        FILLER_LETTERS[Math.floor(random() * FILLER_LETTERS.length)];
    }
  }

  // Keep the word list in its seeded order, independent of placement strategy.
  const placementsByWord = new Map(
    layout.placements.map((entry) => [entry.normalized, entry]),
  );
  return {
    size,
    grid: layout.grid,
    placements: selected.map((entry) => placementsByWord.get(entry.normalized)),
    seed: actualSeed,
    difficulty,
  };
}

function validCell(cell) {
  return (
    cell &&
    Number.isSafeInteger(cell.row) &&
    Number.isSafeInteger(cell.col) &&
    cell.row >= 0 &&
    cell.col >= 0
  );
}

/** Returns only horizontal, vertical, or 45-degree diagonal selections. */
export function getLine(start, end) {
  if (!validCell(start) || !validCell(end)) return [];
  const rowDistance = end.row - start.row;
  const colDistance = end.col - start.col;
  if (
    rowDistance &&
    colDistance &&
    Math.abs(rowDistance) !== Math.abs(colDistance)
  )
    return [];
  const steps = Math.max(Math.abs(rowDistance), Math.abs(colDistance));
  const rowStep = Math.sign(rowDistance);
  const colStep = Math.sign(colDistance);
  return Array.from({ length: steps + 1 }, (_, index) => ({
    row: start.row + index * rowStep,
    col: start.col + index * colStep,
  }));
}

/**
 * The optional board also accepts genuine occurrences created incidentally by
 * crossings or filler letters. Returned cells always read the answer forwards,
 * so callers can save and highlight the occurrence the player actually found.
 */
export function matchSelection(cells, placements, foundWords = [], grid) {
  if (!Array.isArray(cells) || !cells.length || !cells.every(validCell))
    return null;
  const found = new Set(Array.from(foundWords, normalizeWord));
  const sameCell = (a, b) => a.row === b.row && a.col === b.col;
  const distance = Math.max(
    Math.abs(cells[0].row - cells.at(-1).row),
    Math.abs(cells[0].col - cells.at(-1).col),
  );
  if (distance !== cells.length - 1) return null;
  const line = getLine(cells[0], cells.at(-1));
  if (
    line.length !== cells.length ||
    !line.every((cell, index) => sameCell(cell, cells[index]))
  )
    return null;
  let forward;
  let reverse;
  if (Array.isArray(grid)) {
    const letters = cells.map(({ row, col }) => grid[row]?.[col]);
    if (
      !letters.every(
        (letter) => typeof letter === "string" && /^[A-Z]$/.test(letter),
      )
    )
      return null;
    forward = letters.join("");
    reverse = [...letters].reverse().join("");
  }
  const original = placements.find((placement) => {
    if (
      found.has(placement.normalized) ||
      placement.cells.length !== cells.length
    )
      return false;
    if (
      Array.isArray(grid) &&
      placement.normalized !== forward &&
      placement.normalized !== reverse
    )
      return false;
    return (
      cells.every((cell, index) => sameCell(cell, placement.cells[index])) ||
      cells.every((cell, index) =>
        sameCell(cell, placement.cells[cells.length - 1 - index]),
      )
    );
  });
  if (original) return original;
  if (!Array.isArray(grid)) return null;

  const available = placements.filter(
    (placement) => !found.has(placement.normalized),
  );
  const placement =
    available.find((entry) => entry.normalized === forward) ??
    available.find((entry) => entry.normalized === reverse);
  if (!placement) return null;
  const orientedCells =
    placement.normalized === forward ? cells : [...cells].reverse();
  return {
    ...placement,
    cells: orientedCells.map(({ row, col }) => ({ row, col })),
  };
}
