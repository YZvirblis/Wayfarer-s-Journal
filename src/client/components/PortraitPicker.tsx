import * as Popover from '@radix-ui/react-popover';
import { ClipboardPaste, ImagePlus, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { cn } from '../lib/cn';
import { blobToPortrait, imageFromTransfer, PORTRAIT_SIZE } from '../lib/portrait';
import { Sigil } from './Sigil';
import { Button } from './ui/Button';

interface PortraitPickerProps {
  name: string;
  portrait?: string;
  onChange: (portrait: string | undefined) => void;
  size?: 'md' | 'lg';
  className?: string;
}

/**
 * The portrait itself is the control: click it to pick a file, paste an
 * image, or drop one. Everything is scaled down before it is stored.
 */
export function PortraitPicker({ name, portrait, onChange, size = 'lg', className }: PortraitPickerProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function accept(file: Blob | null) {
    if (!file) {
      setError('No image found there.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onChange(await blobToPortrait(file));
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not read that image.');
    } finally {
      setBusy(false);
    }
  }

  function onPaste(event: ClipboardEvent) {
    const file = imageFromTransfer(event.clipboardData);
    if (file) {
      event.preventDefault();
      void accept(file);
    } else {
      setError('The clipboard holds no image. Copy a picture first, then paste here.');
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    void accept(imageFromTransfer(event.dataTransfer));
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(null);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={portrait ? 'Change portrait' : 'Add a portrait'}
          className={cn('group/portrait relative rounded transition-transform duration-150 hover:scale-[1.03]', className)}
        >
          <Sigil name={name} portrait={portrait} size={size} />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded bg-ground/60 opacity-0 transition-opacity group-hover/portrait:opacity-100">
            <ImagePlus className="h-4 w-4 text-gold" />
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          onPaste={onPaste}
          className="z-50 w-72 animate-scale-in rounded-card border bg-panel p-3 shadow-lifted"
        >
          <p className="wj-label mb-2">{portrait ? 'Change portrait' : 'Add a portrait'}</p>
          <div
            tabIndex={0}
            role="button"
            aria-label="Paste or drop an image here"
            onDragOver={(event) => {
              event.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                fileInput.current?.click();
              }
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded border border-dashed px-3 py-5 text-center text-xs text-faint transition-colors',
              over ? 'border-gold/60 bg-gold/[0.06] text-gold' : 'border-line/25 hover:border-gold/40 hover:text-muted',
            )}
          >
            <ClipboardPaste className="h-4 w-4" />
            <span>
              <span className="text-ink/85">Paste</span> an image here, <span className="text-ink/85">drop</span> one, or click
              to choose a file
            </span>
            <span className="text-2xs">Cropped square and scaled to {PORTRAIT_SIZE}px before it is saved</span>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void accept(event.target.files?.[0] ?? null);
              event.target.value = '';
            }}
          />
          {error ? <p className="mt-2 text-xs text-rose">{error}</p> : null}
          <div className="mt-2 flex items-center justify-between">
            <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()} disabled={busy}>
              <Upload className="h-3 w-3" />
              Choose file
            </Button>
            {portrait ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-faint hover:text-rose"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </Button>
            ) : null}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
