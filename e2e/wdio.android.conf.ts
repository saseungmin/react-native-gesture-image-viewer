import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { appId, e2eDirectory, sharedConfig } from './wdio.shared.conf.js';

const app = resolve(process.env.E2E_APP_PATH ?? resolve(e2eDirectory, 'build/android/viewer.apk'));
if (!existsSync(app)) throw new Error('Build the E2E APK first: npm run build:android');
if (!process.env.E2E_DEVICE_UDID)
  throw new Error('Set E2E_DEVICE_UDID to the target Android emulator serial.');

export const config: WebdriverIO.Config = {
  ...sharedConfig,
  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:app': app,
      'appium:appPackage': appId,
      'appium:appActivity': '.MainActivity',
      'appium:udid': process.env.E2E_DEVICE_UDID,
      'appium:autoGrantPermissions': true,
      'appium:newCommandTimeout': 120,
      'appium:noReset': false,
    },
  ],
};
