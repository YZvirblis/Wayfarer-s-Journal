import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({
  children,
  align = 'end',
  className,
  sideOffset = 6,
}: {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
  sideOffset?: number;
}) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[11rem] animate-scale-in overflow-hidden rounded-card border bg-panel p-1 shadow-lifted',
          className,
        )}
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  children,
  onSelect,
  danger,
  disabled,
}: {
  children: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex cursor-default select-none items-center gap-2.5 rounded px-2.5 py-1.5 text-sm outline-none transition-colors',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
        danger
          ? 'text-rose data-[highlighted]:bg-rose/10'
          : 'text-ink/85 data-[highlighted]:bg-gold/10 data-[highlighted]:text-ink',
      )}
    >
      {children}
    </DropdownMenu.Item>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <DropdownMenu.Label className="wj-label px-2.5 pb-1 pt-2">{children}</DropdownMenu.Label>;
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-line/10" />;
}

export function MenuRadioGroup({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <DropdownMenu.RadioGroup value={value} onValueChange={onValueChange}>
      {children}
    </DropdownMenu.RadioGroup>
  );
}

export function MenuRadioItem({ value, children }: { value: string; children: ReactNode }) {
  return (
    <DropdownMenu.RadioItem
      value={value}
      className="flex cursor-default select-none items-center gap-2.5 rounded px-2.5 py-1.5 text-sm text-ink/85 outline-none transition-colors data-[highlighted]:bg-gold/10 data-[state=checked]:text-gold"
    >
      <span className="w-2 text-[0.5rem] leading-none">
        <DropdownMenu.ItemIndicator>◆</DropdownMenu.ItemIndicator>
      </span>
      {children}
    </DropdownMenu.RadioItem>
  );
}
