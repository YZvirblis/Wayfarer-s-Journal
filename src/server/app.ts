import { existsSync } from 'node:fs';
import type { Server } from 'node:http';
import path from 'node:path';
import express from 'express';
import { createApiRouter } from './api';
import { CLIENT_DIST_DIR, HOST, PORT } from './paths';
import { ensureDataDirs } from './storage';

export interface RunningServer {
  port: number;
  url: string;
  hasClient: boolean;
  close: () => Promise<void>;
}

/**
 * The whole app as a function: the API plus the built client, listening on
 * the loopback interface only. `npm start` calls it from the command line;
 * the desktop wrapper calls it in-process on a free port.
 */
export async function startServer(options: { port?: number; host?: string } = {}): Promise<RunningServer> {
  await ensureDataDirs();
  const host = options.host ?? HOST;
  const port = options.port ?? PORT;

  const app = express();
  // Portraits arrive as data URLs, so the limit is generous.
  app.use(express.json({ limit: '12mb' }));
  app.use('/api', createApiRouter());

  const hasClient = existsSync(path.join(CLIENT_DIST_DIR, 'index.html'));
  if (hasClient) {
    app.use(express.static(CLIENT_DIST_DIR));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(CLIENT_DIST_DIR, 'index.html'));
    });
  }

  const server = await new Promise<Server>((resolve, reject) => {
    const listening = app.listen(port, host, () => resolve(listening));
    listening.on('error', reject);
  });
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;

  return {
    port: actualPort,
    url: `http://${host}:${actualPort}`,
    hasClient,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
