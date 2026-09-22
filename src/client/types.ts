/** Which pane the workspace is showing. Phase 2 will add command-palette targets. */
export type View = { kind: 'overview' } | { kind: 'type'; typeId: string };

export type SortKey = 'updated' | 'title' | 'created';
