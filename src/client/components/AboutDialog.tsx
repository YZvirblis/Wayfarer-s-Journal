import { Coffee, ExternalLink, Github, Scale } from 'lucide-react';
import type { ReactNode } from 'react';
import { APP_AUTHOR, APP_NAME, APP_TAGLINE, APP_VERSION, COFFEE_URL, LICENSE_URL, REPO_URL } from '../lib/appInfo';
import { Modal } from './ui/Modal';

function Link({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center gap-3 rounded border border-line/15 px-3 py-2 text-sm text-ink/90 transition-colors hover:border-gold/40 hover:bg-gold/[0.05] hover:text-ink"
    >
      <span className="text-gold">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <ExternalLink className="h-3 w-3 shrink-0 text-faint" />
    </a>
  );
}

/** Name, version, three links, a credit. Nothing loads from anywhere. */
export function AboutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={APP_NAME} description={APP_TAGLINE} size="sm">
      <div className="space-y-4">
        <p className="text-2xs uppercase tracking-[0.14em] text-faint">
          Version {APP_VERSION} · Open source, MIT · No accounts, no cloud, no telemetry
        </p>
        <div className="space-y-1.5" data-autofocus-fallback tabIndex={-1}>
          <Link href={REPO_URL} icon={<Github className="h-4 w-4" />}>
            Source, releases and issues on GitHub
          </Link>
          <Link href={COFFEE_URL} icon={<Coffee className="h-4 w-4" />}>
            Buy me a coffee
          </Link>
          <Link href={LICENSE_URL} icon={<Scale className="h-4 w-4" />}>
            MIT licence
          </Link>
        </div>
        <p className="text-xs leading-relaxed text-muted">
          Made by {APP_AUTHOR}, for roleplayers everywhere. Unofficial fan tool, not affiliated with any game or server.
        </p>
      </div>
    </Modal>
  );
}
