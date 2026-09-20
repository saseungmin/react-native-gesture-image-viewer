import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { e2eDirectory, run } from './common.mjs';

const platform = process.argv[2];
const count = Number(process.env.E2E_REPEAT ?? 10);
if (!['android', 'ios'].includes(platform) || !Number.isSafeInteger(count) || count < 1) {
  throw new Error('Expected android or ios and a positive integer E2E_REPEAT.');
}
const directory = process.env.E2E_ARTIFACT_DIR
  ? resolve(process.env.E2E_ARTIFACT_DIR)
  : resolve(e2eDirectory, 'artifacts', `${platform}-repeat-${Date.now()}`);
mkdirSync(directory, { recursive: true });
const results = [];
try {
  for (let iteration = 1; iteration <= count; iteration += 1) {
    const startedAt = new Date().toISOString();
    try {
      run('npm', ['run', `test:${platform}`], {
        env: { ...process.env, E2E_ARTIFACT_DIR: resolve(directory, `run-${iteration}`) },
      });
      results.push({ iteration, startedAt, finishedAt: new Date().toISOString(), passed: true });
    } catch (error) {
      results.push({ iteration, startedAt, finishedAt: new Date().toISOString(), passed: false });
      throw error;
    }
  }
} finally {
  writeFileSync(
    resolve(directory, 'summary.json'),
    JSON.stringify({ platform, count, results }, null, 2),
  );
  console.log(`Repeat evidence: ${directory}`);
}
