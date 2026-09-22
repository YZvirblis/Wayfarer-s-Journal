/** Which pane the workspace is showing. */
export type View =
  | { kind: 'overview' }
  | { kind: 'type'; typeId: string }
  | { kind: 'inbox' }
  | { kind: 'sessions'; sessionId: string | null };

export type SortKey = 'updated' | 'title' | 'created';
