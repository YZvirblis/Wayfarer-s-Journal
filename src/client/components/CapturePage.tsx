import { Check, Feather } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CharacterDocument } from '../../shared/schema';
import { api } from '../lib/api';
import { LinkContext, type LinkContextValue } from '../lib/linkContext';
import { LinkTextarea } from './LinkTextarea';

const noop = (): void => undefined;

/**
 * The page inside the global-hotkey window (`/capture`): one box, Enter keeps,
 * Escape closes. The desktop bridge hands the text to the main window, which
 * adds it to the open journal; without the bridge it posts to the server.
 */
export function CapturePage() {
  const [text, setText] = useState('');
  const [doc, setDoc] = useState<CharacterDocument | null>(null);
  const [state, setState] = useState<'idle' | 'saving' | 'kept' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const desktop = window.wayfarerDesktop;

  // The last-opened character, for the name in the corner and for [[link]] autocomplete.
  useEffect(() => {
    document.title = 'Quick capture';
    let cancelled = false;
    (async () => {
      try {
        const settings = await api.getSettings();
        if (!settings.lastCharacterId) return;
        const loaded = await api.getCharacter(settings.lastCharacterId);
        if (!cancelled) setDoc(loaded);
      } catch {
        // No journal yet; the box still works and the server will say so.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const links = useMemo<LinkContextValue>(
    () => ({
      entries: doc?.entries ?? [],
      entryTypes: doc?.entryTypes ?? [],
      openEntry: noop,
      openSource: noop,
      openLedger: noop,
      openGoals: noop,
      openOverview: noop,
      createFromLink: noop,
    }),
    [doc],
  );

  function close() {
    if (desktop) desktop.closeCapture();
    else setText('');
  }

  async function keep() {
    const body = text.trim();
    if (!body || state === 'saving') return;
    setState('saving');
    setError(null);
    try {
      if (desktop) {
        const result = await desktop.submitCapture(body);
        if (!result.ok) throw new Error(result.reason ?? 'Could not save the capture.');
      } else {
        await api.addCapture(body);
      }
      setState('kept');
      setText('');
      window.setTimeout(close, 450);
    } catch (caught) {
      setState('error');
      setError(caught instanceof Error ? caught.message : 'Could not save the capture.');
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <LinkContext.Provider value={links}>
      <div className="flex h-full flex-col border border-gold/30 bg-panel shadow-glow">
        <div className="flex items-center gap-2 px-4 pt-3">
          <Feather className="h-3.5 w-3.5 text-gold/80" strokeWidth={1.75} />
          <span className="wj-eyebrow">Quick capture</span>
          <span className="ml-auto truncate text-2xs text-faint">
            {state === 'kept' ? (
              <span className="inline-flex items-center gap-1 text-sage">
                <Check className="h-3 w-3" /> Kept
              </span>
            ) : doc ? (
              `→ ${doc.profile.name}'s inbox`
            ) : (
              'No journal open yet'
            )}
          </span>
        </div>
        <div className="px-4 pb-2 pt-2">
          <LinkTextarea
            autoFocus
            value={text}
            onChange={(value) => {
              setText(value);
              if (state !== 'idle') setState('idle');
            }}
            placeholder="What just happened? A name, a price, a promise… [[links]] work here."
            aria-label="Capture"
            minHeight={88}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void keep();
              }
            }}
            className="wj-field font-serif text-[1.0625rem] leading-[1.6]"
          />
        </div>
        <div className="mt-auto flex items-center gap-3 border-t px-4 py-2 text-2xs text-faint">
          <span>↵ keep</span>
          <span>⇧↵ new line</span>
          <span>Esc close</span>
          {error ? <span className="ml-auto truncate text-rose">{error}</span> : null}
        </div>
      </div>
    </LinkContext.Provider>
  );
}
