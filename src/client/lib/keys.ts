/** "⌘" on a Mac, "Ctrl" elsewhere — for the shortcut hints shown in the UI. */
export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const MOD_LABEL = IS_MAC ? '⌘' : 'Ctrl';

/** True when the platform's command modifier (Ctrl, or ⌘ on a Mac) is held. */
export const hasModifier = (event: KeyboardEvent | { ctrlKey: boolean; metaKey: boolean }): boolean =>
  IS_MAC ? event.metaKey : event.ctrlKey;
