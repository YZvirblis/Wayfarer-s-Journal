import { cn } from '../../lib/cn';

interface SegmentedControlProps<T extends string> {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({ value, options, onChange, className }: SegmentedControlProps<T>) {
  return (
    <div className={cn('inline-flex rounded border border-line/15 bg-base/50 p-0.5', className)} role="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-[2px] px-2.5 py-1 text-xs font-medium transition-colors duration-150',
              active ? 'bg-gold/15 text-gold' : 'text-faint hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
