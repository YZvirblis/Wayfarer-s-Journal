import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import {
  captureToLastCharacter,
  createCharacter,
  deleteCharacter,
  duplicateCharacter,
  importCharacter,
  importExampleCharacter,
  listBackups,
  listCharacters,
  readCharacter,
  readSettings,
  restoreBackup,
  saveCharacter,
  StorageError,
  writeSettings,
} from './storage';
import { appInfo, serverEvents } from './state';

const wrap =
  (handler: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    handler(req, res).catch(next);
  };

function requireId(req: Request): string {
  const id = req.params.id;
  if (!id) throw new StorageError('Missing character id.', 400);
  return id;
}

export function createApiRouter(): Router {
  const api = Router();

  api.get(
    '/characters',
    wrap(async (_req, res) => {
      res.json(await listCharacters());
    }),
  );

  api.post(
    '/characters',
    wrap(async (req, res) => {
      const name = typeof req.body?.name === 'string' ? req.body.name : '';
      res.status(201).json(await createCharacter(name));
    }),
  );

  api.post(
    '/characters/example',
    wrap(async (_req, res) => {
      res.status(201).json(await importExampleCharacter());
    }),
  );

  api.post(
    '/characters/import',
    wrap(async (req, res) => {
      const commit = req.body?.commit === true;
      const result = await importCharacter(req.body?.document, commit);
      res.status(commit ? 201 : 200).json(result);
    }),
  );

  api.get(
    '/characters/:id',
    wrap(async (req, res) => {
      res.json(await readCharacter(requireId(req)));
    }),
  );

  api.put(
    '/characters/:id',
    wrap(async (req, res) => {
      const id = requireId(req);
      if (req.body?.id !== id) throw new StorageError('Character id in the body does not match the URL.', 400);
      res.json(await saveCharacter(req.body));
    }),
  );

  api.delete(
    '/characters/:id',
    wrap(async (req, res) => {
      await deleteCharacter(requireId(req));
      res.status(204).end();
    }),
  );

  api.post(
    '/characters/:id/duplicate',
    wrap(async (req, res) => {
      res.status(201).json(await duplicateCharacter(requireId(req)));
    }),
  );

  api.get(
    '/characters/:id/backups',
    wrap(async (req, res) => {
      res.json(await listBackups(requireId(req)));
    }),
  );

  api.post(
    '/characters/:id/restore',
    wrap(async (req, res) => {
      const file = typeof req.body?.file === 'string' ? req.body.file : '';
      const mode = req.body?.mode === 'replace' ? 'replace' : 'new';
      res.status(mode === 'new' ? 201 : 200).json(await restoreBackup(requireId(req), file, mode));
    }),
  );

  api.get(
    '/settings',
    wrap(async (_req, res) => {
      res.json(await readSettings());
    }),
  );

  api.put(
    '/settings',
    wrap(async (req, res) => {
      const saved = await writeSettings(req.body);
      serverEvents.emit('settings', saved);
      res.json(saved);
    }),
  );

  api.get('/app', (_req, res) => {
    res.json(appInfo);
  });

  /** Desktop only: record the next hotkey press instead of opening the capture window. */
  api.post('/app/hotkey-test', (_req, res) => {
    if (!appInfo.desktop) throw new StorageError('The global hotkey only exists in the desktop app.', 400);
    serverEvents.emit('hotkeyTest');
    res.status(204).end();
  });

  api.post(
    '/captures',
    wrap(async (req, res) => {
      const body = typeof req.body?.body === 'string' ? req.body.body : '';
      if (!body.trim()) throw new StorageError('Nothing to keep.', 400);
      await captureToLastCharacter(body);
      res.status(204).end();
    }),
  );

  api.use((_req, res) => {
    res.status(404).json({ error: 'Unknown API route.' });
  });

  api.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = error instanceof StorageError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    if (status >= 500) console.error('[wayfarer]', error);
    res.status(status).json({ error: message });
  });

  return api;
}
