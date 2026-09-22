import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

/**
 * A destructive button that asks once, inline, and forgets the question after
 * a moment. For small, cheap-to-recreate things where a modal would be heavier
 * than the loss.
 */
export function ArmedButton({
  children,
  armedLabel,
  onConfirm,
  className,
}: {
  children: ReactNode;
  armedLabel: ReactNode;
  onConfirm: () => void;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(timer);
  }, [armed]);
  return (
    <Button
      variant={armed ? 'danger' : 'ghost'}
      size="sm"
      className={cn(!armed && 'text-faint hover:text-rose', className)}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      {armed ? armedLabel : children}
    </Button>
  );
}
