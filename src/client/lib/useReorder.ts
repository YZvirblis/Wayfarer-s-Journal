import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Drag-to-reorder for a vertical list, driven from a grip element. While a
 * drag is in flight the list renders from a local draft order that follows
 * the pointer; the new order is committed once on release. The grip also
 * answers ↑/↓ for keyboard users. Pointer events, so it works with touch.
 */
export function useReorder(ids: string[], commit: (next: string[]) => void) {
  const [draft, setDraft] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLElement>());
  const latest = useRef<string[] | null>(null);
  const idsRef = useRef(ids);
  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);

  const register = useCallback(
    (id: string) => (element: HTMLElement | null) => {
      if (element) rows.current.set(id, element);
      else rows.current.delete(id);
    },
    [],
  );

  const orderFor = (id: string, clientY: number, base: string[]): string[] => {
    const others = base.filter((other) => other !== id);
    let index = others.length;
    for (let i = 0; i < others.length; i += 1) {
      const element = rows.current.get(others[i] ?? '');
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        index = i;
        break;
      }
    }
    const next = [...others];
    next.splice(index, 0, id);
    return next;
  };

  const onPointerDown = (id: string) => (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const start = [...idsRef.current];
    latest.current = start;
    setDraft(start);
    setDraggingId(id);

    const onMove = (move: PointerEvent) => {
      const next = orderFor(id, move.clientY, latest.current ?? idsRef.current);
      if (next.some((value, index) => value !== latest.current?.[index])) {
        latest.current = next;
        setDraft(next);
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      const next = latest.current;
      latest.current = null;
      setDraft(null);
      setDraggingId(null);
      if (next && next.some((value, index) => value !== idsRef.current[index])) commit(next);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    window.addEventListener('pointercancel', onUp, { once: true });
  };

  const onKeyDown = (id: string) => (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const base = idsRef.current;
    const from = base.indexOf(id);
    const to = from + (event.key === 'ArrowUp' ? -1 : 1);
    if (from === -1 || to < 0 || to >= base.length) return;
    const next = [...base];
    next.splice(from, 1);
    next.splice(to, 0, id);
    commit(next);
    requestAnimationFrame(() => rows.current.get(id)?.querySelector<HTMLElement>('[data-grip]')?.focus());
  };

  /** Spread onto the grip element. */
  const handleProps = (id: string) => ({
    'data-grip': true,
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': 'Drag to reorder, or press the arrow keys',
    onPointerDown: onPointerDown(id),
    onKeyDown: onKeyDown(id),
  });

  return { order: draft ?? ids, draggingId, register, handleProps };
}
