import { access, copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const apk = new URL('output/Lexicon-Android-release.apk', root);
await access(apk).catch(() => { throw new Error('Gere primeiro o APK com android-native/BUILD-ANDROID.ps1 -Release.'); });
const build = spawnSync(process.execPath, [fileURLToPath(new URL('node_modules/vite/bin/vite.js', root)), 'build'], {
  cwd: fileURLToPath(root), stdio: 'inherit',
  env: { ...process.env, VITE_ANDROID_APK_URL: './android/lexicon.apk' },
});
if (build.status !== 0) process.exit(build.status || 1);
// The APK is an explicit download, excluded from the browser's offline precache.
await mkdir(new URL('dist/android/', root), { recursive: true });
await copyFile(apk, new URL('dist/android/lexicon.apk', root));
console.log('Site em dist/ com botão Baixar Android e APK assinado incluído.');
