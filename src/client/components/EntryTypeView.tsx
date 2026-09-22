import { Plus } from 'lucide-react';
import type { CharacterDocument, EntryType } from '../../shared/schema';
import { createEntry } from '../lib/documentStore';
import { iconByName } from '../lib/icons';
import { singularize } from '../lib/words';
import { EntryDetail } from './EntryDetail';
import { EntryList } from './EntryList';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';

interface EntryTypeViewProps {
  doc: CharacterDocument;
  type: EntryType;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  activeTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onClearTags: () => void;
}

export function EntryTypeView({
  doc,
  type,
  selectedId,
  onSelect,
  activeTagIds,
  onToggleTag,
  onClearTags,
}: EntryTypeViewProps) {
  const entry = doc.entries.find((candidate) => candidate.id === selectedId && candidate.typeId === type.id) ?? null;
  const singular = singularize(type.name).toLowerCase();

  function create() {
    onSelect(createEntry(type));
  }

  return (
    <div className="flex min-w-0 flex-1">
      <EntryList
        doc={doc}
        type={type}
        selectedId={entry?.id ?? null}
        onSelect={onSelect}
        onCreate={create}
        activeTagIds={activeTagIds}
        onToggleTag={onToggleTag}
        onClearTags={onClearTags}
      />

      {entry ? (
        <EntryDetail
          key={entry.id}
          doc={doc}
          type={type}
          entry={entry}
          onSelect={onSelect}
          onDeleted={() => onSelect(null)}
        />
      ) : (
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <EmptyState
            icon={iconByName(type.icon)}
            title="Nothing opened"
            hint={`Choose an entry on the left to read or edit it, or start a new ${singular}.`}
            action={
              <Button variant="primary" onClick={create}>
                <Plus className="h-3.5 w-3.5" />
                New {singular}
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
