import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildDirectory, buildEnvironment, exampleDirectory, run } from './common.mjs';

const env = buildEnvironment();
const output = buildDirectory('android');
const architecture =
  process.env.E2E_ANDROID_ARCH ?? (process.arch === 'arm64' ? 'arm64-v8a' : 'x86_64');

run('pnpm', ['exec', 'expo', 'prebuild', '--platform', 'android', '--no-install'], {
  cwd: exampleDirectory,
  env,
});
run(
  './gradlew',
  [
    'assembleRelease',
    '--no-daemon',
    '--console=plain',
    `-PreactNativeArchitectures=${architecture}`,
  ],
  { cwd: resolve(exampleDirectory, 'android'), env },
);
copyFileSync(
  resolve(exampleDirectory, 'android/app/build/outputs/apk/release/app-release.apk'),
  resolve(output, 'viewer.apk'),
);
console.log(`E2E APK: ${resolve(output, 'viewer.apk')} (${architecture})`);
