import { AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { cn } from '../lib/cn';
import { retrySave, useDocumentState } from '../lib/documentStore';
import { Tooltip } from './ui/Tooltip';

export function SaveStatus({ className }: { className?: string }) {
  const { saveState, saveError } = useDocumentState();

  if (saveState === 'error') {
    return (
      <Tooltip label={saveError ?? 'Could not save'} side="top">
        <button
          type="button"
          onClick={() => void retrySave()}
          className={cn(
            'inline-flex items-center gap-1.5 rounded border border-rose/40 bg-rose/10 px-2 py-0.5 text-2xs font-medium text-rose transition-colors hover:bg-rose/20',
            className,
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          Not saved
          <RefreshCw className="h-2.5 w-2.5 opacity-70" />
        </button>
      </Tooltip>
    );
  }

  const saving = saveState === 'saving';
  return (
    <span
      className={cn('inline-flex select-none items-center gap-1.5 text-2xs tracking-[0.08em] text-faint', className)}
      aria-live="polite"
    >
      {saving ? (
        <>
          <span className="h-1.5 w-1.5 animate-ember rounded-full bg-gold" />
          Saving…
        </>
      ) : saveState === 'saved' ? (
        <>
          <Check className="h-3 w-3 text-sage" />
          Saved
        </>
      ) : (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-line/25" />
          Up to date
        </>
      )}
    </span>
  );
}
