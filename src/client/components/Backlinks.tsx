import { CalendarDays, Inbox, UserRound, type LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import type { CharacterDocument } from '../../shared/schema';
import { cn } from '../lib/cn';
import { iconByName } from '../lib/icons';
import { useLinks } from '../lib/linkContext';
import { backlinksTo, type Backlink } from '../lib/links';
import { colorClasses } from '../lib/palette';
import { singularize } from '../lib/words';

const KIND_LABELS: Record<Exclude<Backlink['source']['kind'], 'entry'>, string> = {
  section: 'Overview',
  capture: 'Inbox',
  session: 'Session',
};

const KIND_ICONS: Record<Exclude<Backlink['source']['kind'], 'entry'>, LucideIcon> = {
  section: UserRound,
  capture: Inbox,
  session: CalendarDays,
};

function BacklinkRow({ backlink, doc }: { backlink: Backlink; doc: CharacterDocument }) {
  const { openSource } = useLinks();
  const { source } = backlink;
  const type = source.kind === 'entry' ? doc.entryTypes.find((candidate) => candidate.id === source.typeId) : undefined;
  const Icon = source.kind === 'entry' ? iconByName(type?.icon ?? '') : KIND_ICONS[source.kind];
  const kindLabel = source.kind === 'entry' ? singularize(type?.name ?? 'Entry') : KIND_LABELS[source.kind];
  const iconColor = type ? colorClasses(type.color).text : 'text-gold';

  return (
    <li>
      <button
        type="button"
        onClick={() => openSource(source)}
        className="group/back flex w-full items-start gap-3 rounded px-2.5 py-2 text-left transition-colors duration-150 hover:bg-ink/[0.035]"
      >
        <Icon className={cn('mt-[0.2rem] h-3.5 w-3.5 shrink-0', iconColor)} strokeWidth={1.75} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-sm text-ink/90 group-hover/back:text-ink">{source.label}</span>
            <span className="shrink-0 text-2xs text-faint">
              {kindLabel}
              {backlink.mentions > 1 ? ` · ×${backlink.mentions}` : ''}
            </span>
          </span>
          <span className="mt-0.5 block truncate font-serif text-[0.95rem] leading-snug text-muted">
            {backlink.before}
            <span className="text-ink/90">{backlink.title}</span>
            {backlink.after}
          </span>
        </span>
      </button>
    </li>
  );
}

/** "Mentioned in…" — every body that links to this entry, computed from the document each render. */
export function Backlinks({ doc, entryId, className }: { doc: CharacterDocument; entryId: string; className?: string }) {
  const backlinks = useMemo(() => backlinksTo(doc, entryId), [doc, entryId]);

  return (
    <section className={className} aria-label="Mentioned in">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="wj-label">Mentioned in</span>
        {backlinks.length > 0 ? <span className="text-2xs tabular-nums text-faint">{backlinks.length}</span> : null}
      </div>
      {backlinks.length === 0 ? (
        <p className="px-0.5 text-xs leading-relaxed text-faint">
          Nothing points here yet. Write <span className="text-muted">[[</span>
          <span className="text-muted">name</span>
          <span className="text-muted">]]</span> in another entry and it will show up here.
        </p>
      ) : (
        <ul className="-mx-2.5 space-y-0.5">
          {backlinks.map((backlink) => (
            <BacklinkRow key={`${backlink.source.kind}:${backlink.source.id}`} backlink={backlink} doc={doc} />
          ))}
        </ul>
      )}
    </section>
  );
}
