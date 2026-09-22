import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function findProjectRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export const PROJECT_ROOT = findProjectRoot();

/** Overridable so a future Electron build can point at the user's app-data folder. */
export const DATA_DIR = process.env.WJ_DATA_DIR
  ? path.resolve(process.env.WJ_DATA_DIR)
  : path.join(PROJECT_ROOT, 'data');

export const CHARACTERS_DIR = path.join(DATA_DIR, 'characters');
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
export const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
export const EXAMPLES_DIR = path.join(PROJECT_ROOT, 'examples');
export const EXAMPLE_CHARACTER_FILE = path.join(EXAMPLES_DIR, 'example-character.json');
export const CLIENT_DIST_DIR = path.join(PROJECT_ROOT, 'dist', 'client');

export const PORT = Number(process.env.WJ_PORT ?? 4777);
export const HOST = '127.0.0.1';

export const MAX_BACKUPS = 20;
