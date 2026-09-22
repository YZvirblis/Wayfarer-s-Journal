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
            'inline-flex items-center gap-1.5 rounded border border-rose/40 bg-rose/10 text-2xs font-medium text-rose transition-colors hover:bg-rose/20',
            compact ? 'h-7 w-7 justify-center' : 'px-2 py-0.5',
            className,
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          {compact ? null : (
            <>
              Not saved
              <RefreshCw className="h-2.5 w-2.5 opacity-70" />
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
          className={cn('flex h-7 w-7 items-center justify-center', className)}
        >
          {saving ? (
            <span className="h-1.5 w-1.5 animate-ember rounded-full bg-gold" />
          ) : saveState === 'saved' ? (
            <Check className="h-3 w-3 text-sage" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-line/25" />
          )}
        </span>
      </Tooltip>
    );
  }

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
