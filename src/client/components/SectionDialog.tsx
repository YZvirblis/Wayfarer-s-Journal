import { useEffect, useState } from 'react';
import { SECTION_ICON_CHOICES } from '../../shared/defaults';
import { PALETTE, type EntryType, type PaletteColor } from '../../shared/schema';
import { cn } from '../lib/cn';
import { iconByName } from '../lib/icons';
import { colorClasses } from '../lib/palette';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface SectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing an existing section. */
  type?: EntryType | null;
  onSubmit: (values: { name: string; icon: string; color: PaletteColor }) => void;
}

export function SectionDialog({ open, onOpenChange, type, onSubmit }: SectionDialogProps) {
  const editing = Boolean(type);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>('BookMarked');
  const [color, setColor] = useState<PaletteColor>('copper');

  // Reset to the section being edited (or to defaults) each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setName(type?.name ?? '');
    setIcon(type?.icon ?? 'BookMarked');
    setColor(type?.color ?? 'copper');
  }, [open, type]);

  const Preview = iconByName(icon);
  const canSubmit = name.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), icon, color });
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Rename section' : 'New section'}
      description={
        editing
          ? 'Change how this section appears in the sidebar.'
          : 'Sections are your own categories — Rumours, Deals, Recipes, Shrines. Entries work the same as anywhere else.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit}>
            {editing ? 'Save' : 'Create section'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="section-name" className="wj-label mb-1.5 block">
            Name
          </label>
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded border',
                colorClasses(color).chip,
              )}
            >
              <Preview className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <input
              id="section-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="Rumours"
              className="wj-field h-9"
            />
          </div>
        </div>

        <div>
          <span className="wj-label mb-2 block">Colour</span>
          <div className="flex items-center gap-2">
            {PALETTE.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={option}
                aria-pressed={option === color}
                onClick={() => setColor(option)}
                className={cn(
                  'h-5 w-5 rounded-full transition-transform duration-150',
                  colorClasses(option).dot,
                  option === color ? 'scale-110 ring-1 ring-ink/40 ring-offset-2 ring-offset-panel' : 'opacity-50 hover:opacity-90',
                )}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="wj-label mb-2 block">Icon</span>
          <div className="grid grid-cols-8 gap-1.5">
            {SECTION_ICON_CHOICES.map((choice) => {
              const Icon = iconByName(choice);
              const active = choice === icon;
              return (
                <button
                  key={choice}
                  type="button"
                  aria-label={choice}
                  aria-pressed={active}
                  onClick={() => setIcon(choice)}
                  className={cn(
                    'flex h-8 items-center justify-center rounded border transition-colors duration-150',
                    active
                      ? 'border-gold/45 bg-gold/10 text-gold'
                      : 'border-transparent text-faint hover:border-line/20 hover:text-ink',
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
