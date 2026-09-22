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

/** A portrait when there is one, initials in a gilt frame when there is not. */
export function Sigil({
  name,
  portrait,
  size = 'md',
  className,
}: {
  name: string;
  portrait?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded border border-gold/25',
        'bg-gradient-to-br from-gold/[0.16] via-transparent to-ember/[0.10] font-display tracking-title text-gold/90 shadow-rim',
        SIZES[size],
        className,
      )}
    >
      {portrait ? <img src={portrait} alt="" className="h-full w-full object-cover" draggable={false} /> : initials(name)}
    </span>
  );
}
