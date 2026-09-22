import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { IconButton } from './Button';
import { Divider } from './Divider';
import { Tooltip } from './Tooltip';

const WIDTHS = {
  sm: 'max-w-[27rem]',
  md: 'max-w-[34rem]',
  lg: 'max-w-[46rem]',
} as const;

/**
 * Where floating panels sit. A fixed, full-viewport flex box centres the panel
 * (top-anchored for the palette-style ones) with a 1rem gutter on every side,
 * so no transform is involved and nothing can push it off centre or off
 * screen. The wrapper ignores pointer events; the overlay behind it takes the
 * outside click that closes the dialog.
 */
export const DIALOG_FRAME = {
  centred: 'pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4',
  top: 'pointer-events-none fixed inset-0 z-50 flex items-start justify-center px-4 pb-4 pt-[12vh]',
} as const;

/** The panel itself: full width up to its cap, clicks enabled again, never taller than the frame. */
export const DIALOG_PANEL = 'pointer-events-auto flex max-h-full w-full flex-col rounded-card border bg-panel shadow-lifted';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof WIDTHS;
}

export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md' }: ModalProps) {
  const content = useRef<HTMLDivElement | null>(null);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-black/60 backdrop-blur-[2px]" />
        <div className={DIALOG_FRAME.centred}>
        <Dialog.Content
          ref={content}
          // Land on the first thing worth typing into, not the Close button in the corner.
          onOpenAutoFocus={(event) => {
            const first = content.current?.querySelector<HTMLElement>(
              'input:not([type="hidden"]):not([type="file"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [data-autofocus]',
            );
            const target = first ?? content.current?.querySelector<HTMLElement>('[data-autofocus-fallback]');
            if (target) {
              event.preventDefault();
              target.focus();
            }
          }}
          className={cn(DIALOG_PANEL, 'animate-modal-in', WIDTHS[size])}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-5">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-lg tracking-title text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm leading-relaxed text-muted">{description}</Dialog.Description>
              ) : null}
            </div>
            <Tooltip label="Close · Esc">
              <Dialog.Close asChild>
                <IconButton variant="ghost" aria-label="Close" className="-mr-2 -mt-1.5">
                  <X />
                </IconButton>
              </Dialog.Close>
            </Tooltip>
          </div>
          <Divider className="mt-4 shrink-0 px-6" />
          <div className="wj-scroll min-h-0 max-h-[min(60vh,32rem)] flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer ? <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-4">{footer}</div> : null}
        </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
