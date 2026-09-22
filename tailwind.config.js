/**
 * All colour tokens are CSS variables holding space-separated RGB channels, so
 * Tailwind's `/opacity` modifiers keep working and themes can be swapped at
 * runtime by flipping `data-theme` on <html>. See src/client/styles/theme.css.
 */
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/client/index.html', './src/client/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      // Layout modes (see src/client/lib/layout.ts): below `pane` the list and
      // detail share one pane; below `wide` the sidebar collapses to an icon rail.
      screens: {
        pane: '960px',
        wide: '1200px',
      },
      colors: {
        // The page background. Not named `base`: that would collide with the
        // `text-base` font-size utility and paint text in the background colour.
        ground: token('--wj-bg'),
        panel: token('--wj-panel'),
        surface: token('--wj-surface'),
        raised: token('--wj-raised'),
        line: token('--wj-line'),
        ink: token('--wj-ink'),
        muted: token('--wj-muted'),
        faint: token('--wj-faint'),
        gold: token('--wj-gold'),
        'gold-deep': token('--wj-gold-deep'),
        ember: token('--wj-ember'),
        frost: token('--wj-frost'),
        sage: token('--wj-sage'),
        plum: token('--wj-plum'),
        rose: token('--wj-rose'),
        copper: token('--wj-copper'),
      },
      fontFamily: {
        display: ['"Cinzel Variable"', 'Cinzel', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"EB Garamond Variable"', '"EB Garamond"', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        title: '0.06em',
        wordmark: '0.22em',
      },
      borderRadius: {
        DEFAULT: '3px',
        card: '5px',
      },
      boxShadow: {
        // A hairline of warm light along the top edge — the "polished leather" cue.
        rim: 'inset 0 1px 0 rgb(var(--wj-ink) / 0.06)',
        card: '0 1px 2px rgb(0 0 0 / 0.30), 0 8px 24px -12px rgb(0 0 0 / 0.45), inset 0 1px 0 rgb(var(--wj-ink) / 0.05)',
        lifted:
          '0 2px 4px rgb(0 0 0 / 0.35), 0 18px 48px -18px rgb(0 0 0 / 0.60), inset 0 1px 0 rgb(var(--wj-ink) / 0.07)',
        glow: '0 0 0 1px rgb(var(--wj-gold) / 0.35), 0 0 28px -6px rgb(var(--wj-gold) / 0.28)',
      },
      transitionTimingFunction: {
        ledger: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        // Dialogs are centred by a flex wrapper, never by a transform, so an
        // animation with fill-mode `both` cannot knock them off centre.
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        ember: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'rise-in': 'rise-in 260ms cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'scale-in': 'scale-in 140ms cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'modal-in': 'modal-in 200ms cubic-bezier(0.22, 0.61, 0.36, 1) both',
        ember: 'ember 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};