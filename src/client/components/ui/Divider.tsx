import { cn } from '../../lib/cn';

/** The project's one decorative motif: a fading rule with a gold lozenge. */
export function Divider({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn('wj-divider', className)} role="presentation">
      {label ? <span className="wj-eyebrow">{label}</span> : <span className="text-[0.55rem]">◆</span>}
    </div>
  );
}
