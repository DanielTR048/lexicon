import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { THEMES, CATEGORIES } from '../src/data.js';

const root = new URL('../android-native/app/src/main/', import.meta.url);
await mkdir(new URL('assets/', root), { recursive: true });
await mkdir(new URL('res/drawable-nodpi/', root), { recursive: true });
await writeFile(new URL('assets/catalog.json', root), JSON.stringify({ categories: CATEGORIES, themes: THEMES }, null, 2) + '\n');
await copyFile(new URL('../public/images/lab-genius.png', import.meta.url), new URL('res/drawable-nodpi/lab_genius.png', root));
console.log(`${THEMES.length} temas e ${THEMES.reduce((sum, theme) => sum + theme.words.length, 0)} palavras copiadas para ${fileURLToPath(root)}`);
