import * as Dialog from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CharacterDocument, Entry } from '../../shared/schema';
import { cn } from '../lib/cn';
import { fuzzyScore } from '../lib/fuzzy';
import { iconByName } from '../lib/icons';
import { colorClasses } from '../lib/palette';
import { singularize } from '../lib/words';

interface EntryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: CharacterDocument;
  title: string;
  onPick: (entry: Entry) => void;
}

/** A searchable list of every entry, for "append this to…" style actions. */
export function EntryPicker({ open, onOpenChange, doc, title, onPick }: EntryPickerProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const list = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  const typesById = useMemo(() => new Map(doc.entryTypes.map((type) => [type.id, type] as const)), [doc.entryTypes]);

  const results = useMemo(() => {
    const scored = doc.entries.flatMap((entry) => {
      const score = fuzzyScore(query, `${entry.title} ${Object.values(entry.fields).join(' ')}`);
      return score === null ? [] : [{ entry, score }];
    });
    if (query.trim()) scored.sort((a, b) => b.score - a.score);
    else scored.sort((a, b) => b.entry.updatedAt.localeCompare(a.entry.updatedAt));
    return scored.slice(0, 40).map(({ entry }) => entry);
  }, [doc.entries, query]);
  const active = Math.min(activeIndex, Math.max(0, results.length - 1));

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function pick(entry: Entry) {
    onOpenChange(false);
    onPick(entry);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-black/55 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="fixed left-1/2 top-[12vh] z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 animate-scale-in overflow-hidden rounded-card border bg-panel shadow-lifted"
        >
          <Dialog.Title className="wj-eyebrow px-4 pt-3">{title}</Dialog.Title>
          <div className="flex items-center gap-3 border-b px-4">
            <Search className="h-4 w-4 shrink-0 text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  if (results.length === 0) return;
                  const delta = event.key === 'ArrowDown' ? 1 : -1;
                  setActiveIndex((active + delta + results.length) % results.length);
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  const chosen = results[active];
                  if (chosen) pick(chosen);
                }
              }}
              placeholder="Find an entry…"
              aria-label="Find an entry"
              className="h-11 w-full bg-transparent font-sans text-[0.95rem] text-ink outline-none placeholder:text-faint"
            />
          </div>
          <div ref={list} className="wj-scroll max-h-[min(50vh,24rem)] overflow-y-auto p-1.5">
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-faint">No entry matches that.</p>
            ) : (
              results.map((entry, index) => {
                const type = typesById.get(entry.typeId);
                const Icon = iconByName(type?.icon ?? '');
                const isActive = index === active;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    data-index={index}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => pick(entry)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-sm transition-colors',
                      isActive ? 'bg-gold/10 text-ink' : 'text-ink/85',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', type ? colorClasses(type.color).text : 'text-muted')} strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 truncate">{entry.title || 'Untitled'}</span>
                    {type ? <span className="shrink-0 text-2xs text-faint">{singularize(type.name)}</span> : null}
                  </button>
                );
              })
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
