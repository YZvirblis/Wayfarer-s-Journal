import * as Popover from '@radix-ui/react-popover';
import { Check, Plus, Tag as TagIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PALETTE, type PaletteColor, type Tag } from '../../shared/schema';
import { cn } from '../lib/cn';
import { createTag } from '../lib/documentStore';
import { colorClasses } from '../lib/palette';
import { TagChip } from './TagChip';
import { Button } from './ui/Button';

interface TagPickerProps {
  tags: Tag[];
  selected: string[];
  onToggle: (tagId: string) => void;
}

/** Next palette colour in rotation, so a fresh journal gains variety on its own. */
const suggestColor = (count: number): PaletteColor => PALETTE[count % PALETTE.length] ?? 'gold';

export function TagPicker({ tags, selected, onToggle }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [color, setColor] = useState<PaletteColor | null>(null);

  const trimmed = query.trim();
  const matches = useMemo(() => {
    const needle = trimmed.toLowerCase();
    return tags
      .filter((tag) => !needle || tag.name.toLowerCase().includes(needle))
      .sort((a, b) => (a.group ?? '').localeCompare(b.group ?? '') || a.name.localeCompare(b.name));
  }, [tags, trimmed]);

  const exact = tags.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase());
  const newColor = color ?? suggestColor(tags.length);

  function addNew() {
    if (!trimmed || exact) return;
    const tag = createTag(trimmed, newColor);
    onToggle(tag.id);
    setQuery('');
    setColor(null);
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery('');
          setColor(null);
        }
      }}
    >
      <Popover.Trigger asChild>
        <Button variant="ghost" size="sm" className="border-dashed border-line/25 text-faint hover:text-gold">
          <TagIcon className="h-3 w-3" />
          Add tag
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-72 animate-scale-in rounded-card border bg-panel p-2 shadow-lifted"
        >
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                const first = matches[0];
                if (trimmed && !exact) addNew();
                else if (first) onToggle(first.id);
              }
            }}
            placeholder="Find or create a tag…"
            className="wj-field mb-1.5 h-8 py-0 text-sm"
          />

          <div className="wj-scroll max-h-56 overflow-y-auto">
            {matches.map((tag) => {
              const active = selected.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onToggle(tag.id)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-gold/[0.08]"
                >
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', colorClasses(tag.color).dot)} />
                  <span className="min-w-0 flex-1 truncate text-ink/85">{tag.name}</span>
                  {tag.group ? <span className="shrink-0 text-2xs text-faint">{tag.group}</span> : null}
                  {active ? <Check className="h-3.5 w-3.5 shrink-0 text-gold" /> : null}
                </button>
              );
            })}
            {matches.length === 0 && !trimmed ? (
              <p className="px-2 py-3 text-xs text-faint">No tags yet. Type a name to make your first one.</p>
            ) : null}
          </div>

          {trimmed && !exact ? (
            <div className="mt-1.5 border-t pt-1.5">
              <button
                type="button"
                onClick={addNew}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-gold/[0.08]"
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-gold" />
                <span className="min-w-0 flex-1 truncate">
                  Create <span className="text-gold">{trimmed}</span>
                </span>
              </button>
              <div className="flex items-center gap-1.5 px-2 pb-1 pt-1">
                {PALETTE.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-label={`Use ${option}`}
                    onClick={() => setColor(option)}
                    className={cn(
                      'h-3.5 w-3.5 rounded-full transition-transform duration-150',
                      colorClasses(option).dot,
                      option === newColor ? 'scale-110 ring-2 ring-offset-2 ring-offset-panel ring-ink/30' : 'opacity-60 hover:opacity-100',
                    )}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Read-only row of an entry's tags plus the picker trigger. */
export function TagRow({
  tags,
  selected,
  onToggle,
}: {
  tags: Tag[];
  selected: string[];
  onToggle: (tagId: string) => void;
}) {
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((id) => {
        const tag = byId.get(id);
        return tag ? <TagChip key={id} tag={tag} active onRemove={() => onToggle(id)} /> : null;
      })}
      <TagPicker tags={tags} selected={selected} onToggle={onToggle} />
    </div>
  );
}
