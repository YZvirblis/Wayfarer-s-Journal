/** "⌘" on a Mac, "Ctrl" elsewhere — for the shortcut hints shown in the UI. */
export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const MOD_LABEL = IS_MAC ? '⌘' : 'Ctrl';

/** True when the platform's command modifier (Ctrl, or ⌘ on a Mac) is held. */
export const hasModifier = (event: KeyboardEvent | { ctrlKey: boolean; metaKey: boolean }): boolean =>
  IS_MAC ? event.metaKey : event.ctrlKey;

/** Ctrl+K opens the palette; Ctrl+/ opens quick capture. Neither is bound by Chrome, Edge or Firefox. */
export const PALETTE_SHORTCUT = `${MOD_LABEL} K`;
export const CAPTURE_SHORTCUT = `${MOD_LABEL} /`;

export const isPaletteShortcut = (event: KeyboardEvent): boolean =>
  event.key.toLowerCase() === 'k' && hasModifier(event) && !event.altKey && !event.shiftKey;

/** Matched on the physical key too, so layouts where "/" needs Shift still work. */
export const isCaptureShortcut = (event: KeyboardEvent): boolean =>
  (event.key === '/' || event.code === 'Slash') && hasModifier(event) && !event.altKey;
