import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { appId, e2eDirectory, sharedConfig } from './wdio.shared.conf.js';

const app = resolve(process.env.E2E_APP_PATH ?? resolve(e2eDirectory, 'build/ios/GIVE.app'));
const isCI = process.env.CI === 'true' || process.env.CI === '1';
if (!existsSync(app)) throw new Error('Build the E2E simulator app first: npm run build:ios');
if (!process.env.E2E_DEVICE_UDID)
  throw new Error('Set E2E_DEVICE_UDID to the target iOS simulator UDID.');

export const config: WebdriverIO.Config = {
  ...sharedConfig,
  // Cold simulator/WDA setup on hosted Macs can exceed the normal request window.
  connectionRetryTimeout: isCI ? 300_000 : sharedConfig.connectionRetryTimeout,
  capabilities: [
    {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:app': app,
      'appium:bundleId': appId,
      'appium:udid': process.env.E2E_DEVICE_UDID,
      'appium:newCommandTimeout': 120,
      'appium:noReset': false,
      'appium:isHeadless': isCI,
      'appium:showXcodeLog': isCI,
      'appium:wdaLaunchTimeout': 120_000,
    },
  ],
};
