import { ArrowLeft, CalendarDays, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CharacterDocument, Session } from '../../shared/schema';
import { cn } from '../lib/cn';
import { createSession, deleteSession, updateSession } from '../lib/documentStore';
import { bodyPreview, formatCalendarLong, formatCalendarShort, formatMonth, relativeTime } from '../lib/format';
import { PANE_QUERY, useMediaQuery } from '../lib/layout';
import { parseLinks, resolveLink } from '../lib/links';
import { handleListKey } from '../lib/listKeys';
import { useAutoCommit } from '../lib/useAutoCommit';
import { MarkdownField } from './MarkdownField';
import { WikiLink } from './WikiLink';
import { Button, IconButton } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Divider } from './ui/Divider';
import { EmptyState } from './ui/EmptyState';
import { Menu, MenuContent, MenuItem, MenuTrigger } from './ui/Menu';
import { Tooltip } from './ui/Tooltip';

/** Newest first: by play date, then by when the record was written. */
function sortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

function SessionList({
  sessions,
  selectedId,
  onSelect,
  onOpen,
  onCreate,
}: {
  sessions: Session[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const sorted = useMemo(() => sortSessions(sessions), [sessions]);
  const ids = sorted.map((session) => session.id);

  return (
    <div data-list-root className="flex min-w-0 flex-1 flex-col bg-panel/35 pane:w-[22.5rem] pane:flex-none pane:border-r">
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-lg tracking-title text-ink">Sessions</h2>
          <span className="text-2xs tabular-nums text-faint">{sessions.length}</span>
        </div>
        <Tooltip label="New session">
          <IconButton variant="primary" size="sm" className="h-8 w-8" onClick={onCreate} aria-label="New session">
            <Plus className="h-3.5 w-3.5" />
          </IconButton>
        </Tooltip>
      </header>

      <div className="wj-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {sorted.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="font-display text-sm tracking-title text-muted">No sessions yet</p>
            <p className="mx-auto mt-2 max-w-[16rem] text-xs leading-relaxed text-faint">
              Keep a dated record of each night at the table. Link the people and places it touched.
            </p>
            <Button variant="primary" size="sm" className="mt-4" onClick={onCreate}>
              <Plus className="h-3.5 w-3.5" />
              New session
            </Button>
          </div>
        ) : (
          <ol className="space-y-0.5" role="listbox" aria-label="Sessions">
            {sorted.map((session, index) => {
              const month = formatMonth(session.date);
              const previous = sorted[index - 1];
              const showMonth = !previous || formatMonth(previous.date) !== month;
              const active = session.id === selectedId;
              const preview = bodyPreview(session.body, 80);
              return (
                <li key={session.id}>
                  {showMonth ? <p className="wj-label px-3 pb-1 pt-3">{month}</p> : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-row-id={session.id}
                    tabIndex={active || (!selectedId && index === 0) ? 0 : -1}
                    onClick={() => onSelect(session.id)}
                    onDoubleClick={() => onOpen(session.id)}
                    onKeyDown={(event) => handleListKey(event, ids, selectedId, onSelect, onOpen)}
                    className={cn(
                      'relative flex w-full items-start gap-3 rounded px-3 py-2.5 text-left transition-colors duration-150',
                      active ? 'bg-gold/[0.09]' : 'hover:bg-ink/[0.035]',
                    )}
                  >
                    {active ? <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-gold/80" /> : null}
                    <span className="w-14 shrink-0 pt-0.5 font-display text-2xs uppercase leading-snug tracking-[0.1em] text-gold/80">
                      {formatCalendarShort(session.date)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm', active ? 'text-ink' : 'text-ink/85', !session.title && 'italic text-faint')}>
                        {session.title || 'Untitled session'}
                      </span>
                      {preview ? <span className="mt-0.5 block truncate text-xs text-faint">{preview}</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function SessionDetail({
  doc,
  session,
  onDeleted,
  onBack,
  focusTitle,
}: {
  doc: CharacterDocument;
  session: Session;
  onDeleted: () => void;
  onBack?: () => void;
  focusTitle: number;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const title = useAutoCommit(session.title, (value) => updateSession(session.id, (draft) => void (draft.title = value)));
  const titleInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (focusTitle > 0) titleInput.current?.focus();
  }, [focusTitle]);

  // Every entry this session's body links to, once each, in order of first mention.
  const mentioned = useMemo(() => {
    const seen = new Set<string>();
    return parseLinks(session.body).filter((link) => {
      const target = resolveLink(doc.entries, doc.entryTypes, link.title, link.typeName);
      if (!target || seen.has(target.id)) return false;
      seen.add(target.id);
      return true;
    });
  }, [session.body, doc.entries, doc.entryTypes]);

  return (
    <div className="wj-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-5 pane:px-10 pane:pt-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="-ml-2 inline-flex items-center gap-1.5 rounded py-1 pl-1.5 pr-2.5 text-2xs uppercase tracking-[0.14em] text-gold transition-colors hover:bg-ink/[0.04]"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
              <CalendarDays className="h-3 w-3" strokeWidth={2} />
              Sessions
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.14em] text-gold">
              <CalendarDays className="h-3 w-3" strokeWidth={2} />
              Session
            </span>
          )}
          <Menu>
            <MenuTrigger asChild>
              <IconButton variant="ghost" size="sm" aria-label="Session options">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </IconButton>
            </MenuTrigger>
            <MenuContent>
              <MenuItem danger onSelect={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete session
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>

        <label className="group/date inline-flex items-center gap-2 text-sm text-muted">
          <span className="font-display text-base tracking-title text-ink/90">{formatCalendarLong(session.date)}</span>
          <input
            type="date"
            value={session.date}
            aria-label="Session date"
            onChange={(event) => {
              const next = event.target.value;
              if (next) updateSession(session.id, (draft) => void (draft.date = next));
            }}
            className="wj-quiet-field w-auto px-1.5 py-0.5 text-xs text-faint opacity-60 transition-opacity group-hover/date:opacity-100 focus:opacity-100"
          />
        </label>

        <input
          ref={titleInput}
          value={title.value}
          onChange={(event) => title.onChange(event.target.value)}
          onBlur={title.flush}
          placeholder="What shall we call this night?"
          aria-label="Session title"
          className="wj-quiet-field -ml-2 mt-1 px-2 py-1 font-display text-[1.75rem] leading-tight tracking-title text-ink"
        />

        <p className="mt-2 text-2xs text-faint">Last touched {relativeTime(session.updatedAt)}</p>

        <Divider className="my-6" />
        <MarkdownField
          value={session.body}
          onChange={(value) => updateSession(session.id, (draft) => void (draft.body = value))}
          placeholder="Where did the night take you? Name the people and places with [[double brackets]] and they will remember this session."
          minHeight={240}
          initialMode={session.body.trim() ? 'read' : 'write'}
        />

        {mentioned.length > 0 ? (
          <>
            <Divider className="my-6" />
            <section aria-label="Mentioned in this session">
              <span className="wj-label mb-2 block">This session touched</span>
              <div className="flex flex-wrap items-center gap-1.5 font-serif text-[1.0625rem]">
                {mentioned.map((link) => (
                  <WikiLink key={`${link.title}|${link.typeName ?? ''}`} title={link.title} typeName={link.typeName} />
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${session.title || formatCalendarLong(session.date)}"?`}
        confirmLabel="Delete session"
        onConfirm={() => {
          deleteSession(session.id);
          onDeleted();
        }}
      >
        <p className="text-sm text-muted">
          The record of this session will be removed. Your last twenty saves are kept as backups on disk.
        </p>
      </ConfirmDialog>
    </div>
  );
}

interface SessionsViewProps {
  doc: CharacterDocument;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function SessionsView({ doc, selectedId, onSelect }: SessionsViewProps) {
  const session = doc.sessions.find((candidate) => candidate.id === selectedId) ?? null;
  const twoPanes = useMediaQuery(PANE_QUERY);
  const [focusTitle, setFocusTitle] = useState(0);

  function select(id: string | null) {
    setFocusTitle(0);
    onSelect(id);
  }

  function open(id: string) {
    onSelect(id);
    setFocusTitle((tick) => tick + 1);
  }

  function create() {
    open(createSession());
  }

  return (
    <div className="flex min-w-0 flex-1">
      {twoPanes || !session ? (
        <SessionList
          sessions={doc.sessions}
          selectedId={session?.id ?? null}
          onSelect={select}
          onOpen={open}
          onCreate={create}
        />
      ) : null}

      {session ? (
        <SessionDetail
          key={session.id}
          doc={doc}
          session={session}
          onDeleted={() => select(null)}
          onBack={twoPanes ? undefined : () => select(null)}
          focusTitle={focusTitle}
        />
      ) : twoPanes ? (
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <EmptyState
            icon={CalendarDays}
            title="No session opened"
            hint="Pick a night from the timeline, or start a new one for tonight."
            action={
              <Button variant="primary" onClick={create}>
                <Plus className="h-3.5 w-3.5" />
                New session
              </Button>
            }
          />
        </div>
      ) : null}
    </div>
  );
}
