import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Keeps a text field responsive while still autosaving. The field owns its value
 * locally and pushes it into the document store after a short pause (and on
 * unmount), so a keystroke never has to travel through a full document clone.
 *
 * Components using this should be keyed by the record they edit, so switching
 * records remounts the field with fresh initial text.
 */
export function useAutoCommit(initial: string, commit: (value: string) => void, delay = 220) {
  const [value, setValue] = useState(initial);
  const commitRef = useRef(commit);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current !== null) {
      const next = pending.current;
      pending.current = null;
      commitRef.current(next);
    }
  }, []);

  useEffect(() => flush, [flush]);

  const onChange = useCallback(
    (next: string) => {
      setValue(next);
      pending.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush],
  );

  return { value, onChange, flush };
}
