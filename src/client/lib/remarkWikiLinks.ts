import { LINK_PATTERN } from './links';

/**
 * Turns `[[Title]]` / `[[Title|Type]]` inside markdown text into ordinary link
 * nodes whose href carries a private prefix, so the Markdown component can
 * render them as chips. Working on the syntax tree (rather than the raw string)
 * means code blocks and inline code are left alone for free.
 */

const HREF_PREFIX = '#wj-link:';

export function encodeWikiHref(title: string, typeName?: string): string {
  return `${HREF_PREFIX}${encodeURIComponent(title)}${typeName ? `|${encodeURIComponent(typeName)}` : ''}`;
}

export function decodeWikiHref(href: string): { title: string; typeName?: string } | null {
  if (!href.startsWith(HREF_PREFIX)) return null;
  const [title = '', typeName] = href.slice(HREF_PREFIX.length).split('|');
  try {
    return { title: decodeURIComponent(title), ...(typeName ? { typeName: decodeURIComponent(typeName) } : {}) };
  } catch {
    return null;
  }
}

/** The handful of mdast fields this plugin touches. */
interface MdNode {
  type: string;
  value?: string;
  url?: string;
  title?: string | null;
  children?: MdNode[];
}

function splitText(value: string): MdNode[] | null {
  const pieces: MdNode[] = [];
  let cursor = 0;
  for (const match of value.matchAll(LINK_PATTERN)) {
    const title = match[1]?.trim();
    if (!title) continue;
    const typeName = match[2]?.trim();
    const index = match.index ?? 0;
    if (index > cursor) pieces.push({ type: 'text', value: value.slice(cursor, index) });
    pieces.push({
      type: 'link',
      url: encodeWikiHref(title, typeName),
      title: null,
      children: [{ type: 'text', value: title }],
    });
    cursor = index + match[0].length;
  }
  if (pieces.length === 0) return null;
  if (cursor < value.length) pieces.push({ type: 'text', value: value.slice(cursor) });
  return pieces;
}

function walk(node: MdNode): void {
  if (!node.children) return;
  const next: MdNode[] = [];
  let changed = false;
  for (const child of node.children) {
    if (child.type === 'text' && typeof child.value === 'string') {
      const pieces = splitText(child.value);
      if (pieces) {
        next.push(...pieces);
        changed = true;
        continue;
      }
    } else if (child.type !== 'link') {
      walk(child); // never nest a link inside a link
    }
    next.push(child);
  }
  if (changed) node.children = next;
}

export function remarkWikiLinks() {
  return (tree: MdNode): void => {
    walk(tree);
  };
}
