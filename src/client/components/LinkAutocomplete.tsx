import { CirclePlus } from 'lucide-react';
import { useEffect, useRef, type CSSProperties } from 'react';
import type { Entry, EntryType } from '../../shared/schema';
import { cn } from '../lib/cn';
import { iconByName } from '../lib/icons';
import { formatLink, normalizeTitle, titleCounts } from '../lib/links';
import { colorClasses } from '../lib/palette';
import { singularize } from '../lib/words';

export type LinkSuggestion =
  | { kind: 'entry'; entry: Entry; type: EntryType; /** Needs `|Type` because another entry shares the title. */ qualified: boolean }
  | { kind: 'new'; title: string };

export function suggestionText(suggestion: LinkSuggestion): string {
  return suggestion.kind === 'entry'
    ? formatLink(suggestion.entry.title, suggestion.qualified ? suggestion.type.name : undefined)
    : formatLink(suggestion.title);
}

/**
 * Matches for what has been typed after `[[`. Typing `|` after a title narrows
 * to that exact title so the user can pick between namesakes by type.
 */
export function buildSuggestions(query: string, entries: Entry[], entryTypes: EntryType[], limit = 8): LinkSuggestion[] {
  const bar = query.indexOf('|');
  const titlePart = bar === -1 ? query : query.slice(0, bar);
  const typePart = bar === -1 ? null : normalizeTitle(query.slice(bar + 1));
  const needle = normalizeTitle(titlePart);
  const typesById = new Map(entryTypes.map((type) => [type.id, type] as const));
  const counts = titleCounts(entries);

  const matches = entries
    .flatMap((entry) => {
      const type = typesById.get(entry.typeId);
      const title = normalizeTitle(entry.title);
      if (!type || !title) return [];
      if (typePart !== null) {
        return title === needle && normalizeTitle(type.name).includes(typePart) ? [{ entry, type }] : [];
      }
      return !needle || title.includes(needle) ? [{ entry, type }] : [];
    })
    .sort((a, b) => {
      const aStarts = normalizeTitle(a.entry.title).startsWith(needle) ? 0 : 1;
      const bStarts = normalizeTitle(b.entry.title).startsWith(needle) ? 0 : 1;
      return aStarts - bStarts || a.entry.title.localeCompare(b.entry.title, undefined, { sensitivity: 'base' });
    })
    .slice(0, limit);

  const suggestions: LinkSuggestion[] = matches.map(({ entry, type }) => ({
    kind: 'entry',
    entry,
    type,
    qualified: (counts.get(normalizeTitle(entry.title)) ?? 0) > 1,
  }));

  const exact = matches.some(({ entry }) => normalizeTitle(entry.title) === needle);
  if (typePart === null && needle && !exact) suggestions.push({ kind: 'new', title: titlePart.trim() });
  return suggestions;
}

interface LinkAutocompleteProps {
  suggestions: LinkSuggestion[];
  activeIndex: number;
  onHover: (index: number) => void;
  onPick: (suggestion: LinkSuggestion) => void;
  style: CSSProperties;
}

export function LinkAutocomplete({ suggestions, activeIndex, onHover, onPick, style }: LinkAutocompleteProps) {
  const list = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    list.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div
      role="listbox"
      aria-label="Link suggestions"
      style={style}
      className="absolute z-30 w-72 animate-scale-in rounded-card border bg-panel p-1 font-sans shadow-lifted"
    >
      <div ref={list} className="wj-scroll max-h-64 overflow-y-auto">
        {suggestions.map((suggestion, index) => {
          const active = index === activeIndex;
          if (suggestion.kind === 'new') {
            return (
              <button
                key="new"
                type="button"
                role="option"
                aria-selected={active}
                onMouseEnter={() => onHover(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onPick(suggestion)}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
                  active ? 'bg-gold/10 text-ink' : 'text-muted',
                )}
              >
                <CirclePlus className="h-3.5 w-3.5 shrink-0 text-gold" />
                <span className="min-w-0 flex-1 truncate">
                  Link to <span className="text-gold">{suggestion.title}</span>
                </span>
                <span className="shrink-0 text-2xs text-faint">not yet written</span>
              </button>
            );
          }
          const Icon = iconByName(suggestion.type.icon);
          return (
            <button
              key={suggestion.entry.id}
              type="button"
              role="option"
              aria-selected={active}
              onMouseEnter={() => onHover(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onPick(suggestion)}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
                active ? 'bg-gold/10 text-ink' : 'text-ink/85',
              )}
            >
              <Icon className={cn('h-3.5 w-3.5 shrink-0', colorClasses(suggestion.type.color).text)} strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate">{suggestion.entry.title}</span>
              <span className="shrink-0 text-2xs text-faint">{singularize(suggestion.type.name)}</span>
            </button>
          );
        })}
      </div>
      <p className="border-t px-2 pb-0.5 pt-1.5 text-2xs text-faint">
        ↑↓ choose · Enter to link · Esc to dismiss
      </p>
    </div>
  );
}
