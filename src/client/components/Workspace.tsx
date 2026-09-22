import { AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { CharacterSummary, EntryType, PaletteColor } from '../../shared/schema';
import { api, errorMessage } from '../lib/api';
import { createEntryType, deleteEntryType, openDocument, updateEntryType, useDocumentState } from '../lib/documentStore';
import type { View } from '../types';
import { EntryTypeView } from './EntryTypeView';
import { Overview } from './Overview';
import { SectionDialog } from './SectionDialog';
import { Sidebar } from './Sidebar';
import { TagManager } from './TagManager';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface WorkspaceProps {
  characterId: string;
  characters: CharacterSummary[];
  onSwitchCharacter: (id: string) => void;
  onManageCharacters: () => void;
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center px-8">{children}</div>;
}

export function Workspace({ characterId, characters, onSwitchCharacter, onManageCharacters }: WorkspaceProps) {
  const { doc } = useDocumentState();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: 'overview' });
  const [selection, setSelection] = useState<Record<string, string | null>>({});
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [sectionDialog, setSectionDialog] = useState<{ open: boolean; type: EntryType | null }>({
    open: false,
    type: null,
  });
  const [pendingSectionDelete, setPendingSectionDelete] = useState<EntryType | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getCharacter(characterId)
      .then((loaded) => {
        if (!cancelled) openDocument(loaded);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setLoadError(errorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [characterId]);

  const toggleTag = useCallback(
    (tagId: string) => {
      setActiveTagIds((current) =>
        current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
      );
      // Filtering only makes sense in a list, so jump somewhere it is visible.
      if (view.kind === 'overview' && doc) {
        const withMatch = doc.entryTypes.find((type) =>
          doc.entries.some((entry) => entry.typeId === type.id && entry.tagIds.includes(tagId)),
        );
        const target = withMatch ?? doc.entryTypes[0];
        if (target) setView({ kind: 'type', typeId: target.id });
      }
    },
    [doc, view.kind],
  );

  if (loadError) {
    return (
      <Centered>
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto mb-4 h-6 w-6 text-rose" />
          <h2 className="font-display text-lg tracking-title text-ink">This journal would not open</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{loadError}</p>
          <Button className="mt-6" onClick={onManageCharacters}>
            Back to characters
          </Button>
        </div>
      </Centered>
    );
  }

  if (!doc || doc.id !== characterId) {
    return (
      <Centered>
        <p className="animate-ember font-display text-sm uppercase tracking-wordmark text-gold/60">Opening the journal…</p>
      </Centered>
    );
  }

  const activeType = view.kind === 'type' ? doc.entryTypes.find((type) => type.id === view.typeId) : undefined;

  function handleSectionSubmit(values: { name: string; icon: string; color: PaletteColor }): void {
    const existing = sectionDialog.type;
    if (existing) {
      updateEntryType(existing.id, (type) => {
        type.name = values.name;
        type.icon = values.icon;
        type.color = values.color;
      });
    } else {
      const id = createEntryType(values.name, values.icon, values.color);
      setView({ kind: 'type', typeId: id });
    }
  }

  return (
    <div className="flex h-full">
      <Sidebar
        doc={doc}
        characters={characters}
        view={view}
        activeTagIds={activeTagIds}
        onNavigate={setView}
        onToggleTag={toggleTag}
        onOpenTagManager={() => setTagManagerOpen(true)}
        onNewSection={() => setSectionDialog({ open: true, type: null })}
        onEditSection={(type) => setSectionDialog({ open: true, type })}
        onDeleteSection={(type) => setPendingSectionDelete(type)}
        onSwitchCharacter={onSwitchCharacter}
        onManageCharacters={onManageCharacters}
      />

      <main className="flex min-w-0 flex-1">
        {view.kind === 'overview' ? (
          <Overview doc={doc} />
        ) : activeType ? (
          <EntryTypeView
            key={activeType.id}
            doc={doc}
            type={activeType}
            selectedId={selection[activeType.id] ?? null}
            onSelect={(id) => setSelection((current) => ({ ...current, [activeType.id]: id }))}
            activeTagIds={activeTagIds}
            onToggleTag={toggleTag}
            onClearTags={() => setActiveTagIds([])}
          />
        ) : (
          <Centered>
            <p className="text-sm text-faint">That section is gone. Pick another from the sidebar.</p>
          </Centered>
        )}
      </main>

      <TagManager open={tagManagerOpen} onOpenChange={setTagManagerOpen} doc={doc} />

      <SectionDialog
        open={sectionDialog.open}
        onOpenChange={(open) => setSectionDialog((current) => ({ ...current, open }))}
        type={sectionDialog.type}
        onSubmit={handleSectionSubmit}
      />

      <ConfirmDialog
        open={pendingSectionDelete !== null}
        onOpenChange={(open) => !open && setPendingSectionDelete(null)}
        title={`Delete the "${pendingSectionDelete?.name ?? ''}" section?`}
        confirmLabel="Delete section"
        onConfirm={() => {
          const target = pendingSectionDelete;
          setPendingSectionDelete(null);
          if (!target) return;
          if (view.kind === 'type' && view.typeId === target.id) setView({ kind: 'overview' });
          deleteEntryType(target.id);
        }}
      >
        <p className="text-sm leading-relaxed text-muted">
          Every entry filed under it will be deleted too. Your last twenty saves are kept as backups on disk.
        </p>
      </ConfirmDialog>
    </div>
  );
}
