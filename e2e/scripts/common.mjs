import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const e2eDirectory = fileURLToPath(new URL('..', import.meta.url));
export const repositoryDirectory = resolve(e2eDirectory, '..');
export const exampleDirectory = resolve(repositoryDirectory, 'example');

export function run(command, args, options = {}) {
  console.log(`> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: e2eDirectory,
    env: process.env,
    stdio: 'inherit',
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed (exit ${result.status}, signal ${result.signal ?? 'none'})`);
  }
}

export function buildEnvironment() {
  return { ...process.env, CI: '1', EXPO_PUBLIC_E2E: '1', NODE_BINARY: process.execPath };
}

export function buildDirectory(platform) {
  const directory = resolve(e2eDirectory, 'build', platform);
  mkdirSync(directory, { recursive: true });
  return directory;
}
