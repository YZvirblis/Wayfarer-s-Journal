import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  characterDocumentSchema,
  settingsSchema,
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  type CharacterDocument,
  type CharacterSummary,
  type ImportResult,
  type Settings,
} from '../shared/schema';
import { createCharacterDocument, newId, profileFieldValue, PROFILE_FIELD_IDS, toSummary } from '../shared/defaults';
import {
  BACKUPS_DIR,
  CHARACTERS_DIR,
  DATA_DIR,
  EXAMPLE_CHARACTER_FILE,
  MAX_BACKUPS,
  SETTINGS_FILE,
} from './paths';
import { migrateRawDocument, MigrationError } from './migrations';

export class StorageError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message);
  }
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

function characterFile(id: string): string {
  if (!SAFE_ID.test(id)) throw new StorageError(`Invalid character id: ${id}`, 400);
  return path.join(CHARACTERS_DIR, `${id}.json`);
}

export async function ensureDataDirs(): Promise<void> {
  await fs.mkdir(CHARACTERS_DIR, { recursive: true });
  await fs.mkdir(BACKUPS_DIR, { recursive: true });
}

/** Write via a sibling temp file + rename, so a crash mid-write can never leave a
 *  half-written character file behind. */
async function writeFileAtomic(target: string, contents: string): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${randomBytes(6).toString('hex')}.tmp`;
  const handle = await fs.open(tmp, 'w');
  try {
    await handle.writeFile(contents, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(tmp, target);
}

function backupStamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

/** Copy the current file aside before it is overwritten, then keep only the
 *  newest MAX_BACKUPS. Backup filenames sort chronologically as plain strings. */
async function backupExisting(id: string): Promise<void> {
  const source = characterFile(id);
  let current: string;
  try {
    current = await fs.readFile(source, 'utf8');
  } catch {
    return; // nothing to back up yet
  }
  const dir = path.join(BACKUPS_DIR, id);
  await writeFileAtomic(path.join(dir, `${backupStamp()}.json`), current);

  const entries = (await fs.readdir(dir)).filter((name) => name.endsWith('.json')).sort();
  for (const stale of entries.slice(0, Math.max(0, entries.length - MAX_BACKUPS))) {
    await fs.rm(path.join(dir, stale), { force: true });
  }
}

/** zod strips keys it does not know about. Documents written by a future version
 *  may carry extra top-level keys (sessions, ledger, …); merging the validated
 *  result back over the raw object keeps them intact. */
function preserveUnknownKeys(raw: Record<string, unknown>, parsed: CharacterDocument): CharacterDocument {
  return { ...raw, ...parsed };
}

function parseDocument(raw: unknown, source: string): CharacterDocument {
  let migrated: Record<string, unknown>;
  try {
    migrated = migrateRawDocument(raw);
  } catch (error) {
    if (error instanceof MigrationError) throw new StorageError(`${source}: ${error.message}`, 400);
    throw error;
  }
  const result = characterDocumentSchema.safeParse(migrated);
  if (!result.success) {
    const detail = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new StorageError(`${source} is not a valid character file — ${detail}`, 400);
  }
  return preserveUnknownKeys(migrated, result.data);
}

async function readJson(file: string): Promise<unknown> {
  const text = await fs.readFile(file, 'utf8');
  try {
    return JSON.parse(text);
  } catch {
    throw new StorageError(`${path.basename(file)} contains invalid JSON.`, 400);
  }
}

export async function listCharacters(): Promise<CharacterSummary[]> {
  await ensureDataDirs();
  const files = (await fs.readdir(CHARACTERS_DIR)).filter((name) => name.endsWith('.json'));
  const summaries: CharacterSummary[] = [];
  for (const file of files) {
    try {
      const doc = parseDocument(await readJson(path.join(CHARACTERS_DIR, file)), file);
      summaries.push(toSummary(doc));
    } catch {
      // A single unreadable file must not hide every other character.
      continue;
    }
  }
  return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function readCharacter(id: string): Promise<CharacterDocument> {
  const file = characterFile(id);
  let raw: unknown;
  try {
    raw = await readJson(file);
  } catch (error) {
    if (error instanceof StorageError) throw error;
    throw new StorageError(`No character with id ${id}.`, 404);
  }
  return parseDocument(raw, `${id}.json`);
}

export async function saveCharacter(input: unknown): Promise<CharacterDocument> {
  await ensureDataDirs();
  const doc = parseDocument(input, 'The character being saved');
  await backupExisting(doc.id);
  await writeFileAtomic(characterFile(doc.id), `${JSON.stringify(doc, null, 2)}\n`);
  return doc;
}

export async function createCharacter(name: string): Promise<CharacterDocument> {
  return saveCharacter(createCharacterDocument(name));
}

/** Backups are deliberately kept — a mistaken delete stays recoverable. */
export async function deleteCharacter(id: string): Promise<void> {
  const file = characterFile(id);
  await backupExisting(id);
  try {
    await fs.rm(file);
  } catch {
    throw new StorageError(`No character with id ${id}.`, 404);
  }
}

function reborn(doc: CharacterDocument, name: string): CharacterDocument {
  const now = new Date().toISOString();
  return {
    ...doc,
    id: newId(),
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    profile: { ...doc.profile, name },
  };
}

export async function duplicateCharacter(id: string): Promise<CharacterDocument> {
  const doc = await readCharacter(id);
  return saveCharacter(reborn(doc, `${doc.profile.name} (copy)`));
}

export async function importExampleCharacter(): Promise<CharacterDocument> {
  let raw: unknown;
  try {
    raw = await readJson(EXAMPLE_CHARACTER_FILE);
  } catch (error) {
    if (error instanceof StorageError) throw error;
    throw new StorageError('The bundled example character is missing from examples/.', 500);
  }
  const doc = parseDocument(raw, 'The example character');
  return saveCharacter(reborn(doc, doc.profile.name));
}

/**
 * Bring a character file in from outside. It is validated and migrated like
 * any other read, then — only when `commit` is true — saved under a fresh id,
 * so an import can never overwrite what is already here. The original
 * `createdAt` is kept; everything else about identity is new.
 */
export async function importCharacter(raw: unknown, commit: boolean): Promise<ImportResult> {
  const fromVersion =
    typeof raw === 'object' && raw !== null && typeof (raw as { schemaVersion?: unknown }).schemaVersion === 'number'
      ? (raw as { schemaVersion: number }).schemaVersion
      : 1;
  const doc = parseDocument(raw, 'The chosen file');
  const existing = await listCharacters();
  const summary: ImportResult['summary'] = {
    name: doc.profile.name,
    race: profileFieldValue(doc, PROFILE_FIELD_IDS.race, 'Race'),
    trade: profileFieldValue(doc, PROFILE_FIELD_IDS.trade, 'Trade'),
    fromVersion,
    toVersion: SCHEMA_VERSION,
    counts: {
      entries: doc.entries.length,
      sections: doc.entryTypes.length,
      tags: doc.tags.length,
      sessions: doc.sessions.length,
      transactions: doc.transactions.length,
      goals: doc.goals.length,
      captures: doc.captures.length,
    },
    duplicateName: existing.some((character) => character.name === doc.profile.name),
  };
  if (!commit) return { summary };
  const document = await saveCharacter({ ...reborn(doc, doc.profile.name), createdAt: doc.createdAt });
  return { summary, document };
}

export async function readSettings(): Promise<Settings> {
  await ensureDataDirs();
  try {
    const parsed = settingsSchema.safeParse(await readJson(SETTINGS_FILE));
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function writeSettings(input: unknown): Promise<Settings> {
  await ensureDataDirs();
  const result = settingsSchema.safeParse(input);
  if (!result.success) throw new StorageError('Invalid settings.', 400);
  await writeFileAtomic(SETTINGS_FILE, `${JSON.stringify(result.data, null, 2)}\n`);
  return result.data;
}

export const dataDirectory = DATA_DIR;
