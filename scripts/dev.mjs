/**
 * Runs the API server (tsx watch) and the Vite dev server together, so
 * `npm run dev` is a single command on every platform.
 */
import { spawn } from 'node:child_process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const children = ['dev:server', 'dev:client'].map((script) =>
  spawn(npmCmd, ['run', '--silent', script], { stdio: 'inherit', shell: process.platform === 'win32' }),
);

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  process.exit(code);
}

for (const child of children) {
  child.on('exit', (code) => shutdown(code ?? 0));
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
