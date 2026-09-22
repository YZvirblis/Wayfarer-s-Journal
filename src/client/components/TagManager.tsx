import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PALETTE, type CharacterDocument, type PaletteColor, type Tag } from '../../shared/schema';
import { cn } from '../lib/cn';
import { createTag, deleteTag, updateTag } from '../lib/documentStore';
import { colorClasses } from '../lib/palette';
import { pluralize } from '../lib/format';
import { useAutoCommit } from '../lib/useAutoCommit';
import { Button, IconButton } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { EmptyState } from './ui/EmptyState';
import { Modal } from './ui/Modal';
import { Tooltip } from './ui/Tooltip';
import { Tags } from 'lucide-react';

function TagRowEditor({ tag, usage, onDelete }: { tag: Tag; usage: number; onDelete: () => void }) {
  const name = useAutoCommit(tag.name, (value) => updateTag(tag.id, (draft) => void (draft.name = value)));
  const group = useAutoCommit(tag.group ?? '', (value) =>
    updateTag(tag.id, (draft) => {
      const trimmed = value.trim();
      if (trimmed) draft.group = trimmed;
      else delete draft.group;
    }),
  );

  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded px-1 py-1.5 transition-colors hover:bg-ink/[0.02] sm:grid-cols-[1fr_7.5rem_auto_auto]">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', colorClasses(tag.color).dot)} />
        <input
          value={name.value}
          onChange={(event) => name.onChange(event.target.value)}
          onBlur={name.flush}
          aria-label="Tag name"
          className="wj-quiet-field min-w-0 px-1.5 py-1 text-sm"
        />
      </div>

      <input
        value={group.value}
        onChange={(event) => group.onChange(event.target.value)}
        onBlur={group.flush}
        placeholder="group"
        aria-label="Tag group"
        className="wj-quiet-field hidden px-1.5 py-1 text-xs text-muted sm:block"
      />

      <div className="flex items-center gap-1 px-1">
        {PALETTE.map((option) => (
          <button
            key={option}
            type="button"
            aria-label={`Colour ${tag.name} ${option}`}
            onClick={() => updateTag(tag.id, (draft) => void (draft.color = option))}
            className={cn(
              'h-3 w-3 rounded-full transition-transform duration-150',
              colorClasses(option).dot,
              option === tag.color
                ? 'scale-125 ring-1 ring-ink/40 ring-offset-2 ring-offset-panel'
                : 'opacity-45 hover:opacity-90',
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-end gap-1">
        <span className="w-16 shrink-0 text-right text-2xs tabular-nums text-faint">
          {usage === 0 ? 'unused' : pluralize(usage, 'entry', 'entries')}
        </span>
        <Tooltip label="Delete tag">
          <IconButton variant="ghost" size="sm" onClick={onDelete} aria-label={`Delete tag ${tag.name}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}

export function TagManager({
  open,
  onOpenChange,
  doc,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: CharacterDocument;
}) {
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null);
  const [draftName, setDraftName] = useState('');

  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of doc.entries) {
      for (const tagId of entry.tagIds) counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
    }
    return counts;
  }, [doc.entries]);

  const sorted = useMemo(
    () =>
      [...doc.tags].sort(
        (a, b) => (a.group ?? '￿').localeCompare(b.group ?? '￿') || a.name.localeCompare(b.name),
      ),
    [doc.tags],
  );

  function addTag() {
    const name = draftName.trim();
    if (!name) return;
    const color: PaletteColor = PALETTE[doc.tags.length % PALETTE.length] ?? 'gold';
    createTag(name, color);
    setDraftName('');
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="Tags"
        description="Rename, recolour, or group your tags. Deleting a tag removes it from every entry."
        size="lg"
      >
        <div className="mb-3 flex items-center gap-2">
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addTag();
              }
            }}
            placeholder="New tag name…"
            className="wj-field h-9"
          />
          <Button variant="primary" onClick={addTag} disabled={!draftName.trim()}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {sorted.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="No tags yet"
            hint="Tags are how you slice your journal — a place, a role, a promise you owe. Add one above, or create them as you write entries."
            className="py-8"
          />
        ) : (
          <div className="divide-y divide-line/[0.08]">
            {sorted.map((tag) => (
              <TagRowEditor key={tag.id} tag={tag} usage={usage.get(tag.id) ?? 0} onDelete={() => setPendingDelete(tag)} />
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => !next && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.name ?? ''}"?`}
        confirmLabel="Delete tag"
        onConfirm={() => {
          if (pendingDelete) deleteTag(pendingDelete.id);
          setPendingDelete(null);
        }}
      >
        <p className="text-sm text-muted">
          It will be removed from {pluralize(usage.get(pendingDelete?.id ?? '') ?? 0, 'entry', 'entries')}. The entries
          themselves are kept.
        </p>
      </ConfirmDialog>
    </>
  );
}
