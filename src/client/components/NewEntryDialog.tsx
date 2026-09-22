import { useEffect, useState } from 'react';
import { BUILT_IN_TYPE_IDS } from '../../shared/defaults';
import type { EntryType } from '../../shared/schema';
import { cn } from '../lib/cn';
import { iconByName } from '../lib/icons';
import { colorClasses } from '../lib/palette';
import { singularize } from '../lib/words';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface NewEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryTypes: EntryType[];
  /** Prefilled title, e.g. from a link that resolved to nothing. */
  initialTitle?: string;
  /** Preselected type; falls back to People, then the first section. */
  initialTypeId?: string;
  onSubmit: (values: { title: string; typeId: string }) => void;
}

export function NewEntryDialog({ open, onOpenChange, entryTypes, initialTitle, initialTypeId, onSubmit }: NewEntryDialogProps) {
  const [title, setTitle] = useState('');
  const [typeId, setTypeId] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle ?? '');
    const fallback = entryTypes.find((type) => type.id === BUILT_IN_TYPE_IDS.people) ?? entryTypes[0];
    setTypeId(entryTypes.find((type) => type.id === initialTypeId)?.id ?? fallback?.id ?? '');
  }, [open, initialTitle, initialTypeId, entryTypes]);

  const chosen = entryTypes.find((type) => type.id === typeId);
  const canSubmit = title.trim().length > 0 && Boolean(chosen);

  function submit() {
    if (!canSubmit || !chosen) return;
    onSubmit({ title: title.trim(), typeId: chosen.id });
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="New entry"
      description="Pick where it belongs. You can fill in the rest afterwards."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit}>
            Create {chosen ? singularize(chosen.name).toLowerCase() : 'entry'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="new-entry-title" className="wj-label mb-1.5 block">
            Title
          </label>
          <input
            id="new-entry-title"
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="A name is enough to begin with"
            className="wj-field h-9"
          />
        </div>

        <div>
          <span className="wj-label mb-2 block">Section</span>
          <div className="grid grid-cols-2 gap-1.5">
            {entryTypes.map((type) => {
              const Icon = iconByName(type.icon);
              const active = type.id === typeId;
              return (
                <button
                  key={type.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTypeId(type.id)}
                  className={cn(
                    'flex items-center gap-2 rounded border px-2.5 py-1.5 text-left text-sm transition-colors duration-150',
                    active ? colorClasses(type.color).chip : 'border-transparent text-muted hover:border-line/20 hover:text-ink',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{type.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
