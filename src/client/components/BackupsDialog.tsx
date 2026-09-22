import { AlertTriangle, Archive, Copy, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { BackupInfo, CharacterDocument } from '../../shared/schema';
import { api, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { formatDate, relativeTime } from '../lib/format';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { EmptyState } from './ui/EmptyState';
import { Modal } from './ui/Modal';

interface BackupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: CharacterDocument;
  /** A backup was restored as a separate character; open it. */
  onRestoredAsNew: (id: string) => void;
  /** The current character was replaced; the store must reload. */
  onReplaced: (doc: CharacterDocument) => void;
}

function timeOf(backup: BackupInfo): string {
  if (!backup.savedAt) return backup.file;
  const date = new Date(backup.savedAt);
  return `${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · ${formatDate(backup.savedAt)}`;
}

/** The last twenty saves of this character, with a way back to any of them. */
export function BackupsDialog({ open, onOpenChange, doc, onRestoredAsNew, onReplaced }: BackupsDialogProps) {
  const [backups, setBackups] = useState<BackupInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingReplace, setPendingReplace] = useState<BackupInfo | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBackups(null);
    setError(null);
    api
      .listBackups(doc.id)
      .then((list) => {
        if (!cancelled) setBackups(list);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [open, doc.id]);

  async function restore(backup: BackupInfo, mode: 'new' | 'replace') {
    setBusy(backup.file);
    setError(null);
    try {
      const restored = await api.restoreBackup(doc.id, backup.file, mode);
      onOpenChange(false);
      if (mode === 'new') onRestoredAsNew(restored.id);
      else onReplaced(restored);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="Backups"
        description={`Every save of ${doc.profile.name} keeps the previous version aside; the newest twenty are here.`}
        size="lg"
      >
        {error ? (
          <p className="mb-3 flex items-start gap-2 text-xs leading-relaxed text-rose">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : null}
        {backups === null ? (
          <p className="animate-ember py-8 text-center font-display text-xs uppercase tracking-wordmark text-gold/60">
            Reading the backups…
          </p>
        ) : backups.length === 0 ? (
          <EmptyState
            icon={Archive}
            title="No backups yet"
            hint="A backup is taken every time the journal saves over an earlier version. Write something and one will appear."
            className="py-8"
          />
        ) : (
          <ul className="divide-y divide-line/[0.08]">
            {backups.map((backup, index) => (
              <li
                key={backup.file}
                className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5', backup.unreadable && 'opacity-60')}
              >
                <div className="min-w-[11rem] flex-1">
                  <p className="text-sm text-ink/90">
                    {timeOf(backup)}
                    {index === 0 ? <span className="ml-2 text-2xs uppercase tracking-[0.12em] text-gold/80">newest</span> : null}
                  </p>
                  <p className="text-2xs text-faint">
                    {backup.unreadable
                      ? 'Could not be read'
                      : `${relativeTime(backup.savedAt)} · ${backup.name} · format ${backup.schemaVersion}`}
                  </p>
                </div>
                {backup.unreadable ? null : (
                  <p className="text-2xs tabular-nums text-muted">
                    {backup.counts.entries} entries · {backup.counts.tags} tags · {backup.counts.transactions} ledger ·{' '}
                    {backup.counts.sessions} sessions · {backup.counts.goals} goals
                  </p>
                )}
                {backup.unreadable ? null : (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy !== null}
                      onClick={() => void restore(backup, 'new')}
                    >
                      <Copy className="h-3 w-3" />
                      Restore as new
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted hover:text-rose"
                      disabled={busy !== null}
                      onClick={() => setPendingReplace(backup)}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Replace current
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={pendingReplace !== null}
        onOpenChange={(next) => !next && setPendingReplace(null)}
        title={`Replace ${doc.profile.name} with the ${pendingReplace ? timeOf(pendingReplace) : ''} version?`}
        confirmLabel="Replace"
        cancelLabel="Keep the current version"
        onConfirm={() => {
          const target = pendingReplace;
          setPendingReplace(null);
          if (target) void restore(target, 'replace');
        }}
      >
        <p className="text-sm leading-relaxed text-muted">
          Everything written since then goes. The version you are replacing is backed up first, so it will sit at the top of
          this list if you change your mind.
        </p>
      </ConfirmDialog>
    </>
  );
}
