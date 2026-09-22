// The only bridge between the page and the desktop wrapper. Nothing else from
// Node or Electron is reachable from the renderer.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wayfarerDesktop', {
  /** The main window receives text captured from the global hotkey window. */
  onCapture(handler) {
    const listener = (_event, text) => {
      Promise.resolve(handler(text)).then(
        (ok) => ipcRenderer.send('capture:added', ok === true),
        () => ipcRenderer.send('capture:added', false),
      );
    };
    ipcRenderer.on('capture', listener);
    return () => ipcRenderer.removeListener('capture', listener);
  },
  /** The capture window hands its text to the main process. */
  submitCapture: (text) => ipcRenderer.invoke('capture:submit', text),
  closeCapture: () => ipcRenderer.send('capture:close'),
  openCapture: () => ipcRenderer.send('capture:open'),
});
