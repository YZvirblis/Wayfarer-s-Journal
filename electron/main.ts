/**
 * The desktop wrapper. It picks a data folder and a free loopback port, sets
 * the environment the server already understands, and only then loads the
 * server chunk (a separate file, so nothing reads the environment too early).
 * Everything the journal does still happens in the same Express app the web
 * mode uses; this file only owns windows, the tray, and the global hotkey.
 */
import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, shell, Tray } from 'electron';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { loadForeground, type Foreground, type WindowHandle } from './foreground';
import { createHotkeyService, type HotkeyService } from './hotkey';

const APP_NAME = "Wayfarer's Journal";
/** How long "Test your hotkey" listens for a press. */
const HOTKEY_TEST_MS = 6000;
type ServerModule = typeof import('./server');

/* -------------------------------------------------------------------------- */
/* Where the data lives                                                        */
/* -------------------------------------------------------------------------- */

function isWritable(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, '.write-test');
    fs.writeFileSync(probe, '');
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

/** `data/` beside the executable when packaged; the project folder in development; user data as the fallback. */
function resolveDataDir(): { dir: string; fallback: boolean; preferred: string } {
  const preferred = app.isPackaged ? path.join(path.dirname(process.execPath), 'data') : path.join(app.getAppPath(), 'data');
  if (isWritable(preferred)) return { dir: preferred, fallback: false, preferred };
  return { dir: path.join(app.getPath('userData'), 'data'), fallback: true, preferred };
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

/* -------------------------------------------------------------------------- */
/* Window state                                                                */
/* -------------------------------------------------------------------------- */

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized: boolean;
  trayHintShown?: boolean;
  fallbackNoticeShown?: boolean;
}

const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');

function loadState(): WindowState {
  try {
    return { width: 1280, height: 820, maximized: false, ...(JSON.parse(fs.readFileSync(stateFile(), 'utf8')) as Partial<WindowState>) };
  } catch {
    return { width: 1280, height: 820, maximized: false };
  }
}

let state = loadState();
let saveTimer: NodeJS.Timeout | null = null;

function saveState(win?: BrowserWindow): void {
  if (win && !win.isDestroyed()) {
    state.maximized = win.isMaximized();
    if (!state.maximized && !win.isMinimized()) {
      const bounds = win.getBounds();
      state = { ...state, ...bounds };
    }
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(stateFile()), { recursive: true });
      fs.writeFileSync(stateFile(), JSON.stringify(state, null, 2));
    } catch {
      // Losing the window position is not worth an error dialog.
    }
  }, 250);
}

/* -------------------------------------------------------------------------- */
/* App                                                                         */
/* -------------------------------------------------------------------------- */

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let captureWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
let baseUrl = '';
let closeToTray = true;
let server: ServerModule | null = null;
let hotkeys: HotkeyService | null = null;
let foreground: Foreground | null = null;
/** The window that had focus when the capture box opened — the game, usually. */
let previousForeground: WindowHandle = 0;
let hotkeyTestUntil = 0;

/** The app is packed into app.asar; files that must exist on disk for the OS (the icon, native modules) are unpacked beside it. */
const unpackedAppPath = () => app.getAppPath().replace(/app\.asar$/, 'app.asar.unpacked');
const iconPath = () => path.join(unpackedAppPath(), 'build', 'icon.png');
const preloadPath = () => path.join(app.getAppPath(), 'electron', 'preload.cjs');
const splashPath = () => path.join(app.getAppPath(), 'electron', 'splash.html');

/** The theme the journal will open in, read straight from settings.json so the splash matches from its first frame. */
function readTheme(dataDir: string): 'dark' | 'parchment' {
  try {
    const settings = JSON.parse(fs.readFileSync(path.join(dataDir, 'settings.json'), 'utf8')) as { theme?: unknown };
    return settings.theme === 'parchment' ? 'parchment' : 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * A small frameless window shown before anything else loads, so the player
 * sees the app respond at once. Closed the moment the journal is ready.
 */
function showSplash(theme: 'dark' | 'parchment'): void {
  splashWindow = new BrowserWindow({
    width: 360,
    height: 240,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: false,
    center: true,
    title: APP_NAME,
    backgroundColor: theme === 'parchment' ? '#e5d7bd' : '#0d0b09',
    icon: iconPath(),
    show: true,
    webPreferences: { sandbox: true },
  });
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
  void splashWindow.loadFile(splashPath(), { query: { theme } });
}

function closeSplash(): void {
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  splashWindow = null;
}

function openExternal(url: string): void {
  if (/^https?:/i.test(url)) void shell.openExternal(url);
}

function attachLinkHandling(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(baseUrl)) {
      event.preventDefault();
      openExternal(url);
    }
  });
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 600,
    minHeight: 480,
    title: APP_NAME,
    backgroundColor: '#0d0b09',
    autoHideMenuBar: true,
    icon: iconPath(),
    show: false,
    webPreferences: { preload: preloadPath(), contextIsolation: true, sandbox: true },
  });
  if (state.maximized) win.maximize();
  attachLinkHandling(win);
  win.once('ready-to-show', () => {
    win.show();
    closeSplash();
  });
  win.on('resize', () => saveState(win));
  win.on('move', () => saveState(win));
  win.on('close', (event) => {
    saveState(win);
    if (closeToTray && !quitting) {
      event.preventDefault();
      win.hide();
      if (tray && !state.trayHintShown && process.platform === 'win32') {
        tray.displayBalloon({ title: APP_NAME, content: 'Still open in the tray, so the capture hotkey keeps working. Right-click the tray icon to quit.' });
        state.trayHintShown = true;
        saveState();
      }
    }
  });
  win.on('closed', () => {
    mainWindow = null;
  });
  void win.loadURL(baseUrl);
  return win;
}

function showMainWindow(): void {
  if (!mainWindow) mainWindow = createMainWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

/* -------------------------------------------------------------------------- */
/* Quick capture window                                                        */
/* -------------------------------------------------------------------------- */

/** The HWND of a window, for the user32 calls. */
function handleOf(win: BrowserWindow): WindowHandle {
  const buffer = win.getNativeWindowHandle();
  return buffer.length >= 8 ? Number(buffer.readBigUInt64LE(0)) : buffer.readUInt32LE(0);
}

/** When the capture box was last raised; a blur inside the grace period is a refused activation, not the player leaving. */
let captureRaisedAt = 0;
const RAISE_GRACE_MS = 600;

/**
 * Show and focus the capture box, taking the foreground from the game. A
 * plain show() asks Windows to activate the window, which it refuses to a
 * background process (the taskbar button flashes instead) — so the window is
 * shown inactive and the foreground is taken with the input queues attached.
 */
function raiseCaptureWindow(win: BrowserWindow): void {
  captureRaisedAt = Date.now();
  if (foreground) {
    win.showInactive();
    const handle = handleOf(win);
    if (!foreground.activate(handle) || !win.isFocused()) win.focus();
  } else {
    win.show();
    win.focus();
  }
}

function openCaptureWindow(): void {
  if (captureWindow && !captureWindow.isDestroyed()) {
    raiseCaptureWindow(captureWindow);
    return;
  }
  // Remember who had the keyboard, so closing can hand it straight back.
  previousForeground = foreground?.current() ?? 0;
  captureWindow = new BrowserWindow({
    width: 560,
    height: 220,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    transparent: false,
    backgroundColor: '#13100c',
    title: 'Quick capture',
    icon: iconPath(),
    show: false,
    webPreferences: { preload: preloadPath(), contextIsolation: true, sandbox: true },
  });
  captureWindow.setAlwaysOnTop(true, 'screen-saver');
  captureWindow.setVisibleOnAllWorkspaces(true);
  attachLinkHandling(captureWindow);
  captureWindow.once('ready-to-show', () => {
    if (captureWindow) raiseCaptureWindow(captureWindow);
  });
  // The player clicked elsewhere: close, but leave focus where they put it.
  // A blur right after raising means Windows refused the activation; try once more.
  captureWindow.on('blur', () => {
    const win = captureWindow;
    if (!win || win.isDestroyed()) return;
    if (Date.now() - captureRaisedAt < RAISE_GRACE_MS) {
      if (foreground) foreground.activate(handleOf(win));
      return;
    }
    closeCaptureWindow(false);
  });
  captureWindow.on('closed', () => {
    captureWindow = null;
  });
  void captureWindow.loadURL(`${baseUrl}/capture`);
}

/**
 * `restoreFocus` hands the keyboard back to the window that had it before
 * the box opened (Enter, Escape, the hotkey again). Without it, Windows
 * would activate another window of this process — the journal — instead
 * of the game.
 */
function closeCaptureWindow(restoreFocus: boolean): void {
  const win = captureWindow;
  captureWindow = null; // the blur this triggers must not re-enter
  if (!win || win.isDestroyed()) return;
  if (restoreFocus && previousForeground && foreground) foreground.restore(previousForeground);
  previousForeground = 0;
  win.close();
}

/** The hotkey: opens the capture box, closes it when it is already up, or records a press during a test. */
function onHotkey(): void {
  if (Date.now() < hotkeyTestUntil) {
    hotkeyTestUntil = 0;
    patchHotkeyStatus({ test: { until: new Date().toISOString(), pressedAt: new Date().toISOString() } });
    return;
  }
  if (captureWindow && !captureWindow.isDestroyed() && captureWindow.isFocused()) closeCaptureWindow(true);
  else openCaptureWindow();
}

/* -------------------------------------------------------------------------- */
/* Hotkey, tray, settings                                                      */
/* -------------------------------------------------------------------------- */

let currentAccelerator: string | null = null;

function patchHotkeyStatus(patch: Partial<NonNullable<ServerModule['appInfo']['hotkey']>>): void {
  if (!server) return;
  const current = server.appInfo.hotkey ?? { accelerator: '', registered: false, backend: 'none' as const };
  server.setAppInfo({ hotkey: { ...current, ...patch } });
}

async function applyHotkey(accelerator: string): Promise<void> {
  if (!server || !hotkeys) return;
  currentAccelerator = accelerator;
  const status = await hotkeys.apply(accelerator);
  if (currentAccelerator !== accelerator) return; // superseded while awaiting
  server.setAppInfo({ hotkey: status });
}

function startHotkeyTest(): void {
  hotkeyTestUntil = Date.now() + HOTKEY_TEST_MS;
  patchHotkeyStatus({ test: { until: new Date(hotkeyTestUntil).toISOString() } });
}

function buildTray(): void {
  const image = nativeImage.createFromPath(iconPath());
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image.resize({ width: 16, height: 16 }));
  tray.setToolTip(APP_NAME);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open', click: showMainWindow },
      { label: 'Quick capture', click: openCaptureWindow },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on('click', showMainWindow);
  tray.on('double-click', showMainWindow);
}

async function applySettings(): Promise<void> {
  if (!server) return;
  const settings = await server.readSettings();
  closeToTray = settings.desktop.closeToTray;
  if (settings.desktop.captureHotkey !== currentAccelerator) await applyHotkey(settings.desktop.captureHotkey);
}

/* -------------------------------------------------------------------------- */
/* Boot                                                                        */
/* -------------------------------------------------------------------------- */

/** Everything the journal does not need in order to appear: the tray, the hotkey, the focus helpers. */
async function bootExtras(): Promise<void> {
  if (!server) return;
  buildTray();
  hotkeys = createHotkeyService(onHotkey);
  const focus = await loadForeground();
  foreground = focus.foreground;
  if (focus.note) console.log(`[wayfarer] ${focus.note}`);
  await applySettings();
  server.serverEvents.on('settings', () => void applySettings());
  server.serverEvents.on('hotkeyTest', startHotkeyTest);
}

async function boot(): Promise<void> {
  Menu.setApplicationMenu(null);
  const data = resolveDataDir();
  showSplash(readTheme(data.dir));

  const port = await freePort();
  process.env.WJ_DATA_DIR = data.dir;
  process.env.WJ_PORT = String(port);

  // Loaded only now, so the server's path constants see the environment above.
  server = await import('./server');
  const running = await server.startServer({ port });
  baseUrl = running.url;
  server.setAppInfo({ desktop: true, dataDir: data.dir, dataDirFallback: data.fallback });
  console.log(`[wayfarer] serving ${running.url} · data in ${data.dir}${data.fallback ? ' (fallback)' : ''}`);

  ipcMain.handle('capture:submit', async (_event, text: unknown) => {
    const body = typeof text === 'string' ? text : '';
    if (!body.trim() || !server) return { ok: false, reason: 'Nothing to keep.' };
    // The main window holds the open journal; let it add the capture so its autosave never overwrites it.
    if (mainWindow && !mainWindow.isDestroyed()) {
      const answered = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), 1500);
        ipcMain.once('capture:added', (_reply, ok: boolean) => {
          clearTimeout(timer);
          resolve(ok);
        });
        mainWindow?.webContents.send('capture', body);
      });
      if (answered) return { ok: true };
    }
    try {
      await server.captureToLastCharacter(body);
      return { ok: true };
    } catch (caught) {
      return { ok: false, reason: caught instanceof Error ? caught.message : 'Could not save the capture.' };
    }
  });
  ipcMain.on('capture:close', () => closeCaptureWindow(true));
  ipcMain.on('capture:open', () => openCaptureWindow());

  mainWindow = createMainWindow();
  // The tray, the hook and the focus helpers can wait until the window is on screen.
  mainWindow.once('show', () => {
    setTimeout(() => void bootExtras().catch((error: unknown) => console.error('[wayfarer]', error)), 50);
  });

  if (data.fallback && !state.fallbackNoticeShown) {
    state.fallbackNoticeShown = true;
    saveState();
    mainWindow.once('show', () => {
      void dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: APP_NAME,
        message: 'Your journals are kept in your user folder.',
        detail: `The folder next to the app (${data.preferred}) is not writable, so the journal uses:\n\n${data.dir}\n\nCopy that folder to back up or move your journals.`,
      });
    });
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => showMainWindow());
  app.whenReady().then(boot).catch((error: unknown) => {
    dialog.showErrorBox(APP_NAME, error instanceof Error ? error.stack ?? error.message : String(error));
    app.quit();
  });
}

app.on('activate', showMainWindow);
app.on('before-quit', () => {
  quitting = true;
  hotkeys?.dispose();
});
app.on('window-all-closed', () => {
  // Stay alive in the tray unless the player chose otherwise or is quitting.
  if (!closeToTray || quitting) app.quit();
});
