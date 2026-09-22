import { z } from 'zod';

/**
 * zod schemas are the single source of truth for the character file format.
 * Bump SCHEMA_VERSION and add a migration in src/server/migrations.ts whenever
 * this file changes shape.
 */
export const SCHEMA_VERSION = 5;

/** Curated accent palette. Tags and entry types store a key, not a hex value, so
 *  colours follow the active theme. */
export const PALETTE = ['gold', 'ember', 'copper', 'sage', 'frost', 'plum', 'rose'] as const;
export type PaletteColor = (typeof PALETTE)[number];
export const paletteColorSchema = z.enum(PALETTE).catch('gold');

export const ENTRY_STATUSES = ['active', 'on_hold', 'done', 'failed'] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];
export const entryStatusSchema = z.enum(ENTRY_STATUSES);

const isoDate = z.string().min(1);

export const fieldKindSchema = z.enum(['text', 'select', 'number']);
export type FieldKind = z.infer<typeof fieldKindSchema>;

export const fieldDefSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  kind: fieldKindSchema,
  options: z.array(z.string()).optional(),
});
export type FieldDef = z.infer<typeof fieldDefSchema>;

export const profileFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  value: z.string(),
});
export type ProfileField = z.infer<typeof profileFieldSchema>;

export const profileSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  body: z.string(),
  secret: z.boolean().default(false),
});
export type ProfileSection = z.infer<typeof profileSectionSchema>;

export const profileSchema = z.object({
  name: z.string(),
  portrait: z.string().optional(),
  fields: z.array(profileFieldSchema),
  sections: z.array(profileSectionSchema),
});
export type Profile = z.infer<typeof profileSchema>;

export const tagSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  color: paletteColorSchema,
  group: z.string().optional(),
});
export type Tag = z.infer<typeof tagSchema>;

export const entryTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  icon: z.string(),
  color: paletteColorSchema,
  builtIn: z.boolean(),
  fields: z.array(fieldDefSchema),
  features: z.object({
    status: z.boolean().optional(),
    progress: z.boolean().optional(),
  }),
});
export type EntryType = z.infer<typeof entryTypeSchema>;

export const progressSchema = z.object({
  current: z.number(),
  target: z.number(),
});
export type Progress = z.infer<typeof progressSchema>;

export const entrySchema = z.object({
  id: z.string().min(1),
  typeId: z.string().min(1),
  title: z.string(),
  tagIds: z.array(z.string()),
  fields: z.record(z.string(), z.union([z.string(), z.number()])),
  body: z.string(),
  status: entryStatusSchema.optional(),
  progress: progressSchema.optional(),
  /** Small square image as a data URL (≤ 256px). Added in schemaVersion 4. */
  portrait: z.string().optional(),
  pinned: z.boolean().default(false),
  secret: z.boolean().default(false),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Entry = z.infer<typeof entrySchema>;

/** A line jotted mid-scene, waiting to be filed. Added in schemaVersion 2. */
export const captureSchema = z.object({
  id: z.string().min(1),
  body: z.string(),
  createdAt: isoDate,
});
export type Capture = z.infer<typeof captureSchema>;

/**
 * One sitting at the table. Added in schemaVersion 2. Sessions carry no
 * `entryIds`: what a session references is whatever its body links to, the same
 * rule entries follow, so there is only one kind of link in the app.
 */
export const sessionSchema = z.object({
  id: z.string().min(1),
  date: z.string(), // YYYY-MM-DD
  title: z.string(),
  body: z.string(),
  /** Added in schemaVersion 5: a whole night can be nobody's business. */
  secret: z.boolean().default(false),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Session = z.infer<typeof sessionSchema>;

/**
 * One movement of septims. Added in schemaVersion 3. Positive amounts are
 * income, negative are expenses. `counterpartyId` points at a People entry;
 * `goalId` ties the transaction to a goal, whose progress is derived from it.
 */
export const transactionSchema = z.object({
  id: z.string().min(1),
  date: z.string(), // YYYY-MM-DD
  amount: z.number(),
  description: z.string(), // markdown, may contain [[links]]
  counterpartyId: z.string().optional(),
  tagIds: z.array(z.string()).default([]),
  goalId: z.string().optional(),
  secret: z.boolean().default(false),
  createdAt: isoDate,
});
export type Transaction = z.infer<typeof transactionSchema>;

export const GOAL_KINDS = ['save', 'debt'] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];

/** A sum to save up, or a debt to pay down. Added in schemaVersion 3. Progress is
 *  never stored: it is the sum of the transactions carrying the goal's id. */
export const goalSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  kind: z.enum(GOAL_KINDS),
  target: z.number(),
  deadline: z.string().optional(), // YYYY-MM-DD
  notes: z.string().default(''), // markdown
  secret: z.boolean().default(false),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Goal = z.infer<typeof goalSchema>;

export const characterDocumentSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  createdAt: isoDate,
  updatedAt: isoDate,
  profile: profileSchema,
  tags: z.array(tagSchema),
  entryTypes: z.array(entryTypeSchema),
  entries: z.array(entrySchema),
  captures: z.array(captureSchema).default([]),
  sessions: z.array(sessionSchema).default([]),
  transactions: z.array(transactionSchema).default([]),
  goals: z.array(goalSchema).default([]),
});
export type CharacterDocument = z.infer<typeof characterDocumentSchema>;

/** What the character-select screen needs. Cheap to build from a full document. */
export interface CharacterSummary {
  id: string;
  name: string;
  race: string;
  trade: string;
  entryCount: number;
  updatedAt: string;
  portrait?: string;
}

/** What an import found in a file, shown before anything is written. */
export interface ImportSummary {
  name: string;
  race: string;
  trade: string;
  fromVersion: number;
  toVersion: number;
  counts: {
    entries: number;
    sections: number;
    tags: number;
    sessions: number;
    transactions: number;
    goals: number;
    captures: number;
  };
  /** A character with this name already exists; the import still creates a new one. */
  duplicateName: boolean;
}

export interface ImportResult {
  summary: ImportSummary;
  /** Present when the import was committed. */
  document?: CharacterDocument;
}

export const THEMES = ['dark', 'parchment'] as const;
export type Theme = (typeof THEMES)[number];

export const settingsSchema = z.object({
  theme: z.enum(THEMES).catch('dark'),
  lastCharacterId: z.string().nullable().default(null),
  /** Blur everything marked secret, for screenshots and streaming. */
  hideSecrets: z.boolean().catch(false),
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = { theme: 'dark', lastCharacterId: null, hideSecrets: false };
