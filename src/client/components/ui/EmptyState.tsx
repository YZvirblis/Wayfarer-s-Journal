import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** Always say what to do next — the UX rule is "no dead ends". */
  hint: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, hint, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-8 py-14 text-center', className)}>
      <div className="relative mb-5 flex h-14 w-14 items-center justify-center">
        <span className="absolute inset-0 rotate-45 rounded-[6px] border border-gold/20 bg-gold/[0.04]" />
        <Icon className="relative h-5 w-5 text-gold/70" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-base tracking-title text-ink/90">{title}</h3>
      <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-faint">{hint}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
