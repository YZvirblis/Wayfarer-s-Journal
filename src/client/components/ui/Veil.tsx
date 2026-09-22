import { EyeOff } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * Blurs secret content while hide-secrets mode is on. A click (never a hover)
 * reveals it until the mode is switched off and on again. Built from spans so
 * it can sit inside a list-row button.
 */
export function Veil({
  hidden,
  children,
  className,
  label = 'Secret',
}: {
  hidden: boolean;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!hidden) setRevealed(false);
  }, [hidden]);

  if (!hidden || revealed) return <>{children}</>;

  return (
    <span className={cn('relative block', className)}>
      <span aria-hidden className="pointer-events-none block select-none opacity-60 blur-[7px]">
        {children}
      </span>
      <span
        role="button"
        tabIndex={0}
        aria-label={`${label} — click to reveal`}
        onClick={(event) => {
          event.stopPropagation();
          setRevealed(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            setRevealed(true);
          }
        }}
        className="absolute inset-0 flex cursor-pointer items-center justify-center rounded"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-plum/40 bg-panel/90 px-2.5 py-1 text-2xs uppercase tracking-[0.14em] text-plum shadow-card">
          <EyeOff className="h-3 w-3" />
          {label} · click to reveal
        </span>
      </span>
    </span>
  );
}
