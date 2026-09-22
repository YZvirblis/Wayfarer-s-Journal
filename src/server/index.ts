import { spawn } from 'node:child_process';
import { startServer } from './app';
import { DATA_DIR, PORT } from './paths';

function openInBrowser(url: string): void {
  const command =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try {
    spawn(command[0] as string, command[1] as string[], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    // Opening a browser is a convenience; never let it take the server down.
  }
}

async function main(): Promise<void> {
  let running;
  try {
    running = await startServer();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EADDRINUSE') {
      const url = `http://127.0.0.1:${PORT}`;
      console.error(`\n  Port ${PORT} is already in use.`);
      console.error("  Wayfarer's Journal may already be running — try opening " + url);
      console.error('  Otherwise run stop.bat, or set WJ_PORT to a different port.\n');
    } else {
      console.error(error);
    }
    process.exit(1);
  }

  console.log('');
  console.log("  Wayfarer's Journal");
  console.log(`  ${running.hasClient ? 'Open' : 'API only (client not built yet)'} ${running.url}`);
  console.log(`  Journals are stored in ${DATA_DIR}`);
  console.log('  Press Ctrl+C to close.');
  console.log('');
  if (process.env.WJ_OPEN === '1' && running.hasClient) openInBrowser(running.url);

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      void running.close().then(() => process.exit(0));
    });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
