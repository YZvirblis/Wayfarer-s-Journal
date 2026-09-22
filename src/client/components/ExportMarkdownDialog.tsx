import { Download, Eye, EyeOff } from 'lucide-react';
import type { CharacterDocument } from '../../shared/schema';
import { downloadText, exportFilename } from '../lib/download';
import { countSecrets, renderMarkdown } from '../lib/exportMarkdown';
import { useSettings } from '../lib/settingsStore';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface ExportMarkdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: CharacterDocument;
}

/** One question before the download: are secrets going in? (Decided by hide-secrets mode.) */
export function ExportMarkdownDialog({ open, onOpenChange, doc }: ExportMarkdownDialogProps) {
  const { hideSecrets } = useSettings();
  const secrets = countSecrets(doc);
  const includeSecrets = !hideSecrets;

  function download() {
    downloadText(exportFilename(doc.profile.name, 'md'), renderMarkdown(doc, { includeSecrets }), 'text/markdown;charset=utf-8');
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Export as Markdown"
      description="One readable file: profile, every section, sessions, a ledger summary, goals and the inbox."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={download}>
            <Download className="h-3.5 w-3.5" />
            Download .md
          </Button>
        </>
      }
    >
      <div
        className={
          includeSecrets
            ? 'flex items-start gap-3 rounded border border-gold/25 bg-gold/[0.06] px-3 py-2.5 text-sm'
            : 'flex items-start gap-3 rounded border border-plum/30 bg-plum/10 px-3 py-2.5 text-sm'
        }
      >
        {includeSecrets ? <Eye className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> : <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-plum" />}
        <p className="leading-relaxed text-ink/90">
          {includeSecrets ? (
            <>
              <strong>Secrets will be included.</strong> Hide-secrets mode is off, so the {secrets} item{secrets === 1 ? '' : 's'}{' '}
              marked secret go in with everything else. Turn the mode on first to leave them out.
            </>
          ) : (
            <>
              <strong>Secrets will be left out.</strong> Hide-secrets mode is on, so the {secrets} item
              {secrets === 1 ? '' : 's'} marked secret {secrets === 1 ? 'is' : 'are'} omitted. Turn the mode off to include them.
            </>
          )}
        </p>
      </div>
    </Modal>
  );
}
