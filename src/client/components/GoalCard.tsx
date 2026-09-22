import { CalendarClock, EyeOff, MoreHorizontal, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Goal } from '../../shared/schema';
import { cn } from '../lib/cn';
import { addTransaction } from '../lib/documentStore';
import { bodyPreview, formatCalendarShort, localDate } from '../lib/format';
import { formatSeptims, formatSigned, parseQuickEntry, type GoalProgress } from '../lib/ledger';
import { Markdown } from './Markdown';
import { Button, IconButton } from './ui/Button';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from './ui/Menu';

const KIND_LABEL = { save: 'Saving up', debt: 'Paying off' } as const;

function Bar({ progress, kind }: { progress: GoalProgress; kind: Goal['kind'] }) {
  return (
    <div className="h-[5px] overflow-hidden rounded-full bg-ink/[0.08]">
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-ledger',
          progress.complete ? 'bg-sage' : kind === 'save' ? 'bg-gold' : 'bg-ember',
        )}
        style={{ width: `${progress.ratio * 100}%` }}
      />
    </div>
  );
}

function deadlineText(progress: GoalProgress): string | null {
  if (progress.daysLeft === null) return null;
  if (progress.complete) return 'Done';
  if (progress.daysLeft < 0) return `${-progress.daysLeft} day${progress.daysLeft === -1 ? '' : 's'} overdue`;
  if (progress.daysLeft === 0) return 'Due today';
  return `${progress.daysLeft} day${progress.daysLeft === 1 ? '' : 's'} left`;
}

/** The small version on the Overview: a glance, and a click to the Goals page. */
export function GoalTile({ goal, progress, onOpen }: { goal: Goal; progress: GoalProgress; onOpen: () => void }) {
  const due = deadlineText(progress);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="wj-card group/goal w-full p-4 text-left transition-colors duration-150 hover:border-gold/30"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-display text-sm tracking-title text-ink">{goal.title}</span>
        <span className="shrink-0 text-2xs text-faint">{KIND_LABEL[goal.kind]}</span>
      </div>
      <div className="mt-3">
        <Bar progress={progress} kind={goal.kind} />
      </div>
      <div className="mt-2 flex items-baseline justify-between text-2xs text-faint">
        <span className="tabular-nums">
          <span className="text-ink/85">{formatSeptims(progress.done)}</span> of {formatSeptims(goal.target)}
        </span>
        <span>{due ?? `${Math.round(progress.ratio * 100)}%`}</span>
      </div>
    </button>
  );
}

interface GoalCardProps {
  goal: Goal;
  progress: GoalProgress;
  onEdit: () => void;
  onDelete: () => void;
  onOpenLedger: () => void;
}

/** The full card on the Goals page: numbers, a quick payment line, and the recent movements. */
export function GoalCard({ goal, progress, onEdit, onDelete, onOpenLedger }: GoalCardProps) {
  const [line, setLine] = useState('');
  const parsed = parseQuickEntry(line);
  const canAdd = parsed.amount !== null && parsed.amount !== 0;
  const due = deadlineText(progress);

  function add() {
    if (parsed.amount === null || parsed.amount === 0) return;
    // A payment toward a debt leaves the purse; a deposit toward a saving enters it.
    const magnitude = Math.abs(parsed.amount);
    const amount = parsed.signed ? parsed.amount : goal.kind === 'debt' ? -magnitude : magnitude;
    addTransaction({
      date: localDate(),
      amount,
      description: parsed.description || (goal.kind === 'debt' ? `Payment toward ${goal.title}` : `Set aside for ${goal.title}`),
      goalId: goal.id,
      secret: goal.secret,
    });
    setLine('');
  }

  return (
    <article className={cn('wj-card animate-rise-in p-5', progress.complete && 'border-sage/30')}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="wj-eyebrow flex items-center gap-1.5">
            <Target className="h-3 w-3" strokeWidth={2} />
            {KIND_LABEL[goal.kind]}
            {goal.secret ? <EyeOff className="h-3 w-3 text-plum/80" aria-label="Secret goal" /> : null}
          </p>
          <h3 className="mt-1 truncate font-display text-xl tracking-title text-ink">{goal.title}</h3>
        </div>
        <Menu>
          <MenuTrigger asChild>
            <IconButton variant="ghost" size="sm" aria-label={`${goal.title} options`}>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </IconButton>
          </MenuTrigger>
          <MenuContent>
            <MenuItem onSelect={onEdit}>
              <Pencil className="h-3.5 w-3.5 opacity-70" />
              Edit goal
            </MenuItem>
            <MenuItem onSelect={onOpenLedger}>
              <Plus className="h-3.5 w-3.5 opacity-70" />
              Open the ledger
            </MenuItem>
            <MenuSeparator />
            <MenuItem danger onSelect={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete goal
            </MenuItem>
          </MenuContent>
        </Menu>
      </header>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-[1.9rem] leading-none tabular-nums tracking-title text-gold/90">
            {formatSeptims(progress.remaining)}
          </p>
          <p className="wj-label mt-1">{progress.complete ? 'Nothing left — done' : 'septims to go'}</p>
        </div>
        <div className="text-right text-2xs text-faint">
          <p className="tabular-nums">
            <span className="text-ink/85">{formatSeptims(progress.done)}</span> of {formatSeptims(goal.target)} ·{' '}
            {Math.round(progress.ratio * 100)}%
          </p>
          {due ? (
            <p className="mt-0.5 flex items-center justify-end gap-1">
              <CalendarClock className="h-3 w-3" />
              {due}
              {goal.deadline ? ` · ${formatCalendarShort(goal.deadline)}` : ''}
            </p>
          ) : null}
          {progress.perWeek !== null ? (
            <p className="mt-0.5 tabular-nums text-ink/80">≈ {formatSeptims(progress.perWeek)} a week to make it</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3">
        <Bar progress={progress} kind={goal.kind} />
      </div>

      {goal.notes.trim() ? <Markdown className="mt-4 text-[0.95rem] text-muted">{goal.notes}</Markdown> : null}

      <div className="mt-4 flex items-center gap-2">
        <input
          value={line}
          onChange={(event) => setLine(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
          placeholder={goal.kind === 'debt' ? '50 paid at the forge door' : '120 from the shield-bands'}
          aria-label={`Log toward ${goal.title}`}
          className="wj-field h-8 min-w-0 flex-1 py-0 text-sm"
        />
        <Button variant="primary" size="sm" className="h-8" onClick={add} disabled={!canAdd}>
          <Plus className="h-3 w-3" />
          {canAdd ? `Log ${formatSeptims(parsed.amount ?? 0)}` : 'Log'}
        </Button>
      </div>

      {progress.transactions.length > 0 ? (
        <ul className="mt-3 divide-y divide-line/[0.08] border-t border-line/[0.08]">
          {progress.transactions.slice(0, 5).map((transaction) => (
            <li key={transaction.id} className="flex items-baseline gap-3 py-1.5 text-xs">
              <span className="w-[4.75rem] shrink-0 text-faint">{formatCalendarShort(transaction.date)}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{bodyPreview(transaction.description, 120)}</span>
              <span className={cn('shrink-0 tabular-nums', transaction.amount < 0 ? 'text-rose/90' : 'text-sage')}>
                {formatSigned(transaction.amount)}
              </span>
            </li>
          ))}
          {progress.transactions.length > 5 ? (
            <li className="py-1.5 text-2xs text-faint">
              <button type="button" onClick={onOpenLedger} className="hover:text-gold">
                {progress.transactions.length - 5} more in the ledger…
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </article>
  );
}
