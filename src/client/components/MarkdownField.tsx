import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { useAutoCommit } from '../lib/useAutoCommit';
import { Markdown } from './Markdown';
import { SegmentedControl } from './ui/SegmentedControl';

type Mode = 'write' | 'read';

const MODES = [
  { value: 'read' as const, label: 'Read' },
  { value: 'write' as const, label: 'Write' },
];

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

  // Grow with the text so the whole pane scrolls as one document.
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element || mode !== 'write') return;
    element.style.height = 'auto';
    element.style.height = `${Math.max(minHeight, element.scrollHeight)}px`;
  }, [draft.value, minHeight, mode]);

  return (
    <section className={cn('group/md', className)}>
      <header className="mb-2 flex items-center justify-between gap-3">
        {label ? <span className="wj-label">{label}</span> : <span />}
        <SegmentedControl
          value={mode}
          options={MODES}
          onChange={(next) => {
            if (next === 'read') draft.flush();
            setMode(next);
          }}
          className="opacity-75 transition-opacity duration-150 focus-within:opacity-100 group-hover/md:opacity-100"
        />
      </header>

      {mode === 'write' ? (
        <textarea
          ref={textarea}
          value={draft.value}
          onChange={(event) => draft.onChange(event.target.value)}
          onBlur={draft.flush}
          placeholder={placeholder}
          spellCheck
          style={{ minHeight }}
          className="wj-field block w-full overflow-hidden font-serif text-[1.0625rem] leading-[1.7]"
        />
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
