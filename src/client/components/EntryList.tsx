import { ArrowDownWideNarrow, EyeOff, ListChecks, MoreHorizontal, Pencil, Pin, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { CharacterDocument, Entry, EntryType, Tag } from '../../shared/schema';
import { cn } from '../lib/cn';
import { bodyPreview, relativeTime } from '../lib/format';
import { handleListKey } from '../lib/listKeys';
import { colorClasses } from '../lib/palette';
import { singularize } from '../lib/words';
import type { SortKey } from '../types';
import { ProgressBar, StatusBadge, STATUS_ORDER } from './QuestStatus';
import { TagChip } from './TagChip';
import { Button, IconButton } from './ui/Button';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from './ui/Menu';
import { Tooltip } from './ui/Tooltip';

const SORT_LABELS: Record<SortKey, string> = {
  updated: 'Last written',
  created: 'First written',
  title: 'Title (A–Z)',
};

function matchesQuery(entry: Entry, tagNames: Map<string, string>, needle: string): boolean {
  if (!needle) return true;
  if (entry.title.toLowerCase().includes(needle)) return true;
  if (entry.body.toLowerCase().includes(needle)) return true;
  for (const value of Object.values(entry.fields)) {
    if (String(value).toLowerCase().includes(needle)) return true;
  }
  return entry.tagIds.some((id) => (tagNames.get(id) ?? '').includes(needle));
}

function fieldSummary(entry: Entry, type: EntryType): string {
  return type.fields
    .map((field) => entry.fields[field.key])
    .filter((value): value is string | number => value !== undefined && String(value).trim() !== '')
    .slice(0, 2)
    .join(' · ');
}

interface EntryListProps {
  doc: CharacterDocument;
  type: EntryType;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Select and hand keyboard focus to the detail pane (Enter on a row). */
  onOpen: (id: string) => void;
  onCreate: () => void;
  activeTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onClearTags: () => void;
  onEditSection: (type: EntryType) => void;
  onEditFields: (type: EntryType) => void;
  onDeleteSection: (type: EntryType) => void;
  /** Hand the current query to the palette, which searches every section. */
  onSearchEverywhere: (query: string) => void;
}

export function EntryList({
  doc,
  type,
  selectedId,
  onSelect,
  onOpen,
  onCreate,
  activeTagIds,
  onToggleTag,
  onClearTags,
  onEditSection,
  onEditFields,
  onDeleteSection,
  onSearchEverywhere,
}: EntryListProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');

  const tagsById = useMemo(() => new Map(doc.tags.map((tag) => [tag.id, tag] as const)), [doc.tags]);
  const tagNames = useMemo(
    () => new Map(doc.tags.map((tag) => [tag.id, tag.name.toLowerCase()] as const)),
    [doc.tags],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = doc.entries.filter(
      (entry) =>
        entry.typeId === type.id &&
        activeTagIds.every((tagId) => entry.tagIds.includes(tagId)) &&
        matchesQuery(entry, tagNames, needle),
    );
    return filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (type.features.status && a.status !== b.status) {
        return STATUS_ORDER.indexOf(a.status ?? 'active') - STATUS_ORDER.indexOf(b.status ?? 'active');
      }
      if (sort === 'title') return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      if (sort === 'created') return a.createdAt.localeCompare(b.createdAt);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [doc.entries, type, activeTagIds, tagNames, query, sort]);

  const total = doc.entries.filter((entry) => entry.typeId === type.id).length;
  const activeTags = activeTagIds.map((id) => tagsById.get(id)).filter((tag): tag is Tag => Boolean(tag));

  // How many entries in *other* sections the query would find — the list box
  // only searches this section, the palette searches everything.
  const needle = query.trim().toLowerCase();
  const elsewhere = needle
    ? doc.entries.filter((entry) => entry.typeId !== type.id && matchesQuery(entry, tagNames, needle)).length
    : 0;

  const visibleIds = visible.map((entry) => entry.id);
  const onRowKey = (event: ReactKeyboardEvent<HTMLElement>) =>
    handleListKey(event, visibleIds, selectedId, onSelect, onOpen);

  return (
    <div data-list-root className="flex min-w-0 flex-1 flex-col bg-panel/35 pane:w-[22.5rem] pane:flex-none pane:border-r">
      <header className="px-4 pb-3 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="truncate font-display text-lg tracking-title text-ink">{type.name}</h2>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-2xs tabular-nums text-faint">
              {visible.length === total ? total : `${visible.length} of ${total}`}
            </span>
            {/* The full sidebar carries these; the icon rail cannot, so they live here below `wide`. */}
            <Menu>
              <MenuTrigger asChild>
                <IconButton variant="ghost" size="sm" className="h-6 w-6 wide:hidden" aria-label={`${type.name} options`}>
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </IconButton>
              </MenuTrigger>
              <MenuContent>
                {type.builtIn ? null : (
                  <MenuItem onSelect={() => onEditSection(type)}>
                    <Pencil className="h-3.5 w-3.5 opacity-70" />
                    Rename &amp; restyle
                  </MenuItem>
                )}
                <MenuItem onSelect={() => onEditFields(type)}>
                  <ListChecks className="h-3.5 w-3.5 opacity-70" />
                  Edit fields…
                </MenuItem>
                {type.builtIn ? null : (
                  <>
                    <MenuSeparator />
                    <MenuItem danger onSelect={() => onDeleteSection(type)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete section
                    </MenuItem>
                  </>
                )}
              </MenuContent>
            </Menu>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                // ↓ from the search box walks into the list; Enter opens the selection.
                if (event.key === 'ArrowDown' || event.key === 'Enter') onRowKey(event);
              }}
              placeholder={`Search ${type.name.toLowerCase()}…`}
              aria-label={`Search ${type.name}`}
              className="wj-field h-8 py-0 pl-8 pr-7 text-sm"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-faint hover:text-ink"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>

          <Menu>
            <MenuTrigger asChild>
              <IconButton variant="secondary" size="sm" className="h-8 w-8" aria-label="Sort entries">
                <ArrowDownWideNarrow className="h-3.5 w-3.5" />
              </IconButton>
            </MenuTrigger>
            <MenuContent>
              <MenuLabel>Sort by</MenuLabel>
              <MenuRadioGroup value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <MenuRadioItem key={key} value={key}>
                    {SORT_LABELS[key]}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuContent>
          </Menu>

          <Tooltip label={`New ${singularize(type.name).toLowerCase()}`}>
            <IconButton variant="primary" size="sm" className="h-8 w-8" onClick={onCreate} aria-label="New entry">
              <Plus className="h-3.5 w-3.5" />
            </IconButton>
          </Tooltip>
        </div>

        {activeTags.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-2xs text-faint">Filtered by</span>
            {activeTags.map((tag) => (
              <TagChip key={tag.id} tag={tag} size="sm" active onRemove={() => onToggleTag(tag.id)} />
            ))}
            <button type="button" onClick={onClearTags} className="text-2xs text-faint underline-offset-2 hover:text-ink hover:underline">
              clear
            </button>
          </div>
        ) : null}
      </header>

      <div className="wj-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {visible.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="font-display text-sm tracking-title text-muted">
              {total === 0 ? `No ${type.name.toLowerCase()} yet` : 'Nothing matches'}
            </p>
            <p className="mx-auto mt-2 max-w-[16rem] text-xs leading-relaxed text-faint">
              {total === 0
                ? 'Start one with the + button — a name is enough to begin with.'
                : 'Try a different search, or clear the tag filter.'}
            </p>
            {total === 0 ? (
              <Button variant="primary" size="sm" className="mt-4" onClick={onCreate}>
                <Plus className="h-3.5 w-3.5" />
                New {singularize(type.name).toLowerCase()}
              </Button>
            ) : null}
            {elsewhere > 0 ? (
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => onSearchEverywhere(query.trim())}>
                <Search className="h-3 w-3" />
                {elsewhere} elsewhere — search everywhere
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-0.5" role="listbox" aria-label={type.name}>
            {visible.map((entry) => {
              const active = entry.id === selectedId;
              const summary = fieldSummary(entry, type);
              const preview = summary || bodyPreview(entry.body, 80);
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-row-id={entry.id}
                    tabIndex={active || (!selectedId && entry.id === visibleIds[0]) ? 0 : -1}
                    onClick={() => onSelect(entry.id)}
                    onDoubleClick={() => onOpen(entry.id)}
                    onKeyDown={onRowKey}
                    className={cn(
                      'relative w-full rounded px-3 py-2.5 text-left transition-colors duration-150',
                      active ? 'bg-gold/[0.09]' : 'hover:bg-ink/[0.035]',
                    )}
                  >
                    {active ? <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-gold/80" /> : null}

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate text-sm',
                          active ? 'text-ink' : 'text-ink/85',
                          !entry.title && 'italic text-faint',
                        )}
                      >
                        {entry.title || 'Untitled'}
                      </span>
                      {entry.secret ? <EyeOff className="h-3 w-3 shrink-0 text-plum/80" /> : null}
                      {entry.pinned ? <Pin className="h-3 w-3 shrink-0 fill-current text-gold/80" /> : null}
                    </div>

                    {preview ? <p className="mt-1 truncate text-xs text-faint">{preview}</p> : null}

                    {type.features.status && entry.status ? (
                      <div className="mt-2 flex items-center gap-2">
                        <StatusBadge status={entry.status} />
                        {entry.progress ? (
                          <ProgressBar progress={entry.progress} color={type.color} className="min-w-0 flex-1" />
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-1.5 flex items-center gap-1.5">
                      {entry.tagIds.slice(0, 6).map((tagId) => {
                        const tag = tagsById.get(tagId);
                        return tag ? (
                          <Tooltip key={tagId} label={tag.name}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', colorClasses(tag.color).dot)} />
                          </Tooltip>
                        ) : null;
                      })}
                      <span className="ml-auto shrink-0 text-2xs text-faint/80">{relativeTime(entry.updatedAt)}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {visible.length > 0 && elsewhere > 0 ? (
          <button
            type="button"
            onClick={() => onSearchEverywhere(query.trim())}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-line/20 px-3 py-2 text-2xs text-faint transition-colors hover:border-gold/35 hover:text-gold"
          >
            <Search className="h-3 w-3" />
            {elsewhere} more in other sections — search everywhere
          </button>
        ) : null}
      </div>
    </div>
  );
}
