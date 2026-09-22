import { AlertTriangle, BookOpen, Copy, MoreHorizontal, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { ImportCharacterDialog } from './ImportCharacterDialog';
import type { CharacterSummary } from '../../shared/schema';
import { api, errorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { pluralize, relativeTime } from '../lib/format';
import { Sigil } from './Sigil';
import { ThemeToggle } from './ThemeToggle';
import { Button, IconButton } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Divider } from './ui/Divider';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from './ui/Menu';
import { Modal } from './ui/Modal';

interface CharacterSelectProps {
  characters: CharacterSummary[];
  onOpen: (id: string) => void;
  onChanged: () => Promise<void>;
}

function CharacterCard({
  character,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  character: CharacterSummary;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const subtitle = [character.race, character.trade].filter(Boolean).join(' · ');
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'wj-card flex w-full items-start gap-4 p-5 text-left transition-all duration-200 ease-ledger',
          'hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-lifted',
        )}
      >
        <Sigil name={character.name} portrait={character.portrait} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-lg leading-snug tracking-title text-ink">
            {character.name}
          </span>
          <span className="mt-0.5 block truncate font-serif text-sm text-muted">{subtitle || 'No details yet'}</span>
          <span className="mt-3 flex items-center gap-2 text-2xs text-faint">
            <span>{pluralize(character.entryCount, 'entry', 'entries')}</span>
            <span className="text-[0.5rem] opacity-50">◆</span>
            <span>written {relativeTime(character.updatedAt)}</span>
          </span>
        </span>
      </button>

      <div className="absolute right-3 top-3 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <Menu>
          <MenuTrigger asChild>
            <IconButton variant="ghost" size="sm" aria-label={`Options for ${character.name}`}>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </IconButton>
          </MenuTrigger>
          <MenuContent>
            <MenuItem onSelect={onDuplicate}>
              <Copy className="h-3.5 w-3.5 opacity-70" />
              Duplicate
            </MenuItem>
            <MenuSeparator />
            <MenuItem danger onSelect={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </div>
  );
}

export function CharacterSelect({ characters, onOpen, onChanged }: CharacterSelectProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<CharacterSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function run(action: () => Promise<string | void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const id = await action();
      await onChanged();
      if (typeof id === 'string') onOpen(id);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const empty = characters.length === 0;

  return (
    <div className="wj-scroll h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-8 py-14">
        {/* my-auto keeps a short list optically centred without pinning a long one. */}
        <div className="my-auto w-full">
          <header className="animate-rise-in text-center">
            <p className="wj-eyebrow">A ledger for the long road</p>
            <h1 className="mt-3 font-display text-[2.6rem] leading-none tracking-title text-ink">
              Wayfarer&rsquo;s Journal
            </h1>
            <p className="mx-auto mt-4 max-w-md font-serif text-[1.05rem] leading-relaxed text-muted">
              Everything your character knows — the people, the promises, the debts — kept on your own machine.
            </p>
            <Divider className="mx-auto mt-8 max-w-sm" />
          </header>

          {error ? (
            <div className="mx-auto mt-8 flex max-w-lg items-start gap-2.5 rounded-card border border-rose/30 bg-rose/[0.07] px-4 py-3 text-sm text-rose">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {empty ? (
            <div className="flex animate-fade-in flex-col items-center py-16 text-center">
              <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
                <span className="absolute inset-0 rotate-45 rounded-[8px] border border-gold/20 bg-gold/[0.04]" />
                <BookOpen className="relative h-6 w-6 text-gold/70" strokeWidth={1.4} />
              </div>
              <h2 className="font-display text-xl tracking-title text-ink">No journals yet</h2>
              <p className="mx-auto mt-3 max-w-sm font-serif text-[1.02rem] leading-relaxed text-muted">
                Start one for your character, or open the example journal to see what a well-kept one looks like.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button variant="primary" size="lg" onClick={() => setCreating(true)} disabled={busy}>
                  <Plus className="h-4 w-4" />
                  New character
                </Button>
                <Button size="lg" onClick={() => void run(async () => (await api.importExample()).id)} disabled={busy}>
                  <Sparkles className="h-4 w-4" />
                  Open the example
                </Button>
                <Button size="lg" variant="ghost" onClick={() => setImporting(true)} disabled={busy}>
                  <Upload className="h-4 w-4" />
                  Import a file
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-10 grid animate-rise-in gap-4 sm:grid-cols-2">
                {characters.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    onOpen={() => onOpen(character.id)}
                    onDuplicate={() => void run(async () => void (await api.duplicateCharacter(character.id)))}
                    onDelete={() => setPendingDelete(character)}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  disabled={busy}
                  className="flex min-h-[7.5rem] items-center justify-center gap-2.5 rounded-card border border-dashed border-line/20 text-sm text-faint transition-colors duration-200 hover:border-gold/35 hover:bg-gold/[0.03] hover:text-gold"
                >
                  <Plus className="h-4 w-4" />
                  New character
                </button>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-2xs text-faint">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(async () => (await api.importExample()).id)}
                  className="inline-flex items-center gap-1.5 underline-offset-2 transition-colors hover:text-gold hover:underline"
                >
                  <Sparkles className="h-3 w-3" />
                  Add the example character
                </button>
                <span className="text-[0.5rem] opacity-50">◆</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setImporting(true)}
                  className="inline-flex items-center gap-1.5 underline-offset-2 transition-colors hover:text-gold hover:underline"
                >
                  <Upload className="h-3 w-3" />
                  Import a character file
                </button>
                <span className="text-[0.5rem] opacity-50">◆</span>
                <span>Everything is stored in the app&rsquo;s own data folder. Nothing leaves this machine.</span>
              </div>
            </>
          )}
        </div>

        <footer className="flex items-center justify-center pt-14">
          <ThemeToggle labelled />
        </footer>
      </div>

      <Modal
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) setNewName('');
        }}
        title="Name your character"
        description="You can change this at any time on the Overview page."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!newName.trim() || busy}
              onClick={() => {
                const name = newName.trim();
                setCreating(false);
                setNewName('');
                void run(async () => (await api.createCharacter(name)).id);
              }}
            >
              Begin the journal
            </Button>
          </>
        }
      >
        <input
          autoFocus
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && newName.trim()) {
              const name = newName.trim();
              setCreating(false);
              setNewName('');
              void run(async () => (await api.createCharacter(name)).id);
            }
          }}
          placeholder="Sivrid Coal-Hand"
          className="wj-field h-10 font-display text-base tracking-title"
        />
      </Modal>

      <ImportCharacterDialog
        open={importing}
        onOpenChange={setImporting}
        onImported={(id) => void run(async () => id)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete ${pendingDelete?.name ?? ''}?`}
        confirmLabel="Delete character"
        onConfirm={() => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (target) void run(async () => void (await api.deleteCharacter(target.id)));
        }}
      >
        <p className="text-sm leading-relaxed text-muted">
          The journal is removed from the app. A copy stays in your <code className="text-copper">data/backups</code>{' '}
          folder, so this is recoverable by hand.
        </p>
      </ConfirmDialog>
    </div>
  );
}
