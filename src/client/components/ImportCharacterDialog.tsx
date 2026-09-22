import { AlertTriangle, FileJson, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import type { ImportSummary } from '../../shared/schema';
import { api, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface ImportCharacterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new character's id once it is saved. */
  onImported: (id: string) => void;
}

type Stage =
  | { kind: 'pick' }
  | { kind: 'checking' }
  | { kind: 'preview'; document: unknown; summary: ImportSummary; filename: string }
  | { kind: 'importing'; document: unknown; summary: ImportSummary; filename: string };

/**
 * Import a character file. The server validates and migrates it without
 * writing anything, the player sees what it found, and only then is it saved —
 * always as a new character, never over an existing one.
 */
export function ImportCharacterDialog({ open, onOpenChange, onImported }: ImportCharacterDialogProps) {
  const [stage, setStage] = useState<Stage>({ kind: 'pick' });
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setStage({ kind: 'pick' });
      setError(null);
    }
  }, [open]);

  async function inspect(file: File) {
    setError(null);
    setStage({ kind: 'checking' });
    let document: unknown;
    try {
      document = JSON.parse(await file.text());
    } catch {
      setError('That file is not valid JSON. Exports from Wayfarer’s Journal end in .json.');
      setStage({ kind: 'pick' });
      return;
    }
    try {
      const { summary } = await api.importCharacter(document, false);
      setStage({ kind: 'preview', document, summary, filename: file.name });
    } catch (caught) {
      setError(errorMessage(caught));
      setStage({ kind: 'pick' });
    }
  }

  async function commit() {
    if (stage.kind !== 'preview') return;
    setStage({ ...stage, kind: 'importing' });
    try {
      const { document } = await api.importCharacter(stage.document, true);
      if (!document) throw new Error('The import did not return a character.');
      onOpenChange(false);
      onImported(document.id);
    } catch (caught) {
      setError(errorMessage(caught));
      setStage({ ...stage, kind: 'preview' });
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    const file = event.dataTransfer.files[0];
    if (file) void inspect(file);
  }

  const summary = stage.kind === 'preview' || stage.kind === 'importing' ? stage.summary : null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Import a character"
      description="A .json file exported from Wayfarer’s Journal. It becomes a new character; nothing you already have is touched."
      size="sm"
      footer={
        summary ? (
          <>
            <Button variant="ghost" onClick={() => setStage({ kind: 'pick' })} disabled={stage.kind === 'importing'}>
              Choose another
            </Button>
            <Button variant="primary" onClick={() => void commit()} disabled={stage.kind === 'importing'}>
              <Upload className="h-3.5 w-3.5" />
              {stage.kind === 'importing' ? 'Importing…' : 'Import as a new character'}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        )
      }
    >
      {summary ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <FileJson className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <div className="min-w-0">
              <p className="font-display text-base tracking-title text-ink">{summary.name}</p>
              <p className="text-xs text-muted">
                {[summary.race, summary.trade].filter(Boolean).join(' · ') || 'No race or trade recorded'}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 rounded border border-line/15 bg-ground/30 px-3 py-2 text-xs sm:grid-cols-3">
            {(
              [
                ['Entries', summary.counts.entries],
                ['Sections', summary.counts.sections],
                ['Tags', summary.counts.tags],
                ['Sessions', summary.counts.sessions],
                ['Ledger lines', summary.counts.transactions],
                ['Goals', summary.counts.goals],
                ['Inbox', summary.counts.captures],
              ] as const
            ).map(([label, count]) => (
              <div key={label} className="flex items-baseline justify-between gap-2">
                <dt className="text-faint">{label}</dt>
                <dd className="tabular-nums text-ink/85">{count}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs leading-relaxed text-faint">
            {summary.fromVersion < summary.toVersion
              ? `Written by an older version (file format ${summary.fromVersion}); it will be brought up to format ${summary.toVersion} on the way in.`
              : `File format ${summary.fromVersion}, the current one.`}
            {summary.duplicateName ? ` A character called “${summary.name}” already exists; this will be a second, separate one.` : ''}
          </p>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label="Choose or drop a character file"
          onClick={() => fileInput.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              fileInput.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed px-4 py-8 text-center text-sm text-faint transition-colors',
            over ? 'border-gold/60 bg-gold/[0.06] text-gold' : 'border-line/25 hover:border-gold/40 hover:text-muted',
          )}
        >
          <FileJson className="h-5 w-5" />
          {stage.kind === 'checking' ? (
            <span className="animate-ember">Reading the file…</span>
          ) : (
            <span>
              <span className="text-ink/85">Drop</span> a .json export here, or click to choose one
            </span>
          )}
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void inspect(file);
          event.target.value = '';
        }}
      />
      {error ? (
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-rose">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
      <p className="mt-3 text-2xs text-faint">Every save is backed up in your backups folder, as always.</p>
    </Modal>
  );
}
