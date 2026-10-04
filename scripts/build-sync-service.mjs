import { copyFile, mkdir, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
await mkdir(new URL('dist/server/', root), { recursive: true });
await mkdir(new URL('dist/.openai/', root), { recursive: true });
await copyFile(new URL('sync-service/worker.js', root), new URL('dist/server/index.js', root));
await copyFile(new URL('.openai/hosting.json', root), new URL('dist/.openai/hosting.json', root));
await writeFile(new URL('dist/server/package.json', root), '{"type":"module"}\n');
console.log('Serviço de sincronização preparado em dist/server.');
