import { CornerDownRight, Feather, FilePlus2, Inbox, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Capture, CharacterDocument } from '../../shared/schema';
import { cn } from '../lib/cn';
import { appendCaptureToEntry, convertCapture, deleteCapture, splitCapture, updateCapture } from '../lib/documentStore';
import { relativeTime } from '../lib/format';
import { CAPTURE_SHORTCUT } from '../lib/keys';
import { useLinks } from '../lib/linkContext';
import { EntryPicker } from './EntryPicker';
import { MarkdownField } from './MarkdownField';
import { NewEntryDialog } from './NewEntryDialog';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { Tooltip } from './ui/Tooltip';

/** "Dismiss" asks once, inline, and forgets the question after a moment. */
function DismissButton({ onConfirm }: { onConfirm: () => void }) {
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
      className={cn(!armed && 'text-faint hover:text-rose')}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      <Trash2 className="h-3 w-3" />
      {armed ? 'Sure? Dismiss' : 'Dismiss'}
    </Button>
  );
}

function CaptureCard({
  capture,
  onConvert,
  onAppend,
}: {
  capture: Capture;
  onConvert: () => void;
  onAppend: () => void;
}) {
  return (
    <li className="wj-card animate-rise-in px-5 pb-3 pt-4">
      <MarkdownField
        value={capture.body}
        onChange={(value) => updateCapture(capture.id, value)}
        placeholder="An empty capture — write something or dismiss it."
        minHeight={60}
      />
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-2.5">
        <span className="mr-auto text-2xs text-faint">Jotted {relativeTime(capture.createdAt)}</span>
        <Button variant="secondary" size="sm" onClick={onConvert}>
          <FilePlus2 className="h-3 w-3" />
          Make an entry
        </Button>
        <Button variant="secondary" size="sm" onClick={onAppend}>
          <CornerDownRight className="h-3 w-3" />
          Add to an entry
        </Button>
        <DismissButton onConfirm={() => deleteCapture(capture.id)} />
      </div>
    </li>
  );
}

interface InboxViewProps {
  doc: CharacterDocument;
  onCapture: () => void;
}

export function InboxView({ doc, onCapture }: InboxViewProps) {
  const { openEntry } = useLinks();
  const [converting, setConverting] = useState<Capture | null>(null);
  const [appending, setAppending] = useState<Capture | null>(null);
  const draftTitle = converting ? splitCapture(converting.body).title : '';

  return (
    <div className="wj-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-6 pane:px-10 pane:pt-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="wj-eyebrow">Unsorted</p>
            <h2 className="mt-1 font-display text-[1.75rem] leading-tight tracking-title text-ink">Inbox</h2>
            <p className="mt-1.5 text-sm text-muted">
              Things jotted mid-scene, waiting to be filed. Press{' '}
              <kbd className="rounded border border-line/20 px-1.5 py-px font-sans text-2xs text-faint">{CAPTURE_SHORTCUT}</kbd>{' '}
              anywhere to add one.
            </p>
          </div>
          <Tooltip label={`Quick capture · ${CAPTURE_SHORTCUT}`}>
            <Button variant="primary" onClick={onCapture}>
              <Feather className="h-3.5 w-3.5" />
              Capture
            </Button>
          </Tooltip>
        </header>

        {doc.captures.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Nothing waiting"
            hint={`Every capture lands here. Turn it into an entry, add it to one you already have, or let it go.`}
            action={
              <Button variant="primary" onClick={onCapture}>
                <Feather className="h-3.5 w-3.5" />
                Capture something
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {doc.captures.map((capture) => (
              <CaptureCard
                key={capture.id}
                capture={capture}
                onConvert={() => setConverting(capture)}
                onAppend={() => setAppending(capture)}
              />
            ))}
          </ul>
        )}
      </div>

      <NewEntryDialog
        open={converting !== null}
        onOpenChange={(open) => !open && setConverting(null)}
        entryTypes={doc.entryTypes}
        initialTitle={draftTitle}
        onSubmit={({ title, typeId }) => {
          const type = doc.entryTypes.find((candidate) => candidate.id === typeId);
          if (!converting || !type) return;
          const id = convertCapture(converting.id, type, title);
          if (id) openEntry(id);
        }}
      />

      <EntryPicker
        open={appending !== null}
        onOpenChange={(open) => !open && setAppending(null)}
        doc={doc}
        title="Add this capture to…"
        onPick={(entry) => {
          if (appending && appendCaptureToEntry(appending.id, entry.id)) openEntry(entry.id);
        }}
      />
    </div>
  );
}
