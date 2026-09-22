import type { EntryStatus, PaletteColor, Progress } from '../../shared/schema';
import { cn } from '../lib/cn';
import { colorClasses } from '../lib/palette';

export const STATUS_META: Record<EntryStatus, { label: string; color: PaletteColor }> = {
  active: { label: 'Active', color: 'gold' },
  on_hold: { label: 'On hold', color: 'frost' },
  done: { label: 'Done', color: 'sage' },
  failed: { label: 'Failed', color: 'rose' },
};

export const STATUS_ORDER: EntryStatus[] = ['active', 'on_hold', 'done', 'failed'];

export function StatusBadge({ status, className }: { status: EntryStatus; className?: string }) {
  const meta = STATUS_META[status];
  const colors = colorClasses(meta.color);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded border px-2 py-[0.09rem] text-2xs font-medium uppercase tracking-[0.1em]',
        colors.chip,
        className,
      )}
    >
      <span className={cn('h-1 w-1 rounded-full', colors.dot, status === 'active' && 'animate-ember')} />
      {meta.label}
    </span>
  );
}

export function ProgressBar({
  progress,
  color = 'gold',
  showLabel = true,
  className,
}: {
  progress: Progress;
  color?: PaletteColor;
  showLabel?: boolean;
  className?: string;
}) {
  const target = progress.target > 0 ? progress.target : 0;
  const ratio = target > 0 ? Math.min(1, Math.max(0, progress.current / target)) : 0;
  const colors = colorClasses(color);
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-ink/[0.08]">
        <div
          className={cn('h-full rounded-full transition-[width] duration-300 ease-ledger', colors.dot)}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      {showLabel ? (
        <span className="shrink-0 font-sans text-2xs tabular-nums text-faint">
          {progress.current}
          <span className="opacity-50"> / </span>
          {target}
        </span>
      ) : null}
    </div>
  );
}
