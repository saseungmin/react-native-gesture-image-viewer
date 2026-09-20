import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

import { e2eDirectory, run } from './common.mjs';

if (process.platform !== 'darwin') throw new Error('Preparing iOS WDA requires macOS.');
const output = resolve(e2eDirectory, 'build/wda');
mkdirSync(resolve(e2eDirectory, 'build'), { recursive: true });
// The official downloader requires a new output directory. This contains only
// generated WDA artifacts, never application source or simulator data.
rmSync(output, { recursive: true, force: true });
run(resolve(e2eDirectory, 'node_modules/.bin/appium'), [
  'driver',
  'run',
  'xcuitest',
  'download-wda',
  '--',
  '--outdir',
  output,
  '--platform',
  'iOS',
  '--kind',
  'sim',
]);
const app = resolve(output, 'WebDriverAgentRunner-Runner.app');
if (!existsSync(app)) throw new Error(`The WDA download did not produce ${app}`);
console.log(`Prebuilt simulator WDA: ${app}`);
