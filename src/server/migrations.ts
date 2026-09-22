import { SCHEMA_VERSION } from '../shared/schema';

type RawDocument = Record<string, unknown>;

/**
 * One entry per schema version step: `migrations[n]` upgrades a document from
 * version `n` to version `n + 1`. Migrations receive and return loose objects so
 * they can read fields that no longer exist in the current types.
 *
 * Rules:
 *  - never drop a field you do not understand;
 *  - always be safe to run twice (defensive defaults, not blind overwrites).
 */
const migrations: Record<number, (doc: RawDocument) => RawDocument> = {
  // 1 -> 2 will live here when the format next changes.
};

export class MigrationError extends Error {}

export function migrateRawDocument(raw: unknown): RawDocument {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new MigrationError('Character file is not a JSON object.');
  }
  let doc = { ...(raw as RawDocument) };
  let version = typeof doc.schemaVersion === 'number' ? doc.schemaVersion : 1;

  if (version > SCHEMA_VERSION) {
    throw new MigrationError(
      `This character was written by a newer version of Wayfarer's Journal ` +
        `(file format ${version}, this build understands ${SCHEMA_VERSION}). Please update the app.`,
    );
  }

  while (version < SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) throw new MigrationError(`No migration from file format ${version} to ${version + 1}.`);
    doc = step(doc);
    version += 1;
    doc.schemaVersion = version;
  }

  doc.schemaVersion = SCHEMA_VERSION;
  return doc;
}
