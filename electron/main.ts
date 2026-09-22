/**
 * The desktop wrapper. It picks a data folder and a free loopback port, sets
 * the environment the server already understands, and only then loads the
 * server chunk (a separate file, so nothing reads the environment too early).
 * Everything the journal does still happens in the same Express app the web
 * mode uses; this file only owns windows, the tray, and the global hotkey.
 */
import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, shell, Tray } from 'electron';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const APP_NAME = "Wayfarer's Journal";
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

/** `data/` beside the executable when portable; the project folder in development; user data as the fallback. */
function resolveDataDir(): { dir: string; fallback: boolean; preferred: string } {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  const preferred = portableDir
    ? path.join(portableDir, 'data')
    : app.isPackaged
      ? path.join(path.dirname(process.execPath), 'data')
      : path.join(app.getAppPath(), 'data');
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
let captureWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
let baseUrl = '';
let closeToTray = true;
let server: ServerModule | null = null;

const iconPath = () => path.join(app.getAppPath(), 'build', 'icon.png');
const preloadPath = () => path.join(app.getAppPath(), 'electron', 'preload.cjs');

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
  win.once('ready-to-show', () => win.show());
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

function openCaptureWindow(): void {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.show();
    captureWindow.focus();
    return;
  }
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
    captureWindow?.show();
    captureWindow?.focus();
  });
  captureWindow.on('blur', () => closeCaptureWindow());
  captureWindow.on('closed', () => {
    captureWindow = null;
  });
  void captureWindow.loadURL(`${baseUrl}/capture`);
}

/** Hiding the focused window hands focus back to whatever had it — the game, usually. */
function closeCaptureWindow(): void {
  if (captureWindow && !captureWindow.isDestroyed()) captureWindow.close();
}

/* -------------------------------------------------------------------------- */
/* Hotkey, tray, settings                                                      */
/* -------------------------------------------------------------------------- */

let currentAccelerator = '';

function registerHotkey(accelerator: string): void {
  if (currentAccelerator) globalShortcut.unregister(currentAccelerator);
  currentAccelerator = '';
  const wanted = accelerator.trim();
  if (!wanted) {
    server?.setAppInfo({ hotkey: { accelerator: '', registered: false, error: 'No shortcut set.' } });
    return;
  }
  let registered = false;
  let error: string | undefined;
  try {
    registered = globalShortcut.register(wanted, openCaptureWindow);
    if (!registered) error = 'Another program already uses this shortcut, or Windows reserves it. Try a different combination.';
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'That is not a valid shortcut.';
  }
  if (registered) currentAccelerator = wanted;
  server?.setAppInfo({ hotkey: { accelerator: wanted, registered, ...(error ? { error } : {}) } });
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
  if (settings.desktop.captureHotkey !== currentAccelerator) registerHotkey(settings.desktop.captureHotkey);
}

/* -------------------------------------------------------------------------- */
/* Boot                                                                        */
/* -------------------------------------------------------------------------- */

async function boot(): Promise<void> {
  const data = resolveDataDir();
  const port = await freePort();
  process.env.WJ_DATA_DIR = data.dir;
  process.env.WJ_PORT = String(port);

  // Loaded only now, so the server's path constants see the environment above.
  server = await import('./server');
  const running = await server.startServer({ port });
  baseUrl = running.url;
  server.setAppInfo({ desktop: true, dataDir: data.dir, dataDirFallback: data.fallback });
  console.log(`[wayfarer] serving ${running.url} · data in ${data.dir}${data.fallback ? ' (fallback)' : ''}`);

  Menu.setApplicationMenu(null);
  buildTray();
  await applySettings();
  server.serverEvents.on('settings', () => void applySettings());

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
  ipcMain.on('capture:close', () => closeCaptureWindow());
  ipcMain.on('capture:open', () => openCaptureWindow());

  mainWindow = createMainWindow();

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
  globalShortcut.unregisterAll();
});
app.on('window-all-closed', () => {
  // Stay alive in the tray unless the player chose otherwise or is quitting.
  if (!closeToTray || quitting) app.quit();
});
