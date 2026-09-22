import { AlertTriangle, Check, FolderOpen, Keyboard, Monitor, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DEFAULT_CAPTURE_HOTKEY, type AppInfo, type HotkeyStatus } from '../../shared/schema';
import { api } from '../lib/api';
import { formatAccelerator } from '../lib/keys';
import { setDesktopSettings, useSettings } from '../lib/settingsStore';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

/** What the status line says about the way the app listens. */
function backendText(status: HotkeyStatus): string {
  const keys = formatAccelerator(status.accelerator) || 'The shortcut';
  if (!status.registered) return `${keys} could not be registered. ${status.error ?? ''}`.trim();
  if (status.backend === 'hook') return `${keys} is active, through a low-level keyboard hook — it works over games too.`;
  return `${keys} is registered with Windows. ${status.backendNote ?? ''}`.trim();
}

/** The "test your hotkey" line: waiting, arrived, or nothing came. */
function HotkeyTestResult({ test, accelerator }: { test: HotkeyStatus['test']; accelerator: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  if (!test) return null;
  if (test.pressedAt)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-sage">
        <Check className="h-4 w-4 shrink-0" /> The press arrived. The hotkey works from here; try it over the game next.
      </span>
    );
  const left = Math.max(0, Math.ceil((new Date(test.until).getTime() - now) / 1000));
  if (left > 0)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gold">
        <Radio className="h-4 w-4 shrink-0 animate-ember" /> Listening — press {formatAccelerator(accelerator)} now ({left}s).
      </span>
    );
  return (
    <span className="inline-flex items-start gap-1.5 text-xs text-rose">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      Nothing arrived. Another program may be holding that combination, or a full-screen game has the keyboard; try a different
      shortcut, or borderless-window mode.
    </span>
  );
}

/**
 * Preferences that live outside any one character: where the data is, and —
 * in the desktop app — the tray behaviour and the global capture hotkey.
 */
export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { desktop } = useSettings();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [hotkey, setHotkey] = useState(desktop.captureHotkey);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setHotkey(desktop.captureHotkey);
    let cancelled = false;
    const load = () =>
      api
        .getAppInfo()
        .then((loaded) => {
          if (!cancelled) setInfo(loaded);
        })
        .catch(() => undefined);
    void load();
    // The main process re-registers a moment after the setting is saved; poll briefly for the verdict.
    // While a hotkey test runs, poll fast enough that the press shows up at once.
    const timer = window.setInterval(() => void load(), testing ? 250 : 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, desktop.captureHotkey, testing]);

  const status = info?.hotkey;
  const isDesktop = info?.desktop ?? false;

  useEffect(() => {
    if (!testing || !status?.test) return;
    const over = Boolean(status.test.pressedAt) || new Date(status.test.until).getTime() < Date.now() - 500;
    if (over) setTesting(false);
  }, [testing, status]);

  function applyHotkey() {
    const next = hotkey.trim() || DEFAULT_CAPTURE_HOTKEY;
    setHotkey(next);
    if (next !== desktop.captureHotkey) setDesktopSettings({ captureHotkey: next });
  }

  async function startTest() {
    setTesting(true);
    try {
      await api.startHotkeyTest();
    } catch {
      setTesting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Preferences" description="Settings that belong to the app rather than to a character." size="md">
      <div className="space-y-6">
        <section>
          <p className="wj-label mb-2 flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" /> Your data
          </p>
          <p className="break-all rounded border border-line/15 bg-base/30 px-3 py-2 font-sans text-xs text-ink/85">{info?.dataDir ?? '…'}</p>
          <p className="mt-1.5 text-2xs leading-relaxed text-faint">
            One JSON file per character, with the last twenty saves in <span className="text-muted">backups/</span>. Copy this folder to
            back up or move your journals.
            {info?.dataDirFallback
              ? ' The folder next to the app was not writable, so the journal lives in your user folder instead.'
              : ''}
          </p>
        </section>

        <section>
          <p className="wj-label mb-2 flex items-center gap-1.5">
            <Keyboard className="h-3.5 w-3.5" /> Quick capture from anywhere
          </p>
          {isDesktop ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  value={hotkey}
                  onChange={(event) => setHotkey(event.target.value)}
                  onBlur={applyHotkey}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      applyHotkey();
                    }
                  }}
                  spellCheck={false}
                  aria-label="Global capture shortcut"
                  className="wj-field h-9 font-sans text-sm"
                />
                <Button variant="secondary" size="md" onClick={applyHotkey}>
                  Apply
                </Button>
              </div>
              <p className="mt-1.5 text-2xs leading-relaxed text-faint">
                Written the Electron way: <span className="text-muted">Ctrl+Shift+J</span>, <span className="text-muted">Alt+Shift+F9</span>,{' '}
                <span className="text-muted">CommandOrControl+Shift+K</span>. It works while the game has focus and opens a small box over
                it; Enter keeps the line in the open journal's Inbox and hands the keyboard back.
              </p>
              {status ? (
                <p
                  className={
                    status.registered
                      ? 'mt-2.5 flex items-start gap-1.5 text-xs text-sage'
                      : 'mt-2.5 flex items-start gap-1.5 text-xs text-rose'
                  }
                >
                  {status.registered ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>{backendText(status)}</span>
                </p>
              ) : null}
              {status?.registered ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button variant="secondary" size="sm" onClick={() => void startTest()} disabled={testing}>
                    <Radio className="h-4 w-4" />
                    Test your hotkey
                  </Button>
                  <HotkeyTestResult test={status.test} accelerator={status.accelerator} />
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-xs leading-relaxed text-faint">
              The system-wide shortcut needs the desktop app; in a browser the game keeps the keys. Inside the journal,{' '}
              <span className="text-muted">Ctrl+/</span> still captures.
            </p>
          )}
        </section>

        <section>
          <p className="wj-label mb-2 flex items-center gap-1.5">
            <Monitor className="h-3.5 w-3.5" /> Window
          </p>
          {isDesktop ? (
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink/90">
              <input
                type="checkbox"
                checked={desktop.closeToTray}
                onChange={(event) => setDesktopSettings({ closeToTray: event.target.checked })}
                className="mt-1 h-4 w-4 accent-[rgb(var(--wj-gold))]"
              />
              <span>
                Keep running in the tray when the window is closed
                <span className="block text-2xs leading-relaxed text-faint">
                  So the capture shortcut keeps working behind the game. Quit from the tray icon's menu.
                </span>
              </span>
            </label>
          ) : (
            <p className="text-xs leading-relaxed text-faint">Tray settings appear in the desktop app.</p>
          )}
        </section>
      </div>
    </Modal>
  );
}
