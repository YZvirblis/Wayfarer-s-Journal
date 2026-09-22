import { cn } from '../lib/cn';

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-2xl',
} as const;

function initials(name: string): string {
  const words = name.trim().split(/[\s'-]+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '?';
  const second = words.length > 1 ? words[words.length - 1]?.[0] : undefined;
  return (second ? `${first}${second}` : first).toUpperCase();
}

/** Stands in for a portrait until Phase 3 adds real image uploads. */
export function Sigil({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative flex shrink-0 select-none items-center justify-center rounded border border-gold/25',
        'bg-gradient-to-br from-gold/[0.16] via-transparent to-ember/[0.10] font-display tracking-title text-gold/90 shadow-rim',
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
