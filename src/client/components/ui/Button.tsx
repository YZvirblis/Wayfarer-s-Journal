import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'border-gold/35 bg-gradient-to-b from-gold/[0.22] to-gold/[0.08] text-gold hover:from-gold/30 hover:to-gold/[0.14] hover:border-gold/55 active:from-gold/20',
  secondary: 'border-line/15 bg-raised/60 text-ink hover:bg-raised hover:border-line/30',
  ghost: 'border-transparent text-muted hover:bg-ink/[0.05] hover:text-ink',
  danger: 'border-rose/30 bg-rose/[0.06] text-rose hover:bg-rose/[0.14] hover:border-rose/50',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 gap-1.5 px-2.5 text-xs',
  md: 'h-9 gap-2 px-3.5 text-sm',
  lg: 'h-11 gap-2.5 px-5 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded border font-sans font-medium',
        'transition-all duration-150 ease-ledger disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});

/** Square icon-only button; pair with a Tooltip or aria-label. */
export const IconButton = forwardRef<HTMLButtonElement, ButtonProps>(function IconButton(
  { className, size = 'md', ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      size={size}
      className={cn('px-0', size === 'sm' ? 'w-7' : size === 'lg' ? 'w-11' : 'w-9', className)}
      {...props}
    />
  );
});
