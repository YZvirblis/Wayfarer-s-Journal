import { AlertTriangle, EyeOff } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CharacterSummary, EntryType, Goal, PaletteColor } from '../../shared/schema';
import { api, errorMessage } from '../lib/api';
import {
  addGoal,
  createEntry,
  createEntryType,
  createSession,
  deleteEntryType,
  getDocument,
  openDocument,
  updateEntryType,
  updateGoal,
  useDocumentState,
} from '../lib/documentStore';
import { downloadText, exportFilename } from '../lib/download';
import { LinkContext, type LinkContextValue } from '../lib/linkContext';
import { isCaptureShortcut, isPaletteShortcut } from '../lib/keys';
import { WIDE_QUERY, useMediaQuery } from '../lib/layout';
import { normalizeTitle, type LinkSource } from '../lib/links';
import { setHideSecrets, toggleHideSecrets, toggleTheme, useSettings } from '../lib/settingsStore';
import type { View } from '../types';
import type { PaletteActions } from './CommandPalette';
import { EntryTypeView } from './EntryTypeView';
import { NewEntryDialog } from './NewEntryDialog';
import { Overview } from './Overview';
import { QuickCapture } from './QuickCapture';
import { SectionDialog } from './SectionDialog';
import { Sidebar } from './Sidebar';
import { SidebarRail } from './SidebarRail';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';

// Everything that is not on screen at first paint loads on demand. The web
// brings d3-force with it; the rest are whole views or dialogs the player may
// never open in a sitting.
const WebView = lazy(() => import('./WebView').then((module) => ({ default: module.WebView })));
const LedgerView = lazy(() => import('./LedgerView').then((module) => ({ default: module.LedgerView })));
const GoalsView = lazy(() => import('./GoalsView').then((module) => ({ default: module.GoalsView })));
const SessionsView = lazy(() => import('./SessionsView').then((module) => ({ default: module.SessionsView })));
const InboxView = lazy(() => import('./InboxView').then((module) => ({ default: module.InboxView })));
const CommandPalette = lazy(() => import('./CommandPalette').then((module) => ({ default: module.CommandPalette })));
const TagManager = lazy(() => import('./TagManager').then((module) => ({ default: module.TagManager })));
const FieldsDialog = lazy(() => import('./FieldsDialog').then((module) => ({ default: module.FieldsDialog })));
const GoalDialog = lazy(() => import('./GoalDialog').then((module) => ({ default: module.GoalDialog })));
const ExportMarkdownDialog = lazy(() =>
  import('./ExportMarkdownDialog').then((module) => ({ default: module.ExportMarkdownDialog })),
);
const ImportCharacterDialog = lazy(() =>
  import('./ImportCharacterDialog').then((module) => ({ default: module.ImportCharacterDialog })),
);
const BackupsDialog = lazy(() => import('./BackupsDialog').then((module) => ({ default: module.BackupsDialog })));
const AboutDialog = lazy(() => import('./AboutDialog').then((module) => ({ default: module.AboutDialog })));

function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="animate-ember font-display text-xs uppercase tracking-wordmark text-gold/60">Turning the page…</p>
    </div>
  );
}

interface WorkspaceProps {
  characterId: string;
  characters: CharacterSummary[];
  onSwitchCharacter: (id: string) => void;
  onManageCharacters: () => void;
  /** A character was imported; refresh the list and open it. */
  onImported: (id: string) => void;
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center px-8">{children}</div>;
}

export function Workspace({ characterId, characters, onSwitchCharacter, onManageCharacters, onImported }: WorkspaceProps) {
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
  /** A `[[link]]` that resolved to nothing and was clicked: offer to create the entry. */
  const [linkDraft, setLinkDraft] = useState<{ title: string; typeName?: string } | null>(null);
  const [goalDialog, setGoalDialog] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const [fieldsTypeId, setFieldsTypeId] = useState<string | null>(null);
  const [exportMdOpen, setExportMdOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [backupsOpen, setBackupsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const { hideSecrets } = useSettings();

  const exportJson = useCallback(() => {
    const current = getDocument();
    if (current) downloadText(exportFilename(current.profile.name, 'json'), `${JSON.stringify(current, null, 2)}\n`, 'application/json');
  }, []);
  const wide = useMediaQuery(WIDE_QUERY);
  const [palette, setPalette] = useState<{ open: boolean; query: string }>({ open: false, query: '' });
  const [captureOpen, setCaptureOpen] = useState(false);
  const setPaletteOpen = useCallback(
    (open: boolean | ((current: boolean) => boolean), query = '') =>
      setPalette((current) => ({ open: typeof open === 'function' ? open(current.open) : open, query })),
    [],
  );

  // Global shortcuts (see lib/keys.ts). Each one closes the other's dialog so they never stack.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isPaletteShortcut(event)) {
        event.preventDefault();
        setCaptureOpen(false);
        setPaletteOpen((current) => !current);
      } else if (isCaptureShortcut(event)) {
        event.preventDefault();
        setPaletteOpen(false);
        setCaptureOpen((current) => !current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setPaletteOpen]);

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

  const showEntry = useCallback((typeId: string, id: string) => {
    setSelection((current) => ({ ...current, [typeId]: id }));
    setView({ kind: 'type', typeId });
  }, []);

  // Reads the live store rather than `doc`, so an entry created a moment ago can be opened too.
  const openEntry = useCallback(
    (id: string) => {
      const target = getDocument()?.entries.find((entry) => entry.id === id);
      if (target) showEntry(target.typeId, id);
    },
    [showEntry],
  );

  const openSource = useCallback(
    (source: LinkSource) => {
      if (source.kind === 'entry') showEntry(source.typeId, source.id);
      else if (source.kind === 'section') setView({ kind: 'overview' });
      else if (source.kind === 'capture') setView({ kind: 'inbox' });
      else if (source.kind === 'session') setView({ kind: 'sessions', sessionId: source.id });
      else if (source.kind === 'transaction') setView({ kind: 'ledger', counterpartyId: null });
      else setView({ kind: 'goals' });
    },
    [showEntry],
  );

  const openLedger = useCallback((counterpartyId?: string) => {
    setView({ kind: 'ledger', counterpartyId: counterpartyId ?? null });
  }, []);
  const openGoals = useCallback(() => setView({ kind: 'goals' }), []);
  const newGoal = useCallback(() => {
    setView({ kind: 'goals' });
    setGoalDialog({ open: true, goal: null });
  }, []);

  const openOverview = useCallback((sectionId?: string) => {
    setView({ kind: 'overview' });
    if (!sectionId) return;
    // The Overview may not be mounted yet; give it a frame before scrolling.
    window.setTimeout(() => {
      document.getElementById(`profile-section-${sectionId}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 60);
  }, []);

  const paletteActions = useMemo<PaletteActions>(
    () => ({
      openEntry: showEntry,
      openType: (typeId) => setView({ kind: 'type', typeId }),
      openOverview,
      openInbox: () => setView({ kind: 'inbox' }),
      openSessions: (sessionId) => setView({ kind: 'sessions', sessionId: sessionId ?? null }),
      newSession: () => setView({ kind: 'sessions', sessionId: createSession() }),
      openLedger: () => openLedger(),
      openGoals,
      newGoal,
      openWeb: () => setView({ kind: 'web' }),
      quickCapture: () => setCaptureOpen(true),
      toggleTag,
      createEntry: (type, title) => showEntry(type.id, createEntry(type, title)),
      switchCharacter: onSwitchCharacter,
      manageCharacters: onManageCharacters,
      toggleTheme,
      toggleSecrets: toggleHideSecrets,
      exportJson,
      exportMarkdown: () => setExportMdOpen(true),
      importCharacter: () => setImportOpen(true),
      backups: () => setBackupsOpen(true),
      about: () => setAboutOpen(true),
    }),
    [showEntry, openOverview, openLedger, openGoals, newGoal, toggleTag, onSwitchCharacter, onManageCharacters, exportJson],
  );

  const linkContext = useMemo<LinkContextValue>(
    () => ({
      entries: doc?.entries ?? [],
      entryTypes: doc?.entryTypes ?? [],
      openEntry,
      openSource,
      openLedger,
      openGoals,
      openOverview: () => openOverview(),
      createFromLink: (title, typeName) => setLinkDraft({ title, ...(typeName ? { typeName } : {}) }),
    }),
    [doc?.entries, doc?.entryTypes, openEntry, openSource, openLedger, openGoals, openOverview],
  );

  const openCapture = useCallback(() => {
    setPaletteOpen(false);
    setCaptureOpen(true);
  }, [setPaletteOpen]);

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

  const linkDraftTypeId = linkDraft?.typeName
    ? doc.entryTypes.find((type) => normalizeTitle(type.name) === normalizeTitle(linkDraft.typeName ?? ''))?.id
    : undefined;

  return (
    <LinkContext.Provider value={linkContext}>
    <div className="flex h-full">
      {wide ? (
        <Sidebar
          doc={doc}
          characters={characters}
          view={view}
          activeTagIds={activeTagIds}
          onNavigate={setView}
          onToggleTag={toggleTag}
          onOpenTagManager={() => setTagManagerOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onCapture={openCapture}
          onNewSection={() => setSectionDialog({ open: true, type: null })}
          onEditSection={(type) => setSectionDialog({ open: true, type })}
          onEditFields={(type) => setFieldsTypeId(type.id)}
          onDeleteSection={(type) => setPendingSectionDelete(type)}
          onSwitchCharacter={onSwitchCharacter}
          onManageCharacters={onManageCharacters}
          onExportJson={exportJson}
          onExportMarkdown={() => setExportMdOpen(true)}
          onImport={() => setImportOpen(true)}
          onBackups={() => setBackupsOpen(true)}
          onAbout={() => setAboutOpen(true)}
        />
      ) : (
        <SidebarRail
          doc={doc}
          characters={characters}
          view={view}
          activeTagIds={activeTagIds}
          onNavigate={setView}
          onToggleTag={toggleTag}
          onClearTags={() => setActiveTagIds([])}
          onOpenTagManager={() => setTagManagerOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onCapture={openCapture}
          onNewSection={() => setSectionDialog({ open: true, type: null })}
          onSwitchCharacter={onSwitchCharacter}
          onManageCharacters={onManageCharacters}
          onExportJson={exportJson}
          onExportMarkdown={() => setExportMdOpen(true)}
          onImport={() => setImportOpen(true)}
          onBackups={() => setBackupsOpen(true)}
          onAbout={() => setAboutOpen(true)}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        {hideSecrets ? (
          <div className="flex shrink-0 items-center justify-center gap-2 border-b border-plum/30 bg-plum/10 px-3 py-1 text-2xs uppercase tracking-[0.14em] text-plum">
            <EyeOff className="h-3 w-3" />
            Secrets hidden
            <button type="button" onClick={() => setHideSecrets(false)} className="underline-offset-2 hover:underline">
              show them
            </button>
          </div>
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1">
        <Suspense fallback={<Loading />}>
        {view.kind === 'overview' ? (
          <Overview doc={doc} />
        ) : view.kind === 'inbox' ? (
          <InboxView doc={doc} onCapture={openCapture} />
        ) : view.kind === 'sessions' ? (
          <SessionsView
            doc={doc}
            selectedId={view.sessionId}
            onSelect={(sessionId) => setView({ kind: 'sessions', sessionId })}
          />
        ) : view.kind === 'ledger' ? (
          <LedgerView
            doc={doc}
            counterpartyId={view.counterpartyId}
            onFilterCounterparty={(counterpartyId) => setView({ kind: 'ledger', counterpartyId })}
          />
        ) : view.kind === 'web' ? (
          <WebView doc={doc} activeTagIds={activeTagIds} onToggleTag={toggleTag} onClearTags={() => setActiveTagIds([])} />
        ) : view.kind === 'goals' ? (
          <GoalsView
            doc={doc}
            onNewGoal={() => setGoalDialog({ open: true, goal: null })}
            onEditGoal={(goal) => setGoalDialog({ open: true, goal })}
            onOpenLedger={() => openLedger()}
          />
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
            onEditSection={(type) => setSectionDialog({ open: true, type })}
            onEditFields={(type) => setFieldsTypeId(type.id)}
            onDeleteSection={(type) => setPendingSectionDelete(type)}
            onSearchEverywhere={(query) => setPaletteOpen(true, query)}
          />
        ) : (
          <Centered>
            <p className="text-sm text-faint">That section is gone. Pick another from the sidebar.</p>
          </Centered>
        )}
        </Suspense>
        </div>
      </main>

      <Suspense fallback={null}>
        {tagManagerOpen ? <TagManager open onOpenChange={setTagManagerOpen} doc={doc} /> : null}

        {palette.open ? (
          <CommandPalette
            open
            onOpenChange={setPaletteOpen}
            doc={doc}
            characters={characters}
            actions={paletteActions}
            initialQuery={palette.query}
          />
        ) : null}

        {fieldsTypeId !== null ? (
          <FieldsDialog open onOpenChange={(open) => !open && setFieldsTypeId(null)} doc={doc} typeId={fieldsTypeId} />
        ) : null}

        {exportMdOpen ? <ExportMarkdownDialog open onOpenChange={setExportMdOpen} doc={doc} /> : null}
        {importOpen ? <ImportCharacterDialog open onOpenChange={setImportOpen} onImported={onImported} /> : null}
        {aboutOpen ? <AboutDialog open onOpenChange={setAboutOpen} /> : null}
        {backupsOpen ? (
          <BackupsDialog
            open
            onOpenChange={setBackupsOpen}
            doc={doc}
            onRestoredAsNew={onImported}
            onReplaced={(restored) => {
              // The file on disk is now the restored version; make the store match it.
              setSelection({});
              setView({ kind: 'overview' });
              openDocument(restored);
            }}
          />
        ) : null}

        {goalDialog.open ? (
          <GoalDialog
            open
            onOpenChange={(open) => setGoalDialog((current) => ({ ...current, open }))}
            goal={goalDialog.goal}
            currency={doc.profile.currency}
            onSubmit={(values) => {
              const existing = goalDialog.goal;
              if (existing) {
                updateGoal(existing.id, (goal) => {
                  goal.title = values.title;
                  goal.kind = values.kind;
                  goal.target = values.target;
                  goal.notes = values.notes;
                  goal.secret = values.secret;
                  if (values.deadline) goal.deadline = values.deadline;
                  else delete goal.deadline;
                });
              } else {
                addGoal(values);
              }
            }}
          />
        ) : null}
      </Suspense>

      <QuickCapture open={captureOpen} onOpenChange={setCaptureOpen} onOpenInbox={() => setView({ kind: 'inbox' })} />

      <NewEntryDialog
        open={linkDraft !== null}
        onOpenChange={(open) => !open && setLinkDraft(null)}
        entryTypes={doc.entryTypes}
        initialTitle={linkDraft?.title}
        initialTypeId={linkDraftTypeId}
        onSubmit={({ title, typeId }) => {
          const type = doc.entryTypes.find((candidate) => candidate.id === typeId);
          if (type) showEntry(type.id, createEntry(type, title));
        }}
      />

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
    </LinkContext.Provider>
  );
}
