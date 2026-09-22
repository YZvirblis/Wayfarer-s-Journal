import type { KeyboardEvent } from 'react';

/**
 * Shared arrow-key handling for the entry and session lists. Rows are buttons
 * carrying `data-row-id`; ↑/↓ select the neighbour and move focus to it, Home
 * and End jump to the ends, Enter "opens" the row (the detail pane takes focus).
 * Returns true when the key was consumed.
 */
export function handleListKey(
  event: KeyboardEvent<HTMLElement>,
  ids: string[],
  currentId: string | null,
  select: (id: string) => void,
  open: (id: string) => void,
): boolean {
  if (ids.length === 0) return false;
  const index = currentId ? ids.indexOf(currentId) : -1;
  let next: number | null = null;
  if (event.key === 'ArrowDown') next = Math.min(ids.length - 1, index + 1);
  else if (event.key === 'ArrowUp') next = Math.max(0, index <= 0 ? 0 : index - 1);
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = ids.length - 1;
  else if (event.key === 'Enter' && currentId && ids.includes(currentId)) {
    event.preventDefault();
    open(currentId);
    return true;
  } else {
    return false;
  }
  event.preventDefault();
  const id = ids[next];
  if (id === undefined) return true;
  select(id);
  focusRow(event.currentTarget, id);
  return true;
}

/** Focus a row button after React has rendered the new selection. */
export function focusRow(container: HTMLElement, id: string): void {
  requestAnimationFrame(() => {
    const root = container.closest('[data-list-root]') ?? container;
    root.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(id)}"]`)?.focus();
  });
}
