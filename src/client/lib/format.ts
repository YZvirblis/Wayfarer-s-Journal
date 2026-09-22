const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Deliberately plain-spoken: "written 3 days ago" reads better than a date. */
export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const delta = Math.max(0, now - then);
  if (delta < MINUTE) return 'just now';
  if (delta < HOUR) {
    const minutes = Math.round(delta / MINUTE);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (delta < DAY) {
    const hours = Math.round(delta / HOUR);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (delta < 30 * DAY) {
    const days = Math.round(delta / DAY);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  return formatDate(iso);
}

/** Short enough to sit under a large stat number: "now", "3 min", "2 days". */
export function compactRelative(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const delta = Math.max(0, now - then);
  if (delta < MINUTE) return 'now';
  if (delta < HOUR) return `${Math.round(delta / MINUTE)} min`;
  if (delta < DAY) {
    const hours = Math.round(delta / HOUR);
    return `${hours} hr${hours === 1 ? '' : 's'}`;
  }
  const days = Math.round(delta / DAY);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`;
  return formatDate(iso);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** First meaningful line of a markdown body, for list previews. */
export function bodyPreview(body: string, limit = 130): string {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[\[([^[\]|\n]+?)(?:\|[^[\]|\n]+?)?\]\]/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
