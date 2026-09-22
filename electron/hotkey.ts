/**
 * The global capture hotkey.
 *
 * Preferred backend: a low-level keyboard hook (WH_KEYBOARD_LL, via
 * uiohook-napi), which sees a key combination even while a game reads the
 * keyboard through DirectInput — RegisterHotKey, which Electron's
 * globalShortcut uses, never fires there. Fallback: globalShortcut, when the
 * hook cannot load.
 *
 * The hook is deliberately dumb. It compares each key-down against one
 * configured combination and remembers nothing else: no buffer, no log, no
 * text. Mouse events are not subscribed to. The hook is released on quit.
 */
import { globalShortcut } from 'electron';
import type { HotkeyStatus } from '../src/shared/schema';

type HookModule = typeof import('uiohook-napi');
type KeyName = keyof HookModule['UiohookKey'];

interface Combo {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  keycode: number;
}

const NAMED_KEYS: Record<string, KeyName> = {
  space: 'Space',
  tab: 'Tab',
  enter: 'Enter',
  return: 'Enter',
  escape: 'Escape',
  esc: 'Escape',
  backspace: 'Backspace',
  delete: 'Delete',
  insert: 'Insert',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  capslock: 'CapsLock',
  numlock: 'NumLock',
  scrolllock: 'ScrollLock',
  printscreen: 'PrintScreen',
  ';': 'Semicolon',
  '=': 'Equal',
  ',': 'Comma',
  '-': 'Minus',
  '.': 'Period',
  '/': 'Slash',
  '`': 'Backquote',
  '[': 'BracketLeft',
  '\\': 'Backslash',
  ']': 'BracketRight',
  "'": 'Quote',
  numadd: 'NumpadAdd',
  numsub: 'NumpadSubtract',
  nummult: 'NumpadMultiply',
  numdiv: 'NumpadDivide',
  numdec: 'NumpadDecimal',
};

/** An Electron accelerator ("CommandOrControl+Shift+J") as modifier flags plus a uiohook keycode. */
export function parseAccelerator(accelerator: string, keys: HookModule['UiohookKey']): Combo | { error: string } {
  const combo: Combo = { ctrl: false, shift: false, alt: false, meta: false, keycode: -1 };
  for (const rawPart of accelerator.split('+')) {
    const part = rawPart.trim();
    const lower = part.toLowerCase();
    if (!part) return { error: 'The shortcut has an empty part.' };
    if (lower === 'commandorcontrol' || lower === 'cmdorctrl') {
      if (process.platform === 'darwin') combo.meta = true;
      else combo.ctrl = true;
    } else if (lower === 'control' || lower === 'ctrl') combo.ctrl = true;
    else if (lower === 'shift') combo.shift = true;
    else if (lower === 'alt' || lower === 'option' || lower === 'altgr') combo.alt = true;
    else if (lower === 'super' || lower === 'meta' || lower === 'command' || lower === 'cmd') combo.meta = true;
    else {
      if (combo.keycode !== -1) return { error: 'Only one non-modifier key is allowed.' };
      let name: KeyName | undefined;
      if (/^[a-z]$/i.test(part)) name = part.toUpperCase() as KeyName;
      else if (/^[0-9]$/.test(part)) name = part as KeyName;
      else if (/^f([1-9]|1[0-9]|2[0-4])$/i.test(part)) name = `F${part.slice(1)}` as KeyName;
      else if (/^num[0-9]$/i.test(part)) name = `Numpad${part.slice(3)}` as KeyName;
      else name = NAMED_KEYS[lower];
      if (!name) return { error: `"${part}" is not a key the keyboard hook understands.` };
      combo.keycode = keys[name];
    }
  }
  if (combo.keycode === -1) return { error: 'The shortcut needs a key, not just modifiers.' };
  return combo;
}

export interface HotkeyService {
  /** Listen for `accelerator` (empty string: listen for nothing). Resolves with the status to show in Preferences. */
  apply(accelerator: string): Promise<HotkeyStatus>;
  /** Release the hook and any registered shortcut. */
  dispose(): void;
}

export function createHotkeyService(onTrigger: () => void): HotkeyService {
  let hook: HookModule | null | undefined; // undefined: not tried yet
  let hookNote: string | undefined;
  let hookStarted = false;
  let combo: Combo | null = null;
  let held = false;
  let shortcut = '';

  async function loadHook(): Promise<HookModule | null> {
    if (hook !== undefined) return hook;
    try {
      hook = await import('uiohook-napi');
    } catch (caught) {
      hook = null;
      hookNote = `The keyboard hook could not load (${caught instanceof Error ? caught.message : String(caught)}), so the shortcut is registered with Windows instead; some games swallow it.`;
    }
    return hook;
  }

  function onKeyDown(event: { keycode: number; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean }): void {
    if (!combo || event.keycode !== combo.keycode) return;
    if (held) return; // key auto-repeat
    if (event.ctrlKey !== combo.ctrl || event.shiftKey !== combo.shift || event.altKey !== combo.alt || event.metaKey !== combo.meta) return;
    held = true;
    onTrigger();
  }

  function onKeyUp(event: { keycode: number }): void {
    if (combo && event.keycode === combo.keycode) held = false;
  }

  function ensureHookRunning(module: HookModule): void {
    if (hookStarted) return;
    module.uIOhook.on('keydown', onKeyDown);
    module.uIOhook.on('keyup', onKeyUp);
    module.uIOhook.start();
    hookStarted = true;
  }

  function unregisterShortcut(): void {
    if (shortcut) globalShortcut.unregister(shortcut);
    shortcut = '';
  }

  function registerShortcut(wanted: string): HotkeyStatus {
    let registered = false;
    let error: string | undefined;
    try {
      registered = globalShortcut.register(wanted, onTrigger);
      if (!registered) error = 'Another program already uses this shortcut, or Windows reserves it. Try a different combination.';
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'That is not a valid shortcut.';
    }
    if (registered) shortcut = wanted;
    return {
      accelerator: wanted,
      registered,
      backend: registered ? 'shortcut' : 'none',
      ...(error ? { error } : {}),
      ...(hookNote ? { backendNote: hookNote } : {}),
    };
  }

  return {
    async apply(accelerator) {
      combo = null;
      held = false;
      unregisterShortcut();
      const wanted = accelerator.trim();
      if (!wanted) return { accelerator: '', registered: false, backend: 'none', error: 'No shortcut set.' };

      const module = await loadHook();
      if (module) {
        const parsed = parseAccelerator(wanted, module.UiohookKey);
        if ('error' in parsed) {
          const status = registerShortcut(wanted);
          return { ...status, backendNote: `${parsed.error} Registered with Windows instead; some games swallow it.` };
        }
        try {
          ensureHookRunning(module);
          combo = parsed;
          return { accelerator: wanted, registered: true, backend: 'hook' };
        } catch (caught) {
          hookNote = `The keyboard hook could not start (${caught instanceof Error ? caught.message : String(caught)}), so the shortcut is registered with Windows instead; some games swallow it.`;
        }
      }
      return registerShortcut(wanted);
    },
    dispose() {
      combo = null;
      unregisterShortcut();
      if (hook && hookStarted) {
        hook.uIOhook.removeAllListeners();
        hook.uIOhook.stop();
        hookStarted = false;
      }
    },
  };
}
