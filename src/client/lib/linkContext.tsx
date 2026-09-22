import { createContext, useContext } from 'react';
import type { Entry, EntryType } from '../../shared/schema';

/**
 * What rendered `[[links]]` and the editor's autocomplete need from the
 * workspace: the entries to resolve against, and a way to navigate or to offer
 * creating something that does not exist yet. Provided once by Workspace so the
 * Markdown components stay free of routing props.
 */
export interface LinkContextValue {
  entries: Entry[];
  entryTypes: EntryType[];
  openEntry: (id: string) => void;
  /** Offer to create an entry for a link that resolves to nothing. */
  createFromLink: (title: string, typeName?: string) => void;
}

const noop = (): void => undefined;

export const LinkContext = createContext<LinkContextValue>({
  entries: [],
  entryTypes: [],
  openEntry: noop,
  createFromLink: noop,
});

export const useLinks = (): LinkContextValue => useContext(LinkContext);
