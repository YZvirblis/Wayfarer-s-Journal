import { ChevronDown, Copy, Eye, EyeOff, MoreHorizontal, Pin, PinOff, Target, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { CharacterDocument, Entry, EntryStatus, EntryType, FieldDef } from '../../shared/schema';
import { cn } from '../lib/cn';
import { deleteEntry, duplicateEntry, renameEntry, updateEntry } from '../lib/documentStore';
import { formatDate, relativeTime } from '../lib/format';
import { colorClasses } from '../lib/palette';
import { useAutoCommit } from '../lib/useAutoCommit';
import { iconByName } from '../lib/icons';
import { singularize } from '../lib/words';
import { MarkdownField } from './MarkdownField';
import { ProgressBar, STATUS_META, STATUS_ORDER } from './QuestStatus';
import { TagRow } from './TagPicker';
import { Button, IconButton } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Divider } from './ui/Divider';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from './ui/Menu';
import { SegmentedControl } from './ui/SegmentedControl';
import { Tooltip } from './ui/Tooltip';

function TextField({ entryId, field, value }: { entryId: string; field: FieldDef; value: string }) {
  const draft = useAutoCommit(value, (next) =>
    updateEntry(entryId, (entry) => {
      if (next.trim()) entry.fields[field.key] = field.kind === 'number' ? Number(next) || 0 : next;
      else delete entry.fields[field.key];
    }),
  );
  return (
    <input
      id={`field-${field.key}`}
      type={field.kind === 'number' ? 'number' : 'text'}
      value={draft.value}
      onChange={(event) => draft.onChange(event.target.value)}
      onBlur={draft.flush}
      placeholder="—"
      className="wj-quiet-field px-2 py-1 text-sm text-ink"
    />
  );
}

function SelectField({ entryId, field, value }: { entryId: string; field: FieldDef; value: string }) {
  return (
    <div className="relative">
      <select
        id={`field-${field.key}`}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          updateEntry(entryId, (entry) => {
            if (next) entry.fields[field.key] = next;
            else delete entry.fields[field.key];
          });
        }}
        className="wj-quiet-field w-full appearance-none px-2 py-1 pr-7 text-sm text-ink"
      >
        <option value="">—</option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-faint" />
    </div>
  );
}

function ProgressControl({ entry, type }: { entry: Entry; type: EntryType }) {
  if (!entry.progress) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="border-dashed border-line/25 text-faint hover:text-gold"
        onClick={() => updateEntry(entry.id, (draft) => void (draft.progress = { current: 0, target: 10 }))}
      >
        <Target className="h-3 w-3" />
        Track a count
      </Button>
    );
  }
  const { current, target } = entry.progress;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          aria-label="Progress so far"
          value={current}
          onChange={(event) =>
            updateEntry(entry.id, (draft) => {
              if (draft.progress) draft.progress.current = Number(event.target.value) || 0;
            })
          }
          className="wj-field h-7 w-16 px-2 py-0 text-center text-sm tabular-nums"
        />
        <span className="text-faint">/</span>
        <input
          type="number"
          aria-label="Progress target"
          value={target}
          onChange={(event) =>
            updateEntry(entry.id, (draft) => {
              if (draft.progress) draft.progress.target = Number(event.target.value) || 0;
            })
          }
          className="wj-field h-7 w-16 px-2 py-0 text-center text-sm tabular-nums"
        />
      </div>
      <ProgressBar progress={entry.progress} color={type.color} showLabel={false} className="min-w-0 flex-1" />
      <Tooltip label="Stop counting">
        <IconButton
          variant="ghost"
          size="sm"
          aria-label="Stop counting"
          onClick={() => updateEntry(entry.id, (draft) => void delete draft.progress)}
        >
          <X className="h-3.5 w-3.5" />
        </IconButton>
      </Tooltip>
    </div>
  );
}

interface EntryDetailProps {
  doc: CharacterDocument;
  type: EntryType;
  entry: Entry;
  onDeleted: () => void;
  onSelect: (id: string) => void;
}

export function EntryDetail({ doc, type, entry, onDeleted, onSelect }: EntryDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const title = useAutoCommit(entry.title, (value) => renameEntry(entry.id, value));
  const TypeIcon = iconByName(type.icon);
  const colors = colorClasses(type.color);

  return (
    <div className="wj-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-10 pb-24 pt-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className={cn('inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.14em]', colors.text)}>
            <TypeIcon className="h-3 w-3" strokeWidth={2} />
            {singularize(type.name)}
          </span>

          <div className="flex items-center gap-0.5">
            <Tooltip label={entry.secret ? 'Marked secret' : 'Mark as secret'}>
              <IconButton
                variant="ghost"
                size="sm"
                aria-label={entry.secret ? 'Unmark secret' : 'Mark as secret'}
                className={cn(entry.secret && 'text-plum')}
                onClick={() => updateEntry(entry.id, (draft) => void (draft.secret = !draft.secret))}
              >
                {entry.secret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </IconButton>
            </Tooltip>
            <Tooltip label={entry.pinned ? 'Unpin' : 'Pin to top'}>
              <IconButton
                variant="ghost"
                size="sm"
                aria-label={entry.pinned ? 'Unpin entry' : 'Pin entry'}
                className={cn(entry.pinned && 'text-gold')}
                onClick={() => updateEntry(entry.id, (draft) => void (draft.pinned = !draft.pinned))}
              >
                {entry.pinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : <PinOff className="h-3.5 w-3.5" />}
              </IconButton>
            </Tooltip>
            <Menu>
              <MenuTrigger asChild>
                <IconButton variant="ghost" size="sm" aria-label="Entry options">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </IconButton>
              </MenuTrigger>
              <MenuContent>
                <MenuItem
                  onSelect={() => {
                    const id = duplicateEntry(entry.id);
                    if (id) onSelect(id);
                  }}
                >
                  <Copy className="h-3.5 w-3.5 opacity-70" />
                  Duplicate
                </MenuItem>
                <MenuSeparator />
                <MenuItem danger onSelect={() => setConfirmDelete(true)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete entry
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </div>

        <input
          value={title.value}
          onChange={(event) => title.onChange(event.target.value)}
          onBlur={title.flush}
          placeholder="Give this a name…"
          aria-label="Entry title"
          className="wj-quiet-field -ml-2 px-2 py-1 font-display text-[1.75rem] leading-tight tracking-title text-ink"
        />

        <p className="mt-2 text-2xs text-faint">
          Written {formatDate(entry.createdAt)} · last touched {relativeTime(entry.updatedAt)}
        </p>

        {type.fields.length > 0 || type.features.status || type.features.progress ? (
          <>
            <Divider className="my-6" />
            <div className="space-y-4">
              {type.fields.length > 0 ? (
                <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {type.fields.map((field) => {
                    const raw = entry.fields[field.key];
                    const value = raw === undefined ? '' : String(raw);
                    return (
                      <div key={field.key} className="flex items-center gap-3">
                        <label htmlFor={`field-${field.key}`} className="wj-label w-28 shrink-0">
                          {field.label}
                        </label>
                        <div className="min-w-0 flex-1">
                          {field.kind === 'select' ? (
                            <SelectField entryId={entry.id} field={field} value={value} />
                          ) : (
                            <TextField entryId={entry.id} field={field} value={value} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {type.features.status ? (
                <div className="flex items-center gap-3">
                  <span className="wj-label w-28 shrink-0">Status</span>
                  <SegmentedControl
                    value={entry.status ?? 'active'}
                    options={STATUS_ORDER.map((status) => ({ value: status, label: STATUS_META[status].label }))}
                    onChange={(status) =>
                      updateEntry(entry.id, (draft) => void (draft.status = status as EntryStatus))
                    }
                  />
                </div>
              ) : null}

              {type.features.progress ? (
                <div className="flex items-center gap-3">
                  <span className="wj-label w-28 shrink-0">Progress</span>
                  <div className="min-w-0 flex-1">
                    <ProgressControl entry={entry} type={type} />
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        <Divider className="my-6" />
        <TagRow
          tags={doc.tags}
          selected={entry.tagIds}
          onToggle={(tagId) =>
            updateEntry(entry.id, (draft) => {
              draft.tagIds = draft.tagIds.includes(tagId)
                ? draft.tagIds.filter((id) => id !== tagId)
                : [...draft.tagIds, tagId];
            })
          }
        />

        <Divider className="my-6" />
        <MarkdownField
          value={entry.body}
          onChange={(value) => updateEntry(entry.id, (draft) => void (draft.body = value))}
          placeholder="What happened? What did they promise? Write it down before you forget."
          minHeight={220}
        />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${entry.title || 'Untitled'}"?`}
        confirmLabel="Delete entry"
        onConfirm={() => {
          deleteEntry(entry.id);
          onDeleted();
        }}
      >
        <p className="text-sm text-muted">
          This entry will be removed from your journal. Your last twenty saves are kept as backups on disk.
        </p>
      </ConfirmDialog>
    </div>
  );
}
