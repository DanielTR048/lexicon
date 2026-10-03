import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyProfile,
  localDay,
  readStore,
  streakOf,
  writeStore,
} from "../src/storage.js";

function withStorage(initialValue, callback) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const memory = new Map(
    initialValue === undefined ? [] : [["lexicon-lab-v1", initialValue]],
  );
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
    },
  });
  try {
    return callback(memory);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
}

test("new profiles do not share mutable collections", () => {
  const first = emptyProfile();
  const second = emptyProfile();
  first.discoveries.push({ word: "Átomo", clue: "Unidade da matéria" });
  first.dailyDays.push("2026-10-03");
  assert.equal(second.discoveries.length, 0);
  assert.equal(second.dailyDays.length, 0);
  assert.equal(second.xp, 0);
});

test("missing, unreadable and unsupported saves return a fresh-start signal", () => {
  for (const raw of [
    undefined,
    "",
    "{broken",
    "null",
    "[]",
    "{}",
    '{"version":2}',
    "false",
  ]) {
    withStorage(raw, () => assert.equal(readStore(), null));
  }
});

test("save and restore preserve a session, progress, preferences and favorites", () => {
  const data = {
    profile: { ...emptyProfile(), xp: 240, wins: 1, words: 8 },
    settings: { sound: true },
    favorites: ["mentes-brilhantes"],
    session: {
      themeId: "mentes-brilhantes",
      difficulty: "easy",
      seed: "same-board",
      found: ["CURIE"],
      seconds: 12,
    },
  };
  withStorage(undefined, (memory) => {
    assert.equal(writeStore(data), true);
    assert.equal(JSON.parse(memory.get("lexicon-lab-v1")).version, 1);
    assert.deepEqual(readStore(), { ...data, version: 1 });
  });
});

test("malformed scalar and collection fields receive safe defaults", () => {
  const raw = JSON.stringify({
    version: 1,
    profile: {
      xp: -1,
      wins: "2",
      words: null,
      seconds: -50,
      themes: "x",
      dailyDays: {},
      history: false,
      discoveries: null,
      achievements: 3,
    },
    favorites: "wrong",
  });
  withStorage(raw, () => {
    const saved = readStore();
    assert.deepEqual(saved.profile, emptyProfile());
    assert.deepEqual(saved.favorites, []);
    assert.equal(saved.settings.sound, false);
  });
});

test("malformed nested history and discoveries cannot reach the renderer", () => {
  const history = {
    title: "Universo infinito",
    difficulty: "easy",
    seconds: 90,
    xp: 475,
    mode: "free",
    day: "2026-10-03",
  };
  const discovery = {
    word: "Galáxia",
    clue: "Um grande conjunto de estrelas.",
  };
  const raw = JSON.stringify({
    version: 1,
    profile: {
      history: [null, {}, history],
      discoveries: [null, {}, discovery],
    },
  });
  withStorage(raw, () => {
    const saved = readStore();
    assert.deepEqual(saved.profile.history, [history]);
    assert.deepEqual(saved.profile.discoveries, [discovery]);
  });
});

test("browser storage failures are reported without throwing", () => {
  withStorage(undefined, () => {
    localStorage.getItem = () => {
      throw new Error("SecurityError");
    };
    localStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    assert.equal(readStore(), null);
    assert.equal(writeStore({ profile: emptyProfile() }), false);
  });
});

test("unserializable save data returns failure", () => {
  const cyclic = {};
  cyclic.self = cyclic;
  withStorage(undefined, () => assert.equal(writeStore(cyclic), false));
});

test("localDay follows local calendar fields and pads date components", () => {
  assert.equal(localDay(new Date(2026, 0, 2, 0, 5)), "2026-01-02");
  assert.equal(localDay(new Date(2026, 9, 3, 23, 59)), "2026-10-03");
});

test("streak includes today or yesterday, ignores duplicates and stops at gaps", () => {
  assert.equal(streakOf([], "2026-10-03"), 0);
  assert.equal(streakOf(["2026-10-03"], "2026-10-03"), 1);
  assert.equal(
    streakOf(
      ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-03"],
      "2026-10-03",
    ),
    3,
  );
  assert.equal(streakOf(["2026-10-01", "2026-10-02"], "2026-10-03"), 2);
  assert.equal(streakOf(["2026-10-01"], "2026-10-03"), 0);
  assert.equal(streakOf(["2026-10-01", "2026-10-03"], "2026-10-03"), 1);
  assert.equal(streakOf(["2026-10-04"], "2026-10-03"), 0);
});

test("streak handles year and leap-day boundaries", () => {
  assert.equal(
    streakOf(["2025-12-30", "2025-12-31", "2026-01-01"], "2026-01-01"),
    3,
  );
  assert.equal(
    streakOf(["2024-02-28", "2024-02-29", "2024-03-01"], "2024-03-01"),
    3,
  );
});
