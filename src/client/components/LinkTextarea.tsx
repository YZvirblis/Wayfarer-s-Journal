import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { caretPosition } from '../lib/caret';
import { cn } from '../lib/cn';
import { useLinks } from '../lib/linkContext';
import { LinkAutocomplete, buildSuggestions, suggestionText, type LinkSuggestion } from './LinkAutocomplete';

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

interface LinkTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Called for keys the link autocomplete did not consume. */
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  minHeight?: number;
  autoFocus?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * A textarea that grows with its text and offers `[[link]]` autocomplete at the
 * caret. The markdown editor and quick capture both build on it.
 */
export const LinkTextarea = forwardRef<HTMLTextAreaElement, LinkTextareaProps>(function LinkTextarea(
  { value, onChange, placeholder, onKeyDown, onBlur, minHeight = 0, autoFocus, className, 'aria-label': ariaLabel },
  ref,
) {
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  useImperativeHandle(ref, () => textarea.current as HTMLTextAreaElement);
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

  // Grow with the text so the surrounding pane scrolls as one document.
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.max(minHeight, element.scrollHeight)}px`;
  }, [value, minHeight]);

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
    setOpenLink((current) => {
      if (!next) return null;
      if (current && current.start === next.start && current.query === next.query) return current;
      if (!current || current.start !== next.start) setActiveIndex(0);
      return next;
    });
    if (next) {
      const caret = caretPosition(element, element.selectionStart);
      const left = Math.max(0, Math.min(caret.left, element.clientWidth - POPUP_WIDTH));
      setAnchor({ top: caret.top + caret.height + 4, left });
    }
  }, []);

  const pick = useCallback(
    (suggestion: LinkSuggestion) => {
      const element = textarea.current;
      if (!element || !openLink) return;
      const text = suggestionText(suggestion);
      let after = value.slice(element.selectionStart);
      if (after.startsWith(']]')) after = after.slice(2);
      onChange(`${value.slice(0, openLink.start)}${text}${after}`);
      const caret = openLink.start + text.length;
      setOpenLink(null);
      requestAnimationFrame(() => {
        element.focus();
        element.setSelectionRange(caret, caret);
      });
    },
    [onChange, openLink, value],
  );

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (openLink) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        dismissed.current = openLink.start;
        setOpenLink(null);
        return;
      }
      if (suggestions.length > 0) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const delta = event.key === 'ArrowDown' ? 1 : -1;
          setActiveIndex((index) => (index + delta + suggestions.length) % suggestions.length);
          return;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          const chosen = suggestions[Math.min(activeIndex, suggestions.length - 1)];
          if (chosen) {
            event.preventDefault();
            pick(chosen);
            return;
          }
        }
      }
    }
    onKeyDown?.(event);
  }

  return (
    <div className="relative">
      <textarea
        ref={textarea}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          refreshLink();
        }}
        onSelect={refreshLink}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setOpenLink(null);
          onBlur?.();
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        spellCheck
        style={{ minHeight }}
        className={cn('block w-full overflow-hidden', className)}
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
  );
});
