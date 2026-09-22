import { CirclePlus } from 'lucide-react';
import { cn } from '../lib/cn';
import { iconByName } from '../lib/icons';
import { useLinks } from '../lib/linkContext';
import { resolveLink } from '../lib/links';
import { colorClasses } from '../lib/palette';
import { singularize } from '../lib/words';
import { Tooltip } from './ui/Tooltip';

/** A rendered `[[link]]`: a chip that opens the entry, or a dashed stub offering to create it. */
export function WikiLink({ title, typeName }: { title: string; typeName?: string }) {
  const { entries, entryTypes, openEntry, createFromLink } = useLinks();
  const entry = resolveLink(entries, entryTypes, title, typeName);
  const type = entry ? entryTypes.find((candidate) => candidate.id === entry.typeId) : undefined;

  if (entry && type) {
    const Icon = iconByName(type.icon);
    return (
      <Tooltip label={`Open ${singularize(type.name).toLowerCase()}`}>
        <button
          type="button"
          onClick={() => openEntry(entry.id)}
          className={cn('wj-link', colorClasses(type.color).chip)}
        >
          <Icon strokeWidth={2} aria-hidden />
          <span className="truncate">{entry.title}</span>
        </button>
      </Tooltip>
    );
  }

  return (
    <Tooltip label="Not in the journal yet — add it">
      <button type="button" onClick={() => createFromLink(title, typeName)} className="wj-link wj-link-missing">
        <CirclePlus strokeWidth={2} aria-hidden />
        <span className="truncate">{title}</span>
      </button>
    </Tooltip>
  );
}
