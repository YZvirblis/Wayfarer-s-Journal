import type { CharacterDocument, Entry, EntryType } from '../../shared/schema';
import { formatCalendarLong, formatMonth } from './format';
import { chronological, formatSeptims, formatSigned, goalProgress, totals } from './ledger';
import { STATUS_META } from '../components/QuestStatus';

/**
 * A readable single-file rendering of a character: profile, then every
 * section in sidebar order, then sessions, a ledger summary, goals and the
 * inbox. `[[links]]` stay as written — they read fine as text.
 */
export interface MarkdownExportOptions {
  includeSecrets: boolean;
}

/** How many things the export would leave out with secrets excluded. */
export function countSecrets(doc: CharacterDocument): number {
  return (
    doc.profile.sections.filter((section) => section.secret).length +
    doc.entries.filter((entry) => entry.secret).length +
    doc.sessions.filter((session) => session.secret).length +
    doc.transactions.filter((transaction) => transaction.secret).length +
    doc.goals.filter((goal) => goal.secret).length
  );
}

const line = (label: string, value: string | undefined): string => (value && value.trim() ? `- **${label}:** ${value}\n` : '');

function renderEntry(doc: CharacterDocument, type: EntryType, entry: Entry): string {
  let out = `### ${entry.title || 'Untitled'}${entry.pinned ? ' 📌' : ''}${entry.secret ? ' *(secret)*' : ''}\n\n`;
  for (const field of type.fields) {
    const value = entry.fields[field.key];
    if (value !== undefined && String(value).trim()) out += line(field.label, String(value));
  }
  if (type.features.status) out += line('Status', STATUS_META[entry.status ?? 'active'].label);
  if (type.features.progress && entry.progress) out += line('Progress', `${entry.progress.current} / ${entry.progress.target}`);
  const tags = entry.tagIds.map((id) => doc.tags.find((tag) => tag.id === id)?.name).filter(Boolean);
  if (tags.length) out += line('Tags', tags.join(', '));
  if (entry.body.trim()) out += `\n${entry.body.trim()}\n`;
  return `${out}\n`;
}

export function renderMarkdown(doc: CharacterDocument, { includeSecrets }: MarkdownExportOptions): string {
  const keep = <T extends { secret: boolean }>(items: T[]): T[] => (includeSecrets ? items : items.filter((item) => !item.secret));
  const people = new Map(doc.entries.map((entry) => [entry.id, entry.title] as const));
  let out = `# ${doc.profile.name}\n\n`;
  out += `*Exported from Wayfarer's Journal on ${formatCalendarLong(new Date().toISOString().slice(0, 10))}.`;
  out += includeSecrets ? ' Secrets included.*\n\n' : ' Secrets left out.*\n\n';

  // Profile
  out += '## Profile\n\n';
  for (const field of doc.profile.fields) out += line(field.label, field.value);
  out += '\n';
  for (const section of keep(doc.profile.sections)) {
    out += `### ${section.title}${section.secret ? ' *(secret)*' : ''}\n\n${section.body.trim()}\n\n`;
  }

  // Sections in sidebar order
  for (const type of doc.entryTypes) {
    const entries = keep(doc.entries.filter((entry) => entry.typeId === type.id));
    if (entries.length === 0) continue;
    out += `## ${type.name} (${entries.length})\n\n`;
    for (const entry of entries) out += renderEntry(doc, type, entry);
  }

  // Sessions
  const sessions = keep(doc.sessions).sort((a, b) => b.date.localeCompare(a.date));
  if (sessions.length) {
    out += `## Sessions (${sessions.length})\n\n`;
    for (const session of sessions) {
      out += `### ${formatCalendarLong(session.date)}${session.title ? ` — ${session.title}` : ''}${session.secret ? ' *(secret)*' : ''}\n\n`;
      if (session.body.trim()) out += `${session.body.trim()}\n\n`;
    }
  }

  // Ledger summary
  const transactions = keep(doc.transactions);
  if (transactions.length) {
    const sums = totals(transactions);
    out += '## Ledger\n\n';
    out += `- **On hand:** ${sums.net < 0 ? '−' : ''}${formatSeptims(sums.net)} septims\n`;
    out += `- **Earned:** ${formatSeptims(sums.income)} · **Spent:** ${formatSeptims(sums.expense)} · ${transactions.length} lines\n\n`;
    const byMonth = new Map<string, number>();
    for (const transaction of transactions) {
      const key = transaction.date.slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + transaction.amount);
    }
    out += '| Month | Net |\n|---|---:|\n';
    for (const [key, net] of [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
      out += `| ${formatMonth(`${key}-01`)} | ${formatSigned(net)} |\n`;
    }
    out += '\n| Date | What | With | Amount |\n|---|---|---|---:|\n';
    for (const transaction of chronological(transactions).reverse()) {
      const what = transaction.description.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim() || '—';
      const who = transaction.counterpartyId ? (people.get(transaction.counterpartyId) ?? '') : '';
      out += `| ${transaction.date} | ${what}${transaction.secret ? ' *(secret)*' : ''} | ${who} | ${formatSigned(transaction.amount)} |\n`;
    }
    out += '\n';
  }

  // Goals
  const goals = keep(doc.goals);
  if (goals.length) {
    out += `## Goals (${goals.length})\n\n`;
    for (const goal of goals) {
      const progress = goalProgress(goal, doc.transactions);
      out += `### ${goal.title} — ${goal.kind === 'save' ? 'saving up' : 'paying off'}${goal.secret ? ' *(secret)*' : ''}\n\n`;
      out += `- **Target:** ${formatSeptims(goal.target)} · **So far:** ${formatSeptims(progress.done)} · **To go:** ${formatSeptims(progress.remaining)} (${Math.round(progress.ratio * 100)}%)\n`;
      if (goal.deadline) out += line('By', formatCalendarLong(goal.deadline));
      if (goal.notes.trim()) out += `\n${goal.notes.trim()}\n`;
      out += '\n';
    }
  }

  // Inbox
  if (doc.captures.length) {
    out += `## Inbox (${doc.captures.length})\n\n`;
    for (const capture of doc.captures) out += `- ${capture.body.replace(/\s*\n\s*/g, ' ')}\n`;
    out += '\n';
  }

  return out.trimEnd() + '\n';
}
