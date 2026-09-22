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
  /**
   * 1 -> 2: Phase 2 adds quick captures and the session log. Both are new
   * top-level collections; nothing existing is touched, read or reshaped, so
   * this is purely additive and safe to run twice.
   */
  1: (doc) => ({
    ...doc,
    captures: Array.isArray(doc.captures) ? doc.captures : [],
    sessions: Array.isArray(doc.sessions) ? doc.sessions : [],
  }),
  /**
   * 2 -> 3: Phase 3 adds the septim ledger and goals. Again two new top-level
   * collections and nothing else, so additive and idempotent.
   */
  2: (doc) => ({
    ...doc,
    transactions: Array.isArray(doc.transactions) ? doc.transactions : [],
    goals: Array.isArray(doc.goals) ? doc.goals : [],
  }),
  /**
   * 3 -> 4: entries gain an optional `portrait`. Nothing to transform — the
   * bump exists so an older build refuses a file it would silently strip.
   */
  3: (doc) => ({ ...doc }),
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
