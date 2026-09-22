import { X } from 'lucide-react';
import type { Tag } from '../../shared/schema';
import { cn } from '../lib/cn';
import { colorClasses } from '../lib/palette';

interface TagChipProps {
  tag: Tag;
  size?: 'sm' | 'md';
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function TagChip({ tag, size = 'md', active, onClick, onRemove, className }: TagChipProps) {
  const colors = colorClasses(tag.color);
  const interactive = Boolean(onClick);
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border transition-colors duration-150',
        size === 'sm' ? 'px-2 py-[0.09rem] text-2xs' : 'px-2.5 py-0.5 text-xs',
        active ? colors.chip : 'border-line/15 bg-ink/[0.03] text-muted',
        interactive && !active && 'hover:border-line/30 hover:text-ink',
        className,
      )}
    >
      {interactive ? (
        <button type="button" onClick={onClick} className="flex min-w-0 items-center gap-1.5 rounded-full">
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', colors.dot, !active && 'opacity-70')} />
          <span className="truncate">{tag.name}</span>
        </button>
      ) : (
        <>
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', colors.dot)} />
          <span className="truncate">{tag.name}</span>
        </>
      )}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${tag.name}`}
          className="-mr-0.5 shrink-0 rounded-full p-0.5 opacity-55 transition-opacity hover:opacity-100"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      ) : null}
    </span>
  );
}
