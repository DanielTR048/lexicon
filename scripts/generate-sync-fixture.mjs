import fs from 'node:fs';
import { THEMES } from '../src/data.js';
import { generatePuzzle } from '../src/engine.js';
import { emptyProfile } from '../src/storage.js';

const theme = THEMES[0];
const puzzle = generatePuzzle({ words: theme.words, difficulty: 'easy', seed: 'lexicon-cross-platform-v1' });
const word = puzzle.placements[0];
const save = {
  version: 1, profile: { ...emptyProfile(), words: 1, discoveries: [{ word: word.word, clue: word.clue, themeTitle: theme.title }] },
  settings: { sound: true, haptics: true, reduceMotion: false }, favorites: [theme.id], selectedDifficulty: 'easy',
  session: { themeId: theme.id, seed: puzzle.seed, difficulty: 'easy', found: [word.normalized], foundPaths: { [word.normalized]: word.cells }, hintedWords: [], hintsUsed: 0, seconds: 17, score: 50, earnedXP: 0, mode: 'free', day: '2026-10-04', paused: true, started: true, completed: false },
};
const folder = 'android-native/app/src/test/resources';
fs.mkdirSync(folder, { recursive: true });
fs.writeFileSync(folder + '/cloud-web-save.json', JSON.stringify({ save, grid: puzzle.grid, placements: puzzle.placements }, null, 2) + '\n');
console.log('Fixture web/Android atualizada.');
