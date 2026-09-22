/**
 * Renders assets/icon.svg to build/icon.png (256×256) and wraps it as
 * build/icon.ico, using Electron's own renderer — no extra dependencies.
 * Run with `npm run icon` (electron scripts/make-icon.cjs).
 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const SIZE = 256;
const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'assets', 'icon.svg');
const outDir = path.join(root, 'build');

/** A single-image ICO whose image is a PNG; Windows Vista and later read these. */
function pngToIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry.writeUInt8(SIZE >= 256 ? 0 : SIZE, 0); // width (0 means 256)
  entry.writeUInt8(SIZE >= 256 ? 0 : SIZE, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(6 + 16, 12); // offset of the image data
  return Buffer.concat([header, entry, png]);
}

app.disableHardwareAcceleration();
app
  .whenReady()
  .then(async () => {
    const svg = fs.readFileSync(svgPath, 'utf8');
    const win = new BrowserWindow({
      show: false,
      width: SIZE,
      height: SIZE,
      frame: false,
      transparent: true,
      webPreferences: { offscreen: true },
    });
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent;overflow:hidden}svg{display:block}</style></head><body>${svg}</body></html>`;
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const image = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE });
    const png = image.toPNG();
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'icon.png'), png);
    fs.writeFileSync(path.join(outDir, 'icon.ico'), pngToIco(png));
    console.log(`icon: ${png.length} bytes → build/icon.png, build/icon.ico`);
    app.quit();
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
