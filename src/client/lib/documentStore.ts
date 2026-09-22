import { useSyncExternalStore } from 'react';
import type { CharacterDocument, Entry, EntryType, PaletteColor, Tag } from '../../shared/schema';
import { SCHEMA_VERSION } from '../../shared/schema';
import { newId } from '../../shared/defaults';
import { api, errorMessage } from './api';

export const SAVE_DEBOUNCE_MS = 800;

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface DocumentState {
  doc: CharacterDocument | null;
  saveState: SaveState;
  saveError: string | null;
}

let state: DocumentState = { doc: null, saveState: 'idle', saveError: null };
const listeners = new Set<() => void>();

function publish(patch: Partial<DocumentState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = (): DocumentState => state;

export function useDocumentState(): DocumentState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/* -------------------------------------------------------------------------- */
/* Autosave                                                                    */
/* -------------------------------------------------------------------------- */

let revision = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;

function cancelPending(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

async function save(): Promise<void> {
  if (inFlight) await inFlight.catch(() => undefined);
  const doc = state.doc;
  if (!doc) return;
  const savingRevision = revision;
  const run = (async () => {
    try {
      await api.saveCharacter(doc);
      // Stay in "Saving…" if the user has typed again since this request began.
      if (revision === savingRevision) publish({ saveState: 'saved', saveError: null });
    } catch (error) {
      publish({ saveState: 'error', saveError: errorMessage(error) });
    }
  })();
  inFlight = run;
  await run;
  if (inFlight === run) inFlight = null;
}

function scheduleSave(): void {
  publish({ saveState: 'saving' });
  cancelPending();
  timer = setTimeout(() => {
    timer = null;
    void save();
  }, SAVE_DEBOUNCE_MS);
}

/** Awaited before switching or closing a character so nothing is left unsaved. */
export async function flushSave(): Promise<void> {
  if (timer) {
    cancelPending();
    await save();
  } else if (inFlight) {
    await inFlight.catch(() => undefined);
  }
}

export async function retrySave(): Promise<void> {
  publish({ saveState: 'saving' });
  await save();
}

/* -------------------------------------------------------------------------- */
/* Document lifecycle                                                          */
/* -------------------------------------------------------------------------- */

export function openDocument(doc: CharacterDocument): void {
  cancelPending();
  revision += 1;
  publish({ doc, saveState: 'idle', saveError: null });
}

export function closeDocument(): void {
  cancelPending();
  revision += 1;
  publish({ doc: null, saveState: 'idle', saveError: null });
}

/**
 * The single write path. Callers mutate a structural clone; the store stamps
 * `updatedAt` and queues a debounced full-document save.
 */
export function mutate(recipe: (draft: CharacterDocument) => void): void {
  const current = state.doc;
  if (!current) return;
  const draft = structuredClone(current);
  recipe(draft);
  draft.schemaVersion = SCHEMA_VERSION;
  draft.updatedAt = new Date().toISOString();
  revision += 1;
  publish({ doc: draft });
  scheduleSave();
}

const stamp = (): string => new Date().toISOString();

/* -------------------------------------------------------------------------- */
/* Entries                                                                     */
/* -------------------------------------------------------------------------- */

export function createEntry(type: EntryType, title = ''): string {
  const id = newId();
  mutate((draft) => {
    const entry: Entry = {
      id,
      typeId: type.id,
      title,
      tagIds: [],
      fields: {},
      body: '',
      pinned: false,
      secret: false,
      createdAt: stamp(),
      updatedAt: stamp(),
      ...(type.features.status ? { status: 'active' as const } : {}),
    };
    draft.entries.unshift(entry);
  });
  return id;
}

export function updateEntry(id: string, recipe: (entry: Entry) => void): void {
  mutate((draft) => {
    const entry = draft.entries.find((candidate) => candidate.id === id);
    if (!entry) return;
    recipe(entry);
    entry.updatedAt = stamp();
  });
}

export function deleteEntry(id: string): void {
  mutate((draft) => {
    draft.entries = draft.entries.filter((entry) => entry.id !== id);
  });
}

export function duplicateEntry(id: string): string | null {
  const source = state.doc?.entries.find((entry) => entry.id === id);
  if (!source) return null;
  const copy: Entry = {
    ...structuredClone(source),
    id: newId(),
    title: `${source.title} (copy)`,
    createdAt: stamp(),
    updatedAt: stamp(),
  };
  mutate((draft) => {
    const index = draft.entries.findIndex((entry) => entry.id === id);
    draft.entries.splice(index + 1, 0, copy);
  });
  return copy.id;
}

/* -------------------------------------------------------------------------- */
/* Tags                                                                        */
/* -------------------------------------------------------------------------- */

export function createTag(name: string, color: PaletteColor, group?: string): Tag {
  const tag: Tag = { id: newId(), name: name.trim(), color, ...(group?.trim() ? { group: group.trim() } : {}) };
  mutate((draft) => {
    draft.tags.push(tag);
  });
  return tag;
}

export function updateTag(id: string, recipe: (tag: Tag) => void): void {
  mutate((draft) => {
    const tag = draft.tags.find((candidate) => candidate.id === id);
    if (tag) recipe(tag);
  });
}

/** Deleting a tag also removes it from every entry that carried it. */
export function deleteTag(id: string): void {
  mutate((draft) => {
    draft.tags = draft.tags.filter((tag) => tag.id !== id);
    for (const entry of draft.entries) {
      if (entry.tagIds.includes(id)) entry.tagIds = entry.tagIds.filter((tagId) => tagId !== id);
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Entry types (sections)                                                      */
/* -------------------------------------------------------------------------- */

export function createEntryType(name: string, icon: string, color: PaletteColor): string {
  const id = newId();
  mutate((draft) => {
    draft.entryTypes.push({ id, name: name.trim(), icon, color, builtIn: false, fields: [], features: {} });
  });
  return id;
}

export function updateEntryType(id: string, recipe: (type: EntryType) => void): void {
  mutate((draft) => {
    const type = draft.entryTypes.find((candidate) => candidate.id === id);
    if (type) recipe(type);
  });
}

/** Removes the section and every entry filed under it. */
export function deleteEntryType(id: string): void {
  mutate((draft) => {
    draft.entryTypes = draft.entryTypes.filter((type) => type.id !== id);
    draft.entries = draft.entries.filter((entry) => entry.typeId !== id);
  });
}
