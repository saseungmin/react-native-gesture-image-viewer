import { cpSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildDirectory, buildEnvironment, exampleDirectory, run } from './common.mjs';

if (process.platform !== 'darwin') throw new Error('iOS builds require macOS and Xcode.');
const env = buildEnvironment();
const output = buildDirectory('ios');
const derivedData = resolve(output, 'DerivedData');

run('pnpm', ['exec', 'expo', 'prebuild', '--platform', 'ios', '--no-install'], {
  cwd: exampleDirectory,
  env,
});
run('pod', ['install'], { cwd: resolve(exampleDirectory, 'ios'), env });
run(
  'xcodebuild',
  [
    '-workspace',
    resolve(exampleDirectory, 'ios/GIVE.xcworkspace'),
    '-scheme',
    'GIVE',
    '-configuration',
    'Release',
    '-sdk',
    'iphonesimulator',
    '-destination',
    'generic/platform=iOS Simulator',
    '-derivedDataPath',
    derivedData,
    `ARCHS=${process.arch === 'arm64' ? 'arm64' : 'x86_64'}`,
    'CODE_SIGNING_ALLOWED=NO',
    'build',
  ],
  { cwd: exampleDirectory, env },
);
cpSync(
  resolve(derivedData, 'Build/Products/Release-iphonesimulator/GIVE.app'),
  resolve(output, 'GIVE.app'),
  {
    recursive: true,
    force: true,
  },
);
console.log(`E2E simulator app: ${resolve(output, 'GIVE.app')}`);
