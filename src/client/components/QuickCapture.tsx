import * as Dialog from '@radix-ui/react-dialog';
import { Feather, Inbox } from 'lucide-react';
import { useEffect, useState } from 'react';
import { addCapture } from '../lib/documentStore';
import { CAPTURE_SHORTCUT } from '../lib/keys';
import { LinkTextarea } from './LinkTextarea';
import { Button } from './ui/Button';

interface QuickCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenInbox: () => void;
}

/**
 * The smallest possible surface for writing something down mid-scene: one
 * box, Enter to keep it, Escape to abandon it. Captures land in the Inbox to
 * be filed later.
 */
export function QuickCapture({ open, onOpenChange, onOpenInbox }: QuickCaptureProps) {
  const [text, setText] = useState('');
  const [kept, setKept] = useState(0);

  useEffect(() => {
    if (open) {
      setText('');
      setKept(0);
    }
  }, [open]);

  function keep(andClose: boolean) {
    if (!addCapture(text)) return;
    setText('');
    setKept((count) => count + 1);
    if (andClose) onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[14vh] z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 animate-scale-in rounded-card border border-gold/25 bg-panel shadow-glow"
        >
          <div className="flex items-center gap-2 px-4 pt-3">
            <Feather className="h-3.5 w-3.5 text-gold/80" strokeWidth={1.75} />
            <Dialog.Title className="wj-eyebrow">Quick capture</Dialog.Title>
            <span className="ml-auto text-2xs text-faint">{kept > 0 ? `${kept} kept` : CAPTURE_SHORTCUT}</span>
          </div>
          <div className="px-4 pb-3 pt-2">
            <LinkTextarea
              autoFocus
              value={text}
              onChange={setText}
              placeholder="What just happened? A name, a price, a promise… [[links]] work here."
              aria-label="Capture"
              minHeight={72}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  keep(!event.ctrlKey && !event.metaKey);
                }
              }}
              className="wj-field font-serif text-[1.0625rem] leading-[1.6]"
            />
          </div>
          <div className="flex items-center gap-3 border-t px-4 py-2 text-2xs text-faint">
            <span>↵ keep &amp; close</span>
            <span>Ctrl ↵ keep &amp; write another</span>
            <span>⇧↵ new line</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 gap-1 px-1.5 text-2xs text-faint hover:text-gold"
              onClick={() => {
                onOpenChange(false);
                onOpenInbox();
              }}
            >
              <Inbox className="h-3 w-3" />
              Inbox
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
