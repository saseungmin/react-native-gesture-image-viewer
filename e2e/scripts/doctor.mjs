import { resolve } from 'node:path';

import { e2eDirectory, run } from './common.mjs';

const platform = process.argv[2];
if (!['android', 'ios'].includes(platform)) throw new Error('Expected android or ios.');
if (process.env.APPIUM_HOME) {
  throw new Error(
    'Unset APPIUM_HOME for this command so Appium uses the locked local npm drivers.',
  );
}
run('node', ['--version']);
run('npm', ['--version']);
run(resolve(e2eDirectory, 'node_modules/.bin/appium'), [
  'driver',
  'doctor',
  platform === 'android' ? 'uiautomator2' : 'xcuitest',
]);
if (platform === 'android') {
  const androidSdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (!androidSdk) throw new Error('Set ANDROID_HOME to the Android SDK directory.');
  run('java', ['-version']);
  run(resolve(androidSdk, 'platform-tools/adb'), ['version']);
  run(resolve(androidSdk, 'emulator/emulator'), ['-list-avds']);
} else {
  run('xcodebuild', ['-version']);
  run('xcrun', ['simctl', 'list', 'runtimes']);
}
