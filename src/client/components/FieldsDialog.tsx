import { ChevronDown, ChevronUp, Lock, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { BUILT_IN_TYPE_IDS } from '../../shared/defaults';
import { newId } from '../../shared/defaults';
import type { CharacterDocument, EntryType, FieldDef, FieldKind } from '../../shared/schema';
import { cn } from '../lib/cn';
import { fieldUsage, removeField, updateEntryType } from '../lib/documentStore';
import { pluralize } from '../lib/format';
import { useAutoCommit } from '../lib/useAutoCommit';
import { singularize } from '../lib/words';
import { Button, IconButton } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Modal } from './ui/Modal';
import { Tooltip } from './ui/Tooltip';

const KIND_LABELS: Record<FieldKind, string> = { text: 'Text', select: 'Choice', number: 'Number' };

/** The web reads People's standing values, so that field keeps its shape. */
const isLocked = (type: EntryType, field: FieldDef): boolean =>
  type.id === BUILT_IN_TYPE_IDS.people && field.key === 'standing';

function FieldRow({
  type,
  field,
  index,
  usage,
  onRemove,
}: {
  type: EntryType;
  field: FieldDef;
  index: number;
  usage: number;
  onRemove: () => void;
}) {
  const locked = isLocked(type, field);
  const edit = (recipe: (draft: FieldDef) => void) =>
    updateEntryType(type.id, (draft) => {
      const target = draft.fields.find((candidate) => candidate.key === field.key);
      if (target) recipe(target);
    });
  const label = useAutoCommit(field.label, (value) => edit((draft) => void (draft.label = value.trim() || 'Field')));
  const options = useAutoCommit((field.options ?? []).join(', '), (value) =>
    edit((draft) => {
      draft.options = value
        .split(',')
        .map((option) => option.trim())
        .filter(Boolean);
    }),
  );

  function move(delta: number) {
    updateEntryType(type.id, (draft) => {
      const from = draft.fields.findIndex((candidate) => candidate.key === field.key);
      const to = from + delta;
      if (from === -1 || to < 0 || to >= draft.fields.length) return;
      const [moved] = draft.fields.splice(from, 1);
      if (moved) draft.fields.splice(to, 0, moved);
    });
  }

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-start gap-2 rounded px-1 py-2 transition-colors hover:bg-ink/[0.02] sm:grid-cols-[auto_1fr_7rem_auto]">
      <div className="flex flex-col text-muted">
        <IconButton variant="ghost" size="sm" className="h-6 w-6" aria-label="Move up" disabled={index === 0} onClick={() => move(-1)}>
          <ChevronUp className="h-4 w-4" strokeWidth={2} />
        </IconButton>
        <IconButton
          variant="ghost"
          size="sm"
          className="h-6 w-6"
          aria-label="Move down"
          disabled={index === type.fields.length - 1}
          onClick={() => move(1)}
        >
          <ChevronDown className="h-4 w-4" strokeWidth={2} />
        </IconButton>
      </div>

      <div className="min-w-0">
        <input
          value={label.value}
          onChange={(event) => label.onChange(event.target.value)}
          onBlur={label.flush}
          aria-label="Field name"
          className="wj-quiet-field px-1.5 py-1 text-sm"
        />
        {field.kind === 'select' ? (
          <input
            value={options.value}
            onChange={(event) => options.onChange(event.target.value)}
            onBlur={options.flush}
            disabled={locked}
            placeholder="Choices, separated by commas"
            aria-label={`${field.label} choices`}
            className="wj-quiet-field mt-0.5 px-1.5 py-0.5 text-xs text-muted disabled:opacity-60"
          />
        ) : null}
        <p className="mt-0.5 px-1.5 text-2xs text-faint">
          {usage === 0 ? 'No entry has a value yet' : `Filled in on ${pluralize(usage, 'entry', 'entries')}`}
        </p>
      </div>

      <select
        value={field.kind}
        disabled={locked}
        onChange={(event) =>
          edit((draft) => {
            draft.kind = event.target.value as FieldKind;
            if (draft.kind === 'select' && !draft.options) draft.options = [];
            if (draft.kind !== 'select') delete draft.options;
          })
        }
        aria-label={`${field.label} kind`}
        className="wj-field h-8 w-auto py-0 pr-7 text-xs disabled:opacity-60 sm:w-full"
      >
        {(Object.keys(KIND_LABELS) as FieldKind[]).map((kind) => (
          <option key={kind} value={kind}>
            {KIND_LABELS[kind]}
          </option>
        ))}
      </select>

      {locked ? (
        <Tooltip label="The relationship web reads this field, so it stays">
          <span className="flex h-7 w-7 items-center justify-center text-faint">
            <Lock className="h-3.5 w-3.5" />
          </span>
        </Tooltip>
      ) : (
        <Tooltip label="Remove field">
          <IconButton variant="ghost" size="sm" className="text-muted hover:text-rose" aria-label={`Remove ${field.label}`} onClick={onRemove}>
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </IconButton>
        </Tooltip>
      )}
    </li>
  );
}

interface FieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: CharacterDocument;
  typeId: string | null;
}

export function FieldsDialog({ open, onOpenChange, doc, typeId }: FieldsDialogProps) {
  const type = doc.entryTypes.find((candidate) => candidate.id === typeId) ?? null;
  const [pendingRemove, setPendingRemove] = useState<FieldDef | null>(null);
  const pendingUsage = type && pendingRemove ? fieldUsage(doc, type.id, pendingRemove.key) : 0;

  function addField() {
    if (!type) return;
    updateEntryType(type.id, (draft) => {
      draft.fields.push({ key: `f-${newId()}`, label: 'New field', kind: 'text' });
    });
  }

  function requestRemove(field: FieldDef) {
    if (!type) return;
    if (fieldUsage(doc, type.id, field.key) === 0) removeField(type.id, field.key);
    else setPendingRemove(field);
  }

  return (
    <>
      <Modal
        open={open && type !== null}
        onOpenChange={onOpenChange}
        title={type ? `Fields for ${type.name}` : 'Fields'}
        description={
          type
            ? `What every ${singularize(type.name).toLowerCase()} can record besides its title and notes. Reorder with the arrows; names can change freely.`
            : ''
        }
        size="lg"
        footer={
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        }
      >
        {type ? (
          <>
            {type.fields.length === 0 ? (
              <p className="rounded border border-dashed border-line/20 px-4 py-6 text-center text-sm text-faint">
                No fields yet. Entries here have a title, tags and notes only.
              </p>
            ) : (
              <ul className="divide-y divide-line/[0.08]">
                {type.fields.map((field, index) => (
                  <FieldRow
                    key={field.key}
                    type={type}
                    field={field}
                    index={index}
                    usage={fieldUsage(doc, type.id, field.key)}
                    onRemove={() => requestRemove(field)}
                  />
                ))}
              </ul>
            )}
            <Button variant="secondary" size="sm" className={cn('mt-3')} onClick={addField}>
              <Plus className="h-3.5 w-3.5" />
              Add a field
            </Button>
          </>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(next) => !next && setPendingRemove(null)}
        title={`Remove "${pendingRemove?.label ?? ''}"?`}
        confirmLabel="Remove field and its values"
        onConfirm={() => {
          if (type && pendingRemove) removeField(type.id, pendingRemove.key);
          setPendingRemove(null);
        }}
      >
        <p className="text-sm leading-relaxed text-muted">
          {pluralize(pendingUsage, 'entry has', 'entries have')} a value in this field. Removing it deletes those values too.
          Your last twenty saves are kept as backups on disk.
        </p>
      </ConfirmDialog>
    </>
  );
}
