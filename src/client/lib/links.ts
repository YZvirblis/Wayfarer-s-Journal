import type { CharacterDocument, Entry, EntryType } from '../../shared/schema';

/**
 * `[[Entry Title]]` links. The optional qualifier `[[Title|Type]]` names the
 * entry type (by its section name) and exists only to tell apart two entries
 * that share a title. Titles cannot contain `[`, `]`, `|` or a line break.
 */
export const LINK_PATTERN = /\[\[([^[\]|\n]+?)(?:\|([^[\]|\n]+?))?\]\]/g;

export interface ParsedLink {
  title: string;
  typeName?: string;
  /** Offset of the opening `[[`. */
  start: number;
  /** Offset just past the closing `]]`. */
  end: number;
}

/** Titles match case-insensitively, ignoring surrounding and repeated whitespace. */
export const normalizeTitle = (title: string): string => title.trim().replace(/\s+/g, ' ').toLowerCase();

export function parseLinks(text: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  for (const match of text.matchAll(LINK_PATTERN)) {
    const title = match[1]?.trim() ?? '';
    const typeName = match[2]?.trim();
    if (!title) continue;
    links.push({
      title,
      ...(typeName ? { typeName } : {}),
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    });
  }
  return links;
}

export const formatLink = (title: string, typeName?: string): string =>
  typeName ? `[[${title}|${typeName}]]` : `[[${title}]]`;

function findType(entryTypes: EntryType[], typeName: string): EntryType | undefined {
  const wanted = normalizeTitle(typeName);
  return entryTypes.find((type) => normalizeTitle(type.name) === wanted);
}

/**
 * Resolve a link to an entry. With a qualifier that names a real type, only
 * entries of that type are considered; an unknown qualifier is ignored rather
 * than breaking the link. Among namesakes the oldest wins, so a link keeps
 * pointing where it pointed when it was written even after a newer entry
 * borrows the same title.
 */
export function resolveLink(entries: Entry[], entryTypes: EntryType[], title: string, typeName?: string): Entry | null {
  const wanted = normalizeTitle(title);
  if (!wanted) return null;
  const typeId = typeName ? findType(entryTypes, typeName)?.id : undefined;
  let best: Entry | null = null;
  for (const entry of entries) {
    if (normalizeTitle(entry.title) !== wanted || (typeId !== undefined && entry.typeId !== typeId)) continue;
    if (!best || entry.createdAt < best.createdAt) best = entry;
  }
  return best;
}

/** How many entries share a (normalised) title, for deciding when a link needs a qualifier. */
export function titleCounts(entries: Entry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const key = normalizeTitle(entry.title);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Rewrite every link in the document that resolves to `entryId` so it reads
 * `newTitle`. Must run while the entry still carries its old title, since that
 * is what the existing links are resolved against. Mutates `doc` in place — it
 * is meant to be called inside a store `mutate` recipe.
 */
export function rewriteLinksTo(doc: CharacterDocument, entryId: string, newTitle: string): void {
  const entry = doc.entries.find((candidate) => candidate.id === entryId);
  if (!entry) return;
  const wanted = normalizeTitle(newTitle);
  const collides = doc.entries.some((other) => other.id !== entryId && normalizeTitle(other.title) === wanted);
  const ownType = doc.entryTypes.find((type) => type.id === entry.typeId);

  const rewrite = (body: string): string =>
    body.replace(LINK_PATTERN, (raw: string, title: string, typeName?: string) => {
      const target = resolveLink(doc.entries, doc.entryTypes, title, typeName);
      if (!target || target.id !== entryId) return raw;
      const qualifier = typeName?.trim() || (collides && ownType ? ownType.name : undefined);
      return formatLink(newTitle.trim(), qualifier);
    });

  for (const other of doc.entries) other.body = rewrite(other.body);
  for (const section of doc.profile.sections) section.body = rewrite(section.body);
  for (const capture of doc.captures) capture.body = rewrite(capture.body);
  for (const session of doc.sessions) session.body = rewrite(session.body);
}
