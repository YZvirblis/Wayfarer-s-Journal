import { BUILT_IN_TYPE_IDS } from '../../shared/defaults';
import type { CharacterDocument, Entry, PaletteColor } from '../../shared/schema';
import { normalizeTitle, parseLinks, resolveLink } from './links';

/**
 * The relationship web: People, Factions and Places as nodes, plus the
 * character at the centre. Edges come from `[[links]]` in either direction,
 * from People who share a location, and from ledger counterparties. Everything
 * here is pure; WebView feeds it to d3-force.
 */

export const SELF_ID = '__self__';

export interface GraphNode {
  id: string;
  kind: 'self' | 'entry';
  typeId: string;
  title: string;
  subtitle: string;
  color: PaletteColor;
  secret: boolean;
  tagIds: string[];
  /** Distinct neighbours. */
  degree: number;
  standing?: string;
  // d3-force fills these in.
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export type EdgeKind = 'link' | 'location' | 'coin';

export interface GraphEdge {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  kind: EdgeKind;
  /** How many facts back this edge (mentions, shared dealings…). */
  weight: number;
  label: string;
  /** The People standing on this edge, when one end is a person. */
  standing?: string;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const NODE_TYPES: string[] = [BUILT_IN_TYPE_IDS.people, BUILT_IN_TYPE_IDS.factions, BUILT_IN_TYPE_IDS.places];

const endpoints = (edge: GraphEdge): [string, string] => [
  typeof edge.source === 'string' ? edge.source : edge.source.id,
  typeof edge.target === 'string' ? edge.target : edge.target.id,
];

function subtitleFor(entry: Entry): string {
  const value = entry.fields.role ?? entry.fields.base ?? entry.fields.hold ?? entry.fields.location;
  return value === undefined ? '' : String(value);
}

interface BuildOptions {
  /** Only entries carrying every one of these tags are shown. */
  tagIds: string[];
  hideSecrets: boolean;
}

export function buildGraph(doc: CharacterDocument, { tagIds, hideSecrets }: BuildOptions): Graph {
  const typesById = new Map(doc.entryTypes.map((type) => [type.id, type] as const));
  const candidates = doc.entries.filter((entry) => NODE_TYPES.includes(entry.typeId) && !(hideSecrets && entry.secret));
  const shown = candidates.filter((entry) => tagIds.every((tagId) => entry.tagIds.includes(tagId)));
  const shownIds = new Set(shown.map((entry) => entry.id));

  const nodes: GraphNode[] = [
    {
      id: SELF_ID,
      kind: 'self',
      typeId: SELF_ID,
      title: doc.profile.name,
      subtitle: 'This journal',
      color: 'gold',
      secret: false,
      tagIds: [],
      degree: 0,
    },
    ...shown.map(
      (entry): GraphNode => ({
        id: entry.id,
        kind: 'entry',
        typeId: entry.typeId,
        title: entry.title || 'Untitled',
        subtitle: subtitleFor(entry),
        color: typesById.get(entry.typeId)?.color ?? 'gold',
        secret: entry.secret,
        tagIds: entry.tagIds,
        degree: 0,
        ...(entry.typeId === BUILT_IN_TYPE_IDS.people && entry.fields.standing
          ? { standing: String(entry.fields.standing) }
          : {}),
      }),
    ),
  ];
  const nodesById = new Map(nodes.map((node) => [node.id, node] as const));

  const edges = new Map<string, GraphEdge>();
  function connect(a: string, b: string, kind: EdgeKind, label: string): void {
    if (a === b || !nodesById.has(a) || !nodesById.has(b)) return;
    const [source, target] = a < b ? [a, b] : [b, a];
    const key = `${kind}:${source}|${target}`;
    const existing = edges.get(key);
    if (existing) {
      existing.weight += 1;
      return;
    }
    const standing = nodesById.get(a)?.standing ?? nodesById.get(b)?.standing;
    edges.set(key, { id: key, source, target, kind, weight: 1, label, ...(standing ? { standing } : {}) });
  }

  // 1. [[links]] between node entries, in either direction. Only node entries are
  //    parsed: a Quest linking two people does not make them neighbours.
  for (const entry of shown) {
    for (const link of parseLinks(entry.body)) {
      const target = resolveLink(doc.entries, doc.entryTypes, link.title, link.typeName);
      if (target && shownIds.has(target.id)) connect(entry.id, target.id, 'link', 'mentions');
    }
  }

  // 2. Shared locations: a person whose "usually found" names a Place is tied to
  //    it; people who share a location string with no such Place are tied to
  //    each other (chained to the first, so a busy tavern is not a clique).
  const places = shown.filter((entry) => entry.typeId === BUILT_IN_TYPE_IDS.places);
  const byLocation = new Map<string, Entry[]>();
  for (const person of shown) {
    if (person.typeId !== BUILT_IN_TYPE_IDS.people) continue;
    const location = normalizeTitle(String(person.fields.location ?? ''));
    if (!location) continue;
    const place = places.find((candidate) => {
      const name = normalizeTitle(candidate.title);
      return name.length > 2 && (location === name || location.includes(name));
    });
    if (place) connect(person.id, place.id, 'location', `found at ${place.title}`);
    else byLocation.set(location, [...(byLocation.get(location) ?? []), person]);
  }
  for (const [location, group] of byLocation) {
    const [first, ...rest] = group;
    if (!first) continue;
    for (const other of rest) connect(first.id, other.id, 'location', `both at ${location}`);
  }

  // 3. Ledger counterparties tie a person to the character.
  const dealings = new Map<string, number>();
  for (const transaction of doc.transactions) {
    if (hideSecrets && transaction.secret) continue;
    if (transaction.counterpartyId && shownIds.has(transaction.counterpartyId)) {
      dealings.set(transaction.counterpartyId, (dealings.get(transaction.counterpartyId) ?? 0) + 1);
    }
  }
  for (const [personId, count] of dealings) {
    connect(SELF_ID, personId, 'coin', `${count} dealing${count === 1 ? '' : 's'}`);
    const edge = edges.get(`coin:${SELF_ID < personId ? SELF_ID : personId}|${SELF_ID < personId ? personId : SELF_ID}`);
    if (edge) edge.weight = count;
  }

  const neighbours = new Map<string, Set<string>>();
  for (const edge of edges.values()) {
    const [a, b] = endpoints(edge);
    neighbours.set(a, (neighbours.get(a) ?? new Set()).add(b));
    neighbours.set(b, (neighbours.get(b) ?? new Set()).add(a));
  }
  for (const node of nodes) node.degree = neighbours.get(node.id)?.size ?? 0;

  return { nodes, edges: [...edges.values()] };
}

export { endpoints };
