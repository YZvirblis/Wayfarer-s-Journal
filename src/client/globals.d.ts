/** Injected by Vite at build time from package.json (see vite.config.ts `define`). */
declare const __APP_VERSION__: string;

/** Present only inside the desktop (Electron) app; see electron/preload.cjs. */
interface WayfarerDesktop {
  onCapture: (handler: (text: string) => boolean | Promise<boolean>) => () => void;
  submitCapture: (text: string) => Promise<{ ok: boolean; reason?: string }>;
  closeCapture: () => void;
  openCapture: () => void;
}

interface Window {
  wayfarerDesktop?: WayfarerDesktop;
}
