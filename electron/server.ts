/**
 * Everything the desktop wrapper needs from the server, re-exported so that
 * main.ts can load it lazily after choosing the data folder and port.
 */
export { startServer } from '../src/server/app';
export { appInfo, setAppInfo, serverEvents } from '../src/server/state';
export { readSettings, captureToLastCharacter } from '../src/server/storage';
