import { AlertTriangle } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import type { CharacterSummary } from '../shared/schema';
import { Workspace } from './components/Workspace';

// Only one of the two top-level screens is needed per launch.
const CharacterSelect = lazy(() =>
  import('./components/CharacterSelect').then((module) => ({ default: module.CharacterSelect })),
);
import { Button } from './components/ui/Button';
import { TooltipProvider } from './components/ui/Tooltip';
import { api, errorMessage } from './lib/api';
import { addCapture, closeDocument, flushSave, getDocument } from './lib/documentStore';
import { loadSettings, setLastCharacterId } from './lib/settingsStore';

type Boot = 'loading' | 'ready' | 'error';

export function App() {
  const [boot, setBoot] = useState<Boot>('loading');
  const [bootError, setBootError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setCharacters(await api.listCharacters());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [settings, list] = await Promise.all([loadSettings(), api.listCharacters()]);
        if (cancelled) return;
        setCharacters(list);
        if (settings.lastCharacterId && list.some((entry) => entry.id === settings.lastCharacterId)) {
          setActiveId(settings.lastCharacterId);
        }
        setBoot('ready');
      } catch (caught) {
        if (cancelled) return;
        setBootError(errorMessage(caught));
        setBoot('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The tab (and the desktop window) is named after the open character.
  useEffect(() => {
    const name = activeId ? characters.find((character) => character.id === activeId)?.name : undefined;
    document.title = name ? `${name} — Wayfarer's Journal` : "Wayfarer's Journal";
  }, [activeId, characters]);

  // Captures from the desktop hotkey window land in the open journal through the store,
  // so the autosave that follows carries them; with no journal open, the main process
  // writes to the last-opened character itself.
  useEffect(
    () =>
      window.wayfarerDesktop?.onCapture((text) => {
        if (!getDocument()) return false;
        return addCapture(text) !== null;
      }),
    [],
  );

  // Never let the browser close on top of an unsaved keystroke.
  useEffect(() => {
    const flush = () => void flushSave();
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const open = useCallback((id: string) => {
    setActiveId(id);
    setLastCharacterId(id);
  }, []);

  const switchTo = useCallback(
    async (id: string) => {
      if (id === activeId) return;
      await flushSave();
      closeDocument();
      open(id);
    },
    [activeId, open],
  );

  const imported = useCallback(
    async (id: string) => {
      await refresh().catch(() => undefined);
      await switchTo(id);
    },
    [refresh, switchTo],
  );

  const leave = useCallback(async () => {
    await flushSave();
    closeDocument();
    setActiveId(null);
    setLastCharacterId(null);
    await refresh().catch(() => undefined);
  }, [refresh]);

  if (boot === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="animate-ember font-display text-xs uppercase tracking-wordmark text-gold/60">
          Wayfarer&rsquo;s Journal
        </p>
      </div>
    );
  }

  if (boot === 'error') {
    return (
      <div className="flex h-full items-center justify-center px-8">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto mb-4 h-6 w-6 text-rose" />
          <h1 className="font-display text-lg tracking-title text-ink">The journal server is not answering</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{bootError}</p>
          <p className="mt-4 text-xs leading-relaxed text-faint">
            Make sure the window that started Wayfarer&rsquo;s Journal is still open, then try again.
          </p>
          <Button className="mt-6" variant="primary" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      {activeId ? (
        <Workspace
          key={activeId}
          characterId={activeId}
          characters={characters}
          onSwitchCharacter={(id) => void switchTo(id)}
          onManageCharacters={() => void leave()}
          onImported={(id) => void imported(id)}
        />
      ) : (
        <Suspense fallback={null}>
          <CharacterSelect characters={characters} onOpen={open} onChanged={refresh} />
        </Suspense>
      )}
    </TooltipProvider>
  );
}
