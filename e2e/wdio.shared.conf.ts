import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { browser } from '@wdio/globals';
import type { Options } from '@wdio/types';

export const e2eDirectory = fileURLToPath(new URL('.', import.meta.url));
export const appId = 'gestureimageviewer.example';
const appiumPort = Number(process.env.E2E_APPIUM_PORT ?? 4723);
if (!Number.isInteger(appiumPort) || appiumPort < 1024 || appiumPort > 65535) {
  throw new Error('E2E_APPIUM_PORT must be an integer between 1024 and 65535.');
}
export const artifactDirectory = process.env.E2E_ARTIFACT_DIR
  ? resolve(process.env.E2E_ARTIFACT_DIR)
  : resolve(e2eDirectory, 'artifacts', new Date().toISOString().replaceAll(':', '-'));
mkdirSync(artifactDirectory, { recursive: true });
// Propagate one run directory to WDIO workers, which load this module again.
process.env.E2E_ARTIFACT_DIR = artifactDirectory;

if (process.env.APPIUM_HOME) {
  throw new Error('Unset APPIUM_HOME: E2E uses the Appium drivers in e2e/package-lock.json.');
}

export const sharedConfig: Omit<Options.Testrunner, 'capabilities'> = {
  runner: 'local',
  hostname: '127.0.0.1',
  port: appiumPort,
  path: '/',
  specs: [[resolve(e2eDirectory, 'specs/*.e2e.ts')]],
  maxInstances: 1,
  logLevel: 'info',
  outputDir: artifactDirectory,
  framework: 'mocha',
  mochaOpts: { ui: 'bdd', timeout: 90_000, retries: 0 },
  specFileRetries: 0,
  waitforTimeout: 15_000,
  connectionRetryTimeout: 180_000,
  connectionRetryCount: 0,
  services: [
    [
      'appium',
      {
        command: resolve(e2eDirectory, 'node_modules/.bin/appium'),
        args: { address: '127.0.0.1', basePath: '/', port: appiumPort },
        logPath: artifactDirectory,
        appiumStartTimeout: 60_000,
      },
    ],
  ],
  reporters: [
    'spec',
    [
      'junit',
      {
        outputDir: artifactDirectory,
        outputFileFormat: ({ cid }: { cid: string }) => `junit-${cid}.xml`,
      },
    ],
  ],
  before: async () => {
    writeFileSync(
      resolve(artifactDirectory, 'session.json'),
      JSON.stringify(
        {
          node: process.version,
          capabilities: browser.capabilities,
          startedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  },
  afterTest: async (test, _context, { passed }) => {
    if (passed) return;
    const name = `${Date.now()}-${test.title.replaceAll(/[^a-zA-Z0-9-]/g, '_')}`;
    const captures = await Promise.allSettled([
      browser.saveScreenshot(resolve(artifactDirectory, `${name}.png`)),
      browser
        .getPageSource()
        .then((xml) => writeFileSync(resolve(artifactDirectory, `${name}.xml`), xml)),
    ]);
    for (const result of captures) {
      if (result.status === 'rejected') console.error('Artifact capture failed:', result.reason);
    }
    try {
      const udid = String(browser.capabilities['appium:udid'] ?? process.env.E2E_DEVICE_UDID ?? '');
      const androidSdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
      const adb = androidSdk ? resolve(androidSdk, 'platform-tools/adb') : 'adb';
      const output = browser.isAndroid
        ? execFileSync(adb, [...(udid ? ['-s', udid] : []), 'logcat', '-d', '-t', '1000'], {
            timeout: 20_000,
          })
        : execFileSync(
            'xcrun',
            [
              'simctl',
              'spawn',
              udid || 'booted',
              'log',
              'show',
              '--last',
              '2m',
              '--style',
              'compact',
              '--predicate',
              'process == "GIVE"',
            ],
            { timeout: 20_000 },
          );
      writeFileSync(resolve(artifactDirectory, `${name}-device.log`), output);
    } catch (error) {
      writeFileSync(resolve(artifactDirectory, `${name}-device-log-error.txt`), String(error));
    }
  },
};
