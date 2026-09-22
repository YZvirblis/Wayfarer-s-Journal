import { AtSign, Check, Coins, EyeOff, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { BUILT_IN_TYPE_IDS } from '../../shared/defaults';
import type { CharacterDocument, Entry, Transaction } from '../../shared/schema';
import { cn } from '../lib/cn';
import { addTransaction, deleteTransaction, updateTransaction } from '../lib/documentStore';
import { formatCalendarShort, formatMonth, localDate } from '../lib/format';
import { fuzzyScore } from '../lib/fuzzy';
import { formatAmount, formatSigned, parseQuickEntry, totals, withRunningBalance, type LedgerRow } from '../lib/ledger';
import { useLinks } from '../lib/linkContext';
import { normalizeTitle } from '../lib/links';
import { useSettings } from '../lib/settingsStore';
import { LinkTextarea } from './LinkTextarea';
import { Markdown } from './Markdown';
import { TagChip } from './TagChip';
import { TagRow } from './TagPicker';
import { ArmedButton } from './ui/ArmedButton';
import { Button, IconButton } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { SegmentedControl } from './ui/SegmentedControl';
import { Tooltip } from './ui/Tooltip';
import { Veil } from './ui/Veil';

const DIRECTIONS = [
  { value: 'spent' as const, label: 'Spent' },
  { value: 'earned' as const, label: 'Earned' },
];

/* -------------------------------------------------------------------------- */
/* Quick entry: "40 back room at the Kettle @Bre…"                             */
/* -------------------------------------------------------------------------- */

function mentionAt(value: string, caret: number): { start: number; query: string } | null {
  const before = value.slice(0, caret);
  const start = before.lastIndexOf('@');
  if (start === -1) return null;
  const query = before.slice(start + 1);
  if (/\n/.test(query) || query.length > 40) return null;
  return { start, query };
}

function QuickEntry({ people, defaultCounterpartyId }: { people: Entry[]; defaultCounterpartyId: string | null }) {
  const [line, setLine] = useState('');
  const [direction, setDirection] = useState<'spent' | 'earned'>('spent');
  const [date, setDate] = useState(localDate);
  const [counterpartyId, setCounterpartyId] = useState<string | null>(defaultCounterpartyId);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [active, setActive] = useState(0);

  const parsed = parseQuickEntry(line);
  const canAdd = parsed.amount !== null && parsed.amount !== 0;
  const counterparty = people.find((person) => person.id === counterpartyId) ?? null;

  const suggestions = useMemo(() => {
    if (!mention) return [];
    const needle = mention.query.trim();
    return people
      .flatMap((person) => {
        const score = fuzzyScore(needle, person.title);
        return score === null ? [] : [{ person, score }];
      })
      .sort((a, b) => b.score - a.score || a.person.title.localeCompare(b.person.title))
      .slice(0, 6)
      .map(({ person }) => person);
  }, [mention, people]);

  function refresh(element: HTMLInputElement) {
    const next = mentionAt(element.value, element.selectionStart ?? element.value.length);
    setMention(next);
    if (!next) setActive(0);
  }

  function pickPerson(person: Entry) {
    if (mention) setLine((current) => `${current.slice(0, mention.start)}${current.slice(mention.start + 1 + mention.query.length)}`.replace(/\s{2,}/g, ' '));
    setCounterpartyId(person.id);
    setMention(null);
  }

  function add() {
    if (parsed.amount === null || parsed.amount === 0) return;
    const magnitude = Math.abs(parsed.amount);
    const amount = parsed.signed ? parsed.amount : direction === 'spent' ? -magnitude : magnitude;
    addTransaction({
      date,
      amount,
      description: parsed.description,
      ...(counterpartyId ? { counterpartyId } : {}),
    });
    setLine('');
    setCounterpartyId(defaultCounterpartyId);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (mention && suggestions.length > 0) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        setActive((index) => (index + delta + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const chosen = suggestions[Math.min(active, suggestions.length - 1)];
        if (chosen) {
          event.preventDefault();
          pickPerson(chosen);
          return;
        }
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setMention(null);
        return;
      }
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    }
  }

  return (
    <div className="wj-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl value={direction} options={DIRECTIONS} onChange={setDirection} />
        <div className="relative min-w-[14rem] flex-1">
          <input
            value={line}
            onChange={(event) => {
              setLine(event.target.value);
              refresh(event.target);
            }}
            onSelect={(event) => refresh(event.currentTarget)}
            onKeyDown={onKeyDown}
            onBlur={() => setMention(null)}
            placeholder="40 for a room at the inn — type @ to name who it was with"
            aria-label="Amount and description"
            className="wj-field h-9 py-0 text-sm"
          />
          {mention && suggestions.length > 0 ? (
            <div
              role="listbox"
              className="absolute left-0 top-full z-30 mt-1 w-72 animate-scale-in rounded-card border bg-panel p-1 shadow-lifted"
            >
              {suggestions.map((person, index) => (
                <button
                  key={person.id}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pickPerson(person)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
                    index === active ? 'bg-gold/10 text-ink' : 'text-ink/85',
                  )}
                >
                  <AtSign className="h-3.5 w-3.5 shrink-0 text-gold" />
                  <span className="min-w-0 flex-1 truncate">{person.title}</span>
                  {person.fields.role ? (
                    <span className="min-w-0 max-w-[45%] truncate text-2xs text-faint">{String(person.fields.role)}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <input
          type="date"
          value={date}
          onChange={(event) => event.target.value && setDate(event.target.value)}
          aria-label="Date"
          className="wj-field h-9 w-auto py-0 text-xs"
        />
        <Button variant="primary" size="md" onClick={add} disabled={!canAdd}>
          <Plus className="h-3.5 w-3.5" />
          {canAdd ? `Add ${formatSigned(parsed.signed ? (parsed.amount ?? 0) : direction === 'spent' ? -(parsed.amount ?? 0) : (parsed.amount ?? 0))}` : 'Add'}
        </Button>
      </div>
      {counterparty ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <span>with</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/25 bg-gold/10 px-2 py-px text-gold">
            {counterparty.title}
            <button type="button" onClick={() => setCounterpartyId(null)} aria-label="Remove counterparty" className="opacity-70 hover:opacity-100">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Rows                                                                        */
/* -------------------------------------------------------------------------- */

function Editor({ doc, transaction, people, onDone }: { doc: CharacterDocument; transaction: Transaction; people: Entry[]; onDone: () => void }) {
  const set = (recipe: (draft: Transaction) => void) => updateTransaction(transaction.id, recipe);
  return (
    <div className="mt-2 space-y-3 rounded border border-line/15 bg-ground/30 p-3">
      <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr]">
        <label className="block">
          <span className="wj-label mb-1 block">Date</span>
          <input
            type="date"
            value={transaction.date}
            onChange={(event) => event.target.value && set((draft) => void (draft.date = event.target.value))}
            className="wj-field h-8 w-auto py-0 text-xs"
          />
        </label>
        <label className="block">
          <span className="wj-label mb-1 block">Amount</span>
          <input
            type="number"
            value={transaction.amount}
            onChange={(event) => set((draft) => void (draft.amount = Number(event.target.value) || 0))}
            className="wj-field h-8 w-28 py-0 text-sm tabular-nums"
          />
        </label>
        <label className="block">
          <span className="wj-label mb-1 block">With</span>
          <select
            value={transaction.counterpartyId ?? ''}
            onChange={(event) =>
              set((draft) => {
                if (event.target.value) draft.counterpartyId = event.target.value;
                else delete draft.counterpartyId;
              })
            }
            className="wj-field h-8 py-0 text-sm"
          >
            <option value="">— nobody in particular</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <span className="wj-label mb-1 block">What for</span>
        <LinkTextarea
          value={transaction.description}
          onChange={(value) => set((draft) => void (draft.description = value))}
          placeholder="What changed hands, and why. [[links]] work here."
          minHeight={40}
          className="wj-field text-sm leading-relaxed"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="wj-label mb-1 block">Toward a goal</span>
          <select
            value={transaction.goalId ?? ''}
            onChange={(event) =>
              set((draft) => {
                if (event.target.value) draft.goalId = event.target.value;
                else delete draft.goalId;
              })
            }
            className="wj-field h-8 py-0 text-sm"
          >
            <option value="">— none</option>
            {doc.goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="wj-label mb-1 block">Tags</span>
          <TagRow
            tags={doc.tags}
            selected={transaction.tagIds}
            onToggle={(tagId) =>
              set((draft) => {
                draft.tagIds = draft.tagIds.includes(tagId)
                  ? draft.tagIds.filter((id) => id !== tagId)
                  : [...draft.tagIds, tagId];
              })
            }
          />
        </div>
      </div>
      <div className="flex items-center gap-2 border-t pt-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={transaction.secret}
            onChange={(event) => set((draft) => void (draft.secret = event.target.checked))}
            className="h-3.5 w-3.5 accent-[rgb(var(--wj-gold))]"
          />
          Secret
        </label>
        <div className="ml-auto flex items-center gap-1">
          <ArmedButton
            armedLabel={
              <>
                <Trash2 className="h-3 w-3" />
                Sure? Delete
              </>
            }
            onConfirm={() => {
              deleteTransaction(transaction.id);
              onDone();
            }}
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </ArmedButton>
          <Button variant="secondary" size="sm" onClick={onDone}>
            <Check className="h-3 w-3" />
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({
  doc,
  row,
  people,
  editing,
  onEdit,
}: {
  doc: CharacterDocument;
  row: LedgerRow;
  people: Entry[];
  editing: boolean;
  onEdit: (id: string | null) => void;
}) {
  const { transaction } = row;
  const { openEntry } = useLinks();
  const { hideSecrets } = useSettings();
  const counterparty = transaction.counterpartyId ? people.find((person) => person.id === transaction.counterpartyId) : undefined;
  const goal = transaction.goalId ? doc.goals.find((candidate) => candidate.id === transaction.goalId) : undefined;
  const tags = transaction.tagIds.map((id) => doc.tags.find((tag) => tag.id === id)).filter(Boolean);
  const income = transaction.amount >= 0;

  return (
    <li className="group/row">
      <Veil hidden={hideSecrets && transaction.secret} label="Secret line">
      <div className="grid grid-cols-[4.75rem_1fr_auto] items-start gap-x-3 rounded px-2 py-2 transition-colors hover:bg-ink/[0.03] sm:grid-cols-[4.75rem_1fr_auto_5rem]">
        <span className="pt-0.5 font-display text-2xs uppercase leading-snug tracking-[0.1em] text-faint">
          {formatCalendarShort(transaction.date)}
        </span>
        <div className="min-w-0">
          {transaction.description.trim() ? (
            <Markdown className="text-[0.95rem] leading-snug [&_p]:mt-0">{transaction.description}</Markdown>
          ) : (
            <span className="text-sm italic text-faint">No description</span>
          )}
          {counterparty || goal || tags.length > 0 || transaction.secret ? (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {counterparty ? (
                <button
                  type="button"
                  onClick={() => openEntry(counterparty.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-gold/25 bg-gold/10 px-2 py-px text-2xs text-gold hover:brightness-110"
                >
                  <AtSign className="h-2.5 w-2.5" />
                  {counterparty.title}
                </button>
              ) : null}
              {goal ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-line/20 px-2 py-px text-2xs text-muted">
                  ◆ {goal.title}
                </span>
              ) : null}
              {tags.map((tag) => (tag ? <TagChip key={tag.id} tag={tag} size="sm" active /> : null))}
              {transaction.secret ? <EyeOff className="h-3 w-3 text-plum/80" aria-label="Secret" /> : null}
            </div>
          ) : null}
        </div>
        <div className="flex items-start gap-1">
          <span className={cn('pt-0.5 text-sm tabular-nums', income ? 'text-sage' : 'text-rose/90')}>
            {formatSigned(transaction.amount)}
          </span>
          <Tooltip label="Edit">
            <IconButton
              variant="ghost"
              size="xs"
              className={cn(' opacity-0 transition-opacity focus-visible:opacity-100 group-hover/row:opacity-100', editing && 'opacity-100 text-gold')}
              aria-label="Edit transaction"
              onClick={() => onEdit(editing ? null : transaction.id)}
            >
              <Pencil />
            </IconButton>
          </Tooltip>
        </div>
        <span className="hidden pt-0.5 text-right text-xs tabular-nums text-faint sm:block">{formatAmount(row.balance)}{row.balance < 0 ? ' dr' : ''}</span>
      </div>
      {editing ? <Editor doc={doc} transaction={transaction} people={people} onDone={() => onEdit(null)} /> : null}
      </Veil>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* The view                                                                    */
/* -------------------------------------------------------------------------- */

interface LedgerViewProps {
  doc: CharacterDocument;
  /** Preselected counterparty filter, e.g. from a person's "Dealings" panel. */
  counterpartyId: string | null;
  onFilterCounterparty: (id: string | null) => void;
}

export function LedgerView({ doc, counterpartyId, onFilterCounterparty }: LedgerViewProps) {
  const [tagId, setTagId] = useState<string>('');
  const [goalId, setGoalId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const people = useMemo(
    () =>
      doc.entries
        .filter((entry) => entry.typeId === BUILT_IN_TYPE_IDS.people)
        .sort((a, b) => normalizeTitle(a.title).localeCompare(normalizeTitle(b.title))),
    [doc.entries],
  );
  const counterparties = useMemo(() => {
    const used = new Set(doc.transactions.map((transaction) => transaction.counterpartyId).filter(Boolean));
    return people.filter((person) => used.has(person.id));
  }, [doc.transactions, people]);
  const usedTagIds = useMemo(() => new Set(doc.transactions.flatMap((transaction) => transaction.tagIds)), [doc.transactions]);

  const visible = useMemo(
    () =>
      doc.transactions.filter(
        (transaction) =>
          (!counterpartyId || transaction.counterpartyId === counterpartyId) &&
          (!tagId || transaction.tagIds.includes(tagId)) &&
          (!goalId || transaction.goalId === goalId),
      ),
    [doc.transactions, counterpartyId, tagId, goalId],
  );
  const rows = useMemo(
    () => withRunningBalance(doc.transactions, new Set(visible.map((transaction) => transaction.id))),
    [doc.transactions, visible],
  );
  const shown = totals(visible);
  const balance = totals(doc.transactions).net;
  const filtered = Boolean(counterpartyId || tagId || goalId);

  // Month groups, newest first, each with its own net.
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; rows: LedgerRow[]; net: number }>();
    for (const row of rows) {
      const key = row.transaction.date.slice(0, 7);
      const group = map.get(key) ?? { label: formatMonth(row.transaction.date), rows: [], net: 0 };
      group.rows.push(row);
      group.net += row.transaction.amount;
      map.set(key, group);
    }
    return [...map.values()];
  }, [rows]);

  return (
    <div className="wj-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-5 pb-24 pt-6 pane:px-10 pane:pt-8">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="wj-eyebrow">Coin in, coin out</p>
            <h2 className="mt-1 font-display text-[1.75rem] leading-tight tracking-title text-ink">Ledger</h2>
          </div>
          <div className="text-right">
            <p className={cn('font-display text-[1.9rem] leading-none tabular-nums tracking-title', balance < 0 ? 'text-rose' : 'text-gold/90')}>
              {balance < 0 ? '−' : ''}{formatAmount(balance)}
            </p>
            <p className="wj-label mt-1">{doc.profile.currency} on hand</p>
          </div>
        </header>

        <QuickEntry people={people} defaultCounterpartyId={counterpartyId} />

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <select
            value={counterpartyId ?? ''}
            onChange={(event) => onFilterCounterparty(event.target.value || null)}
            aria-label="Filter by person"
            className="wj-field h-8 w-auto py-0 pr-7 text-xs"
          >
            <option value="">Everyone</option>
            {counterparties.map((person) => (
              <option key={person.id} value={person.id}>
                {person.title}
              </option>
            ))}
          </select>
          <select value={tagId} onChange={(event) => setTagId(event.target.value)} aria-label="Filter by tag" className="wj-field h-8 w-auto py-0 pr-7 text-xs">
            <option value="">Any tag</option>
            {doc.tags
              .filter((tag) => usedTagIds.has(tag.id))
              .map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
          </select>
          <select value={goalId} onChange={(event) => setGoalId(event.target.value)} aria-label="Filter by goal" className="wj-field h-8 w-auto py-0 pr-7 text-xs">
            <option value="">Any goal</option>
            {doc.goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
          {filtered ? (
            <button
              type="button"
              onClick={() => {
                onFilterCounterparty(null);
                setTagId('');
                setGoalId('');
              }}
              className="text-2xs text-faint underline-offset-2 hover:text-ink hover:underline"
            >
              clear
            </button>
          ) : null}
          <p className="ml-auto text-2xs tabular-nums text-faint">
            <span className="text-sage">+{formatAmount(shown.income)}</span> earned ·{' '}
            <span className="text-rose/90">−{formatAmount(shown.expense)}</span> spent · net{' '}
            <span className={cn(shown.net < 0 ? 'text-rose/90' : 'text-ink/85')}>{formatSigned(shown.net)}</span>
            {filtered ? ' in view' : ''}
          </p>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Coins}
            title={filtered ? 'Nothing in view' : 'No coin recorded yet'}
            hint={
              filtered
                ? 'Clear the filters to see the whole ledger.'
                : 'Type an amount and what it was for above. Spent or earned, with whom — the balance takes care of itself.'
            }
            className="py-16"
          />
        ) : (
          <div className="mt-4 space-y-6">
            {groups.map((group) => (
              <section key={group.label}>
                <div className="mb-1 flex items-baseline justify-between border-b border-line/[0.1] px-2 pb-1">
                  <h3 className="wj-label">{group.label}</h3>
                  <span className={cn('text-2xs tabular-nums', group.net < 0 ? 'text-rose/80' : 'text-sage/90')}>{formatSigned(group.net)}</span>
                </div>
                <ul className="divide-y divide-line/[0.06]">
                  {group.rows.map((row) => (
                    <Row
                      key={row.transaction.id}
                      doc={doc}
                      row={row}
                      people={people}
                      editing={editingId === row.transaction.id}
                      onEdit={setEditingId}
                    />
                  ))}
                </ul>
              </section>
            ))}
            <p className="px-2 text-right text-2xs text-faint">Right-hand column: balance after each line.</p>
          </div>
        )}
      </div>
    </div>
  );
}
