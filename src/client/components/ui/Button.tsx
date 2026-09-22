import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'border-gold/35 bg-gradient-to-b from-gold/[0.22] to-gold/[0.08] text-gold hover:from-gold/30 hover:to-gold/[0.14] hover:border-gold/55 active:from-gold/20',
  secondary: 'border-line/15 bg-raised/60 text-ink hover:bg-raised hover:border-line/30',
  // Quiet controls read as "muted" at rest, "ink" under the pointer, and stay lit while their menu is open.
  ghost:
    'border-transparent text-muted hover:bg-ink/[0.06] hover:text-ink active:bg-ink/[0.09] data-[state=open]:bg-ink/[0.06] data-[state=open]:text-ink aria-pressed:text-ink',
  danger: 'border-rose/30 bg-rose/[0.06] text-rose hover:bg-rose/[0.14] hover:border-rose/50',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
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

type IconSize = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Hit target and glyph size go together, and the glyph size is set here —
 * not on the icon — so no control can shrink below what a pointer can hit
 * or an eye can read. `xs` is for dense rows only (a field row, a ledger
 * line, a sidebar row); everything else starts at `sm`.
 */
const ICON_SIZES: Record<IconSize, string> = {
  xs: 'h-8 w-8 [&>svg]:h-4 [&>svg]:w-4',
  sm: 'h-9 w-9 [&>svg]:h-[1.125rem] [&>svg]:w-[1.125rem]',
  md: 'h-10 w-10 [&>svg]:h-5 [&>svg]:w-5',
  lg: 'h-11 w-11 [&>svg]:h-[1.375rem] [&>svg]:w-[1.375rem]',
};

export interface IconButtonProps extends Omit<ButtonProps, 'size'> {
  size?: IconSize;
}

/** Square icon-only button; pair with a Tooltip and give it an aria-label. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, size = 'sm', ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      size={size === 'lg' ? 'lg' : size === 'md' ? 'md' : 'sm'}
      className={cn('px-0 [&>svg]:shrink-0', ICON_SIZES[size], className)}
      {...props}
    />
  );
});
