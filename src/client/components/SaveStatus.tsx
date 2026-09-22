import { AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { cn } from '../lib/cn';
import { retrySave, useDocumentState } from '../lib/documentStore';
import { Tooltip } from './ui/Tooltip';

/** `compact` shrinks it to a dot with a tooltip, for the icon rail. */
export function SaveStatus({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { saveState, saveError } = useDocumentState();

  if (saveState === 'error') {
    return (
      <Tooltip label={saveError ?? 'Could not save'} side={compact ? 'right' : 'top'}>
        <button
          type="button"
          onClick={() => void retrySave()}
          aria-label="Not saved — retry"
          className={cn(
            'inline-flex items-center gap-1.5 rounded border border-rose/40 bg-rose/10 text-xs font-medium text-rose transition-colors hover:bg-rose/20',
            compact ? 'h-9 w-9 justify-center' : 'h-8 px-2.5',
            className,
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          {compact ? null : (
            <>
              Not saved
              <RefreshCw className="h-3.5 w-3.5 opacity-70" />
            </>
          )}
        </button>
      </Tooltip>
    );
  }

  const saving = saveState === 'saving';
  const label = saving ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Up to date';

  if (compact) {
    return (
      <Tooltip label={label} side="right">
        <span
          aria-label={label}
          role="status"
          className={cn('flex h-9 w-9 items-center justify-center', className)}
        >
          {saving ? (
            <span className="h-2 w-2 animate-ember rounded-full bg-gold" />
          ) : saveState === 'saved' ? (
            <Check className="h-4 w-4 text-sage" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-line/30" />
          )}
        </span>
      </Tooltip>
    );
  }

  return (
    <span
      className={cn('inline-flex select-none items-center gap-1.5 text-xs tracking-[0.06em] text-muted', className)}
      aria-live="polite"
    >
      {saving ? (
        <>
          <span className="h-2 w-2 animate-ember rounded-full bg-gold" />
          Saving…
        </>
      ) : saveState === 'saved' ? (
        <>
          <Check className="h-4 w-4 text-sage" />
          Saved
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-line/30" />
          Up to date
        </>
      )}
    </span>
  );
}
