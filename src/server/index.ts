import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import express from 'express';
import { createApiRouter } from './api';
import { ensureDataDirs } from './storage';
import { CLIENT_DIST_DIR, DATA_DIR, HOST, PORT } from './paths';

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
  await ensureDataDirs();

  const app = express();
  // Portraits arrive as data URLs (Phase 3), so the limit is generous.
  app.use(express.json({ limit: '12mb' }));
  app.use('/api', createApiRouter());

  const hasBuiltClient = existsSync(path.join(CLIENT_DIST_DIR, 'index.html'));
  if (hasBuiltClient) {
    app.use(express.static(CLIENT_DIST_DIR));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(CLIENT_DIST_DIR, 'index.html'));
    });
  }

  const url = `http://${HOST}:${PORT}`;
  const server = app.listen(PORT, HOST, () => {
    console.log('');
    console.log("  Wayfarer's Journal");
    console.log(`  ${hasBuiltClient ? 'Open' : 'API only (client not built yet)'} ${url}`);
    console.log(`  Journals are stored in ${DATA_DIR}`);
    console.log('  Press Ctrl+C to close.');
    console.log('');
    if (process.env.WJ_OPEN === '1' && hasBuiltClient) openInBrowser(url);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n  Port ${PORT} is already in use.`);
      console.error("  Wayfarer's Journal may already be running — try opening " + url);
      console.error('  Otherwise run stop.bat, or set WJ_PORT to a different port.\n');
    } else {
      console.error(error);
    }
    process.exit(1);
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
    });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
