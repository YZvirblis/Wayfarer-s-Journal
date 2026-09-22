import type { PaletteColor } from '../../shared/schema';

interface ColorClasses {
  /** Foreground-only, for icons and small labels. */
  text: string;
  /** Solid swatch, for tag dots and progress fills. */
  dot: string;
  /** Tinted pill used by tag chips and status badges. */
  chip: string;
  /** Soft wash behind an active navigation row. */
  wash: string;
}

/**
 * Tailwind cannot build classes from runtime values, so every palette entry is
 * written out as literals. Tags and entry types store the key, which means their
 * colours follow the active theme instead of being baked-in hex.
 */
export const COLOR_CLASSES: Record<PaletteColor, ColorClasses> = {
  gold: {
    text: 'text-gold',
    dot: 'bg-gold',
    chip: 'bg-gold/10 text-gold border-gold/25',
    wash: 'bg-gold/[0.07]',
  },
  ember: {
    text: 'text-ember',
    dot: 'bg-ember',
    chip: 'bg-ember/10 text-ember border-ember/25',
    wash: 'bg-ember/[0.07]',
  },
  copper: {
    text: 'text-copper',
    dot: 'bg-copper',
    chip: 'bg-copper/10 text-copper border-copper/25',
    wash: 'bg-copper/[0.07]',
  },
  sage: {
    text: 'text-sage',
    dot: 'bg-sage',
    chip: 'bg-sage/10 text-sage border-sage/25',
    wash: 'bg-sage/[0.07]',
  },
  frost: {
    text: 'text-frost',
    dot: 'bg-frost',
    chip: 'bg-frost/10 text-frost border-frost/25',
    wash: 'bg-frost/[0.07]',
  },
  plum: {
    text: 'text-plum',
    dot: 'bg-plum',
    chip: 'bg-plum/10 text-plum border-plum/25',
    wash: 'bg-plum/[0.07]',
  },
  rose: {
    text: 'text-rose',
    dot: 'bg-rose',
    chip: 'bg-rose/10 text-rose border-rose/25',
    wash: 'bg-rose/[0.07]',
  },
};

export const colorClasses = (color: PaletteColor): ColorClasses => COLOR_CLASSES[color] ?? COLOR_CLASSES.gold;
