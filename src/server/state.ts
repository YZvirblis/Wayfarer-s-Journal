import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { AppInfo, Settings } from '../shared/schema';
import { DATA_DIR, PROJECT_ROOT } from './paths';

/**
 * Facts about the running app that the client can ask for (`GET /api/app`)
 * and that the desktop wrapper fills in: where the data lives, whether the
 * global capture hotkey took, and so on. Plain and mutable on purpose.
 */

function readVersion(): string {
  try {
    return (JSON.parse(readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8')) as { version?: string }).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const appInfo: AppInfo = { version: readVersion(), desktop: false, dataDir: DATA_DIR, dataDirFallback: false };

export function setAppInfo(patch: Partial<AppInfo>): void {
  Object.assign(appInfo, patch);
}

/**
 * `settings` fires with the new Settings after every successful write;
 * `hotkeyTest` when the client asks the desktop wrapper to listen for one press.
 */
export const serverEvents = new EventEmitter<{ settings: [Settings]; hotkeyTest: [] }>();
