import { useCallback, useSyncExternalStore } from 'react';

/**
 * Players run the journal beside the game, often at 600–1000px wide. Three
 * layouts cover that: the full sidebar plus two panes when wide; an icon rail
 * plus two panes in between; and a rail plus a single list-or-detail pane when
 * narrow. The same thresholds are registered as Tailwind screens `wide` and
 * `pane` in tailwind.config.js so CSS and JS never disagree.
 */
export const WIDE_QUERY = '(min-width: 1200px)';
export const PANE_QUERY = '(min-width: 960px)';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => true,
  );
}
