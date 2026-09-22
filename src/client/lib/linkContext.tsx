import { createContext, useContext } from 'react';
import type { Entry, EntryType } from '../../shared/schema';
import type { LinkSource } from './links';

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
  /** Jump to wherever a backlink came from: an entry, the Overview, the Inbox, a session. */
  openSource: (source: LinkSource) => void;
  /** The ledger, optionally filtered to one person's dealings. */
  openLedger: (counterpartyId?: string) => void;
  openGoals: () => void;
  /** Offer to create an entry for a link that resolves to nothing. */
  createFromLink: (title: string, typeName?: string) => void;
}

const noop = (): void => undefined;

export const LinkContext = createContext<LinkContextValue>({
  entries: [],
  entryTypes: [],
  openEntry: noop,
  openSource: noop,
  openLedger: noop,
  openGoals: noop,
  createFromLink: noop,
});

export const useLinks = (): LinkContextValue => useContext(LinkContext);
