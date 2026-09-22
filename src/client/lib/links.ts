import type { CharacterDocument, Entry, EntryType } from '../../shared/schema';
import { stripMarkdown } from './format';

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

/** Every markdown body in the document that can carry links, and where it lives. */
interface SourceBase {
  id: string;
  label: string;
  body: string;
  /** Marked secret by the player; hidden from snippets while hide-secrets mode is on. */
  secret: boolean;
}
export type LinkSource =
  | (SourceBase & { kind: 'entry'; typeId: string })
  | (SourceBase & { kind: 'section' })
  | (SourceBase & { kind: 'capture' })
  | (SourceBase & { kind: 'session' })
  | (SourceBase & { kind: 'transaction' })
  | (SourceBase & { kind: 'goal' });

export function linkSources(doc: CharacterDocument): LinkSource[] {
  return [
    ...doc.entries.map((entry): LinkSource => ({
      kind: 'entry',
      id: entry.id,
      label: entry.title || 'Untitled',
      typeId: entry.typeId,
      body: entry.body,
      secret: entry.secret,
    })),
    ...doc.profile.sections.map((section): LinkSource => ({
      kind: 'section',
      id: section.id,
      label: section.title || 'Untitled section',
      body: section.body,
      secret: section.secret,
    })),
    ...doc.captures.map((capture): LinkSource => ({
      kind: 'capture',
      id: capture.id,
      label: 'Inbox',
      body: capture.body,
      secret: false,
    })),
    ...doc.sessions.map((session): LinkSource => ({
      kind: 'session',
      id: session.id,
      label: session.title || session.date,
      body: session.body,
      secret: false,
    })),
    ...doc.transactions.map((transaction): LinkSource => ({
      kind: 'transaction',
      id: transaction.id,
      label: `${transaction.amount < 0 ? '−' : '+'}${Math.abs(transaction.amount).toLocaleString()} septims`,
      body: transaction.description,
      secret: transaction.secret,
    })),
    ...doc.goals.map((goal): LinkSource => ({
      kind: 'goal',
      id: goal.id,
      label: goal.title || 'Untitled goal',
      body: goal.notes,
      secret: goal.secret,
    })),
  ];
}

export interface Backlink {
  source: LinkSource;
  /** The sentence around the first mention, split so the link text can be emphasised. */
  before: string;
  title: string;
  after: string;
  /** How many times the source mentions the entry. */
  mentions: number;
}

const SNIPPET_RADIUS = 72;

function snippetAround(body: string, link: ParsedLink): Pick<Backlink, 'before' | 'title' | 'after'> {
  const lineStart = body.lastIndexOf('\n', link.start - 1) + 1;
  const lineEndAt = body.indexOf('\n', link.end);
  const lineEnd = lineEndAt === -1 ? body.length : lineEndAt;
  const before = stripMarkdown(body.slice(lineStart, link.start)).trimStart();
  const after = stripMarkdown(body.slice(link.end, lineEnd)).trimEnd();
  return {
    before: before.length > SNIPPET_RADIUS ? `…${before.slice(-SNIPPET_RADIUS)}` : before,
    title: link.title,
    after: after.length > SNIPPET_RADIUS ? `${after.slice(0, SNIPPET_RADIUS)}…` : after,
  };
}

/** Everything that links to `entryId`, one row per source, computed on demand. */
export function backlinksTo(doc: CharacterDocument, entryId: string, hideSecrets = false): Backlink[] {
  const backlinks: Backlink[] = [];
  for (const source of linkSources(doc)) {
    if (source.kind === 'entry' && source.id === entryId) continue;
    if (hideSecrets && source.secret) continue;
    const mentions = parseLinks(source.body).filter(
      (link) => resolveLink(doc.entries, doc.entryTypes, link.title, link.typeName)?.id === entryId,
    );
    const first = mentions[0];
    if (!first) continue;
    backlinks.push({ source, ...snippetAround(source.body, first), mentions: mentions.length });
  }
  return backlinks;
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
  for (const transaction of doc.transactions) transaction.description = rewrite(transaction.description);
  for (const goal of doc.goals) goal.notes = rewrite(goal.notes);
}
