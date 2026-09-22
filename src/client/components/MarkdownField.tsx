import { useCallback, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { caretPosition } from '../lib/caret';
import { cn } from '../lib/cn';
import { useLinks } from '../lib/linkContext';
import { useAutoCommit } from '../lib/useAutoCommit';
import { LinkAutocomplete, buildSuggestions, suggestionText, type LinkSuggestion } from './LinkAutocomplete';
import { Markdown } from './Markdown';
import { SegmentedControl } from './ui/SegmentedControl';

type Mode = 'write' | 'read';

const MODES = [
  { value: 'read' as const, label: 'Read' },
  { value: 'write' as const, label: 'Write' },
];

const POPUP_WIDTH = 288; // matches w-72 on LinkAutocomplete

/** An unfinished `[[…` immediately before the caret, if there is one. */
interface OpenLink {
  /** Offset of the `[[`. */
  start: number;
  query: string;
}

function findOpenLink(value: string, caret: number): OpenLink | null {
  const before = value.slice(0, caret);
  const start = before.lastIndexOf('[[');
  if (start === -1) return null;
  const query = before.slice(start + 2);
  if (/[[\]\n]/.test(query)) return null;
  return { start, query };
}

interface MarkdownFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Shown to the left of the Read/Write toggle. */
  label?: string;
  minHeight?: number;
  /** Start in write mode — used for brand-new, still-empty records. */
  initialMode?: Mode;
  className?: string;
}

export function MarkdownField({
  value,
  onChange,
  placeholder,
  label,
  minHeight = 160,
  initialMode,
  className,
}: MarkdownFieldProps) {
  const [mode, setMode] = useState<Mode>(initialMode ?? (value.trim() ? 'read' : 'write'));
  const draft = useAutoCommit(value, onChange);
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  const { entries, entryTypes } = useLinks();

  const [openLink, setOpenLink] = useState<OpenLink | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });
  // Escape closes the popup for this particular `[[` until the user starts another.
  const dismissed = useRef<number | null>(null);

  const suggestions = useMemo(
    () => (openLink ? buildSuggestions(openLink.query, entries, entryTypes) : []),
    [openLink, entries, entryTypes],
  );

  // Grow with the text so the whole pane scrolls as one document.
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element || mode !== 'write') return;
    element.style.height = 'auto';
    element.style.height = `${Math.max(minHeight, element.scrollHeight)}px`;
  }, [draft.value, minHeight, mode]);

  const refreshLink = useCallback(() => {
    const element = textarea.current;
    if (!element || element.selectionStart !== element.selectionEnd) {
      setOpenLink(null);
      return;
    }
    const next = findOpenLink(element.value, element.selectionStart);
    if (next && dismissed.current === next.start) {
      setOpenLink(null);
      return;
    }
    if (next && dismissed.current !== null) dismissed.current = null;
    setOpenLink((current) =>
      current && next && current.start === next.start && current.query === next.query ? current : next,
    );
    if (next) {
      const caret = caretPosition(element, element.selectionStart);
      const left = Math.max(0, Math.min(caret.left, element.clientWidth - POPUP_WIDTH));
      setAnchor({ top: caret.top + caret.height + 4, left });
      if (!openLink || openLink.start !== next.start) setActiveIndex(0);
    }
  }, [openLink]);

  const pick = useCallback(
    (suggestion: LinkSuggestion) => {
      const element = textarea.current;
      if (!element || !openLink) return;
      const text = suggestionText(suggestion);
      let after = draft.value.slice(element.selectionStart);
      if (after.startsWith(']]')) after = after.slice(2);
      draft.onChange(`${draft.value.slice(0, openLink.start)}${text}${after}`);
      const caret = openLink.start + text.length;
      setOpenLink(null);
      requestAnimationFrame(() => {
        element.focus();
        element.setSelectionRange(caret, caret);
      });
    },
    [draft, openLink],
  );

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!openLink) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      dismissed.current = openLink.start;
      setOpenLink(null);
      return;
    }
    if (suggestions.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (index + delta + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      const chosen = suggestions[Math.min(activeIndex, suggestions.length - 1)];
      if (chosen) {
        event.preventDefault();
        pick(chosen);
      }
    }
  }

  return (
    <section className={cn('group/md', className)}>
      <header className="mb-2 flex items-center justify-between gap-3">
        {label ? <span className="wj-label">{label}</span> : <span />}
        <SegmentedControl
          value={mode}
          options={MODES}
          onChange={(next) => {
            if (next === 'read') draft.flush();
            setOpenLink(null);
            setMode(next);
          }}
          className="opacity-75 transition-opacity duration-150 focus-within:opacity-100 group-hover/md:opacity-100"
        />
      </header>

      {mode === 'write' ? (
        <div className="relative">
          <textarea
            ref={textarea}
            value={draft.value}
            onChange={(event) => {
              draft.onChange(event.target.value);
              refreshLink();
            }}
            onSelect={refreshLink}
            onKeyDown={onKeyDown}
            onBlur={() => {
              draft.flush();
              setOpenLink(null);
            }}
            placeholder={placeholder}
            spellCheck
            style={{ minHeight }}
            className="wj-field block w-full overflow-hidden font-serif text-[1.0625rem] leading-[1.7]"
          />
          {openLink && suggestions.length > 0 ? (
            <LinkAutocomplete
              suggestions={suggestions}
              activeIndex={Math.min(activeIndex, suggestions.length - 1)}
              onHover={setActiveIndex}
              onPick={pick}
              style={anchor}
            />
          ) : null}
        </div>
      ) : draft.value.trim() ? (
        <Markdown>{draft.value}</Markdown>
      ) : (
        <button
          type="button"
          onClick={() => setMode('write')}
          className="w-full rounded border border-dashed border-line/20 px-4 py-6 text-left font-serif text-[1.0625rem] text-faint transition-colors hover:border-gold/35 hover:text-muted"
        >
          {placeholder}
        </button>
      )}
    </section>
  );
}
