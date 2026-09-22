/** Which pane the workspace is showing. */
export type View = { kind: 'overview' } | { kind: 'type'; typeId: string } | { kind: 'inbox' };

export type SortKey = 'updated' | 'title' | 'created';
