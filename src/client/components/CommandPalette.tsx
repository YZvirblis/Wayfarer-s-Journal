import * as Dialog from '@radix-ui/react-dialog';
import {
  CalendarDays,
  CirclePlus,
  Coins,
  Eye,
  EyeOff,
  Feather,
  Inbox,
  Moon,
  Search,
  Sun,
  Tag as TagIcon,
  Target,
  UserRound,
  Users,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CharacterDocument, CharacterSummary, EntryType } from '../../shared/schema';
import { cn } from '../lib/cn';
import { formatCalendarShort } from '../lib/format';
import { fuzzyScore } from '../lib/fuzzy';
import { iconByName } from '../lib/icons';
import { CAPTURE_SHORTCUT } from '../lib/keys';
import { colorClasses } from '../lib/palette';
import { useSettings } from '../lib/settingsStore';
import { singularize } from '../lib/words';
import { Sigil } from './Sigil';

export interface PaletteActions {
  openEntry: (typeId: string, id: string) => void;
  openType: (typeId: string) => void;
  openOverview: (sectionId?: string) => void;
  openInbox: () => void;
  openSessions: (sessionId?: string) => void;
  newSession: () => void;
  openLedger: () => void;
  openGoals: () => void;
  newGoal: () => void;
  openWeb: () => void;
  quickCapture: () => void;
  toggleTag: (tagId: string) => void;
  createEntry: (type: EntryType, title: string) => void;
  switchCharacter: (id: string) => void;
  manageCharacters: () => void;
  toggleTheme: () => void;
  toggleSecrets: () => void;
}

type Group = 'Entries' | 'Sessions' | 'Go to' | 'Overview' | 'Tags' | 'Create' | 'Characters' | 'Journal';

interface Command {
  id: string;
  group: Group;
  label: string;
  /** Extra words the fuzzy matcher may hit, e.g. an entry's role field. */
  keywords?: string;
  hint?: string;
  icon: LucideIcon;
  iconClass?: string;
  sigil?: string;
  portrait?: string;
  run: () => void;
}

const GROUP_ORDER: Group[] = ['Entries', 'Sessions', 'Go to', 'Overview', 'Tags', 'Create', 'Characters', 'Journal'];
const MAX_ENTRIES = 12;

function buildCommands(
  doc: CharacterDocument,
  characters: CharacterSummary[],
  query: string,
  settings: { theme: string; hideSecrets: boolean },
  actions: PaletteActions,
): Command[] {
  const { theme, hideSecrets } = settings;
  const typesById = new Map(doc.entryTypes.map((type) => [type.id, type] as const));
  const commands: Command[] = [];

  for (const entry of doc.entries) {
    const type = typesById.get(entry.typeId);
    if (!type || (hideSecrets && entry.secret)) continue;
    commands.push({
      id: `entry:${entry.id}`,
      group: 'Entries',
      label: entry.title || 'Untitled',
      keywords: Object.values(entry.fields).join(' '),
      hint: singularize(type.name),
      icon: iconByName(type.icon),
      iconClass: colorClasses(type.color).text,
      ...(entry.portrait ? { sigil: entry.title, portrait: entry.portrait } : {}),
      run: () => actions.openEntry(type.id, entry.id),
    });
  }

  for (const session of doc.sessions) {
    if (hideSecrets && session.secret) continue;
    commands.push({
      id: `session:${session.id}`,
      group: 'Sessions',
      label: session.title || 'Untitled session',
      keywords: `${session.date} ${session.body.slice(0, 200)}`,
      hint: formatCalendarShort(session.date),
      icon: CalendarDays,
      iconClass: 'text-gold',
      run: () => actions.openSessions(session.id),
    });
  }

  commands.push({
    id: 'go:overview',
    group: 'Go to',
    label: 'Overview',
    icon: UserRound,
    iconClass: 'text-gold',
    run: () => actions.openOverview(),
  });
  commands.push({
    id: 'go:sessions',
    group: 'Go to',
    label: 'Sessions',
    keywords: 'session log timeline play',
    icon: CalendarDays,
    iconClass: 'text-gold',
    run: () => actions.openSessions(),
  });
  commands.push({
    id: 'go:ledger',
    group: 'Go to',
    label: 'Ledger',
    keywords: 'septims coin money gold income expenses balance',
    icon: Coins,
    iconClass: 'text-gold',
    run: actions.openLedger,
  });
  commands.push({
    id: 'go:goals',
    group: 'Go to',
    label: 'Goals',
    keywords: 'savings debt target',
    icon: Target,
    iconClass: 'text-gold',
    run: actions.openGoals,
  });
  commands.push({
    id: 'go:web',
    group: 'Go to',
    label: 'Relationship web',
    keywords: 'graph map network connections people factions places',
    icon: Waypoints,
    iconClass: 'text-gold',
    run: actions.openWeb,
  });
  commands.push({
    id: 'go:inbox',
    group: 'Go to',
    label: 'Inbox',
    keywords: 'captures unsorted',
    hint: doc.captures.length ? `${doc.captures.length} waiting` : undefined,
    icon: Inbox,
    iconClass: 'text-gold',
    run: actions.openInbox,
  });
  for (const type of doc.entryTypes) {
    commands.push({
      id: `go:${type.id}`,
      group: 'Go to',
      label: type.name,
      icon: iconByName(type.icon),
      iconClass: colorClasses(type.color).text,
      run: () => actions.openType(type.id),
    });
  }

  for (const section of doc.profile.sections) {
    if (hideSecrets && section.secret) continue;
    commands.push({
      id: `section:${section.id}`,
      group: 'Overview',
      label: section.title || 'Untitled section',
      hint: 'Profile section',
      icon: UserRound,
      iconClass: 'text-gold',
      run: () => actions.openOverview(section.id),
    });
  }

  for (const tag of doc.tags) {
    commands.push({
      id: `tag:${tag.id}`,
      group: 'Tags',
      label: tag.name,
      keywords: tag.group,
      hint: 'Filter by tag',
      icon: TagIcon,
      iconClass: colorClasses(tag.color).text,
      run: () => actions.toggleTag(tag.id),
    });
  }

  const title = query.trim();
  commands.push({
    id: 'create:capture',
    group: 'Create',
    label: 'Quick capture',
    keywords: 'jot note inbox',
    hint: CAPTURE_SHORTCUT,
    icon: Feather,
    iconClass: 'text-gold',
    run: actions.quickCapture,
  });
  commands.push({
    id: 'create:session',
    group: 'Create',
    label: 'New session',
    keywords: 'start log tonight play',
    hint: 'Dated today',
    icon: CalendarDays,
    iconClass: 'text-gold',
    run: actions.newSession,
  });
  commands.push({
    id: 'create:goal',
    group: 'Create',
    label: 'New goal',
    keywords: 'save debt target septims',
    icon: Target,
    iconClass: 'text-gold',
    run: actions.newGoal,
  });
  for (const type of doc.entryTypes) {
    const singular = singularize(type.name).toLowerCase();
    commands.push({
      id: `create:${type.id}`,
      group: 'Create',
      label: title ? `Create “${title}” as ${singular}` : `New ${singular}`,
      keywords: `new create add ${type.name}`,
      icon: CirclePlus,
      iconClass: colorClasses(type.color).text,
      run: () => actions.createEntry(type, title),
    });
  }

  for (const character of characters) {
    if (character.id === doc.id) continue;
    commands.push({
      id: `character:${character.id}`,
      group: 'Characters',
      label: character.name,
      keywords: `switch character ${character.race} ${character.trade}`,
      hint: 'Switch to',
      icon: Users,
      sigil: character.name,
      ...(character.portrait ? { portrait: character.portrait } : {}),
      run: () => actions.switchCharacter(character.id),
    });
  }
  commands.push({
    id: 'characters:all',
    group: 'Characters',
    label: 'All characters…',
    keywords: 'switch manage characters',
    icon: Users,
    run: actions.manageCharacters,
  });

  commands.push({
    id: 'journal:secrets',
    group: 'Journal',
    label: hideSecrets ? 'Show secrets' : 'Hide secrets',
    keywords: 'blur screenshot stream privacy reveal',
    hint: hideSecrets ? 'Currently hidden' : 'For screenshots',
    icon: hideSecrets ? Eye : EyeOff,
    iconClass: hideSecrets ? 'text-plum' : undefined,
    run: actions.toggleSecrets,
  });
  commands.push({
    id: 'journal:theme',
    group: 'Journal',
    label: theme === 'dark' ? 'Switch to Parchment theme' : 'Switch to Dark theme',
    keywords: 'theme light dark parchment appearance',
    icon: theme === 'dark' ? Sun : Moon,
    run: actions.toggleTheme,
  });

  return commands;
}

function rank(commands: Command[], query: string): Command[] {
  const needle = query.trim();
  if (!needle) {
    // Nothing typed: a browsable menu, without the full entry and session lists.
    return commands.filter(
      (command) => command.group !== 'Entries' && command.group !== 'Sessions' && command.group !== 'Overview',
    );
  }
  const scored = commands.flatMap((command) => {
    if (command.id.startsWith('create:') && !['create:capture', 'create:session', 'create:goal'].includes(command.id)) {
      return [{ command, score: -1 }]; // "Create as…" is always offered, always last
    }
    const score = fuzzyScore(needle, command.keywords ? `${command.label} ${command.keywords}` : command.label);
    return score === null ? [] : [{ command, score }];
  });
  scored.sort(
    (a, b) => GROUP_ORDER.indexOf(a.command.group) - GROUP_ORDER.indexOf(b.command.group) || b.score - a.score,
  );
  let entries = 0;
  return scored
    .filter(({ command }) => (command.group === 'Entries' ? entries++ < MAX_ENTRIES : true))
    .map(({ command }) => command);
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: CharacterDocument;
  characters: CharacterSummary[];
  actions: PaletteActions;
  /** Text to start with, e.g. a list search handed over to search every section. */
  initialQuery?: string;
}

export function CommandPalette({ open, onOpenChange, doc, characters, actions, initialQuery = '' }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const list = useRef<HTMLDivElement | null>(null);
  const { theme, hideSecrets } = useSettings();

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setActiveIndex(0);
    }
  }, [open, initialQuery]);

  const results = useMemo(
    () => rank(buildCommands(doc, characters, query, { theme, hideSecrets }, actions), query),
    [doc, characters, query, theme, hideSecrets, actions],
  );
  const active = Math.min(activeIndex, Math.max(0, results.length - 1));

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function run(command: Command) {
    onOpenChange(false);
    command.run();
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-black/55 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="fixed left-1/2 top-[12vh] z-50 w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 animate-scale-in overflow-hidden rounded-card border bg-panel shadow-lifted"
        >
          <Dialog.Title className="sr-only">Jump to anything</Dialog.Title>
          <div className="flex items-center gap-3 border-b px-4">
            <Search className="h-4 w-4 shrink-0 text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  if (results.length === 0) return;
                  const delta = event.key === 'ArrowDown' ? 1 : -1;
                  setActiveIndex((active + delta + results.length) % results.length);
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  const chosen = results[active];
                  if (chosen) run(chosen);
                }
              }}
              placeholder="Jump to an entry, a section, a tag… or type a name to create one"
              aria-label="Jump to anything"
              className="h-12 w-full bg-transparent font-sans text-[0.95rem] text-ink outline-none placeholder:text-faint"
            />
            <kbd className="hidden shrink-0 rounded border border-line/20 px-1.5 py-0.5 font-sans text-2xs text-faint sm:block">
              Esc
            </kbd>
          </div>

          <div ref={list} className="wj-scroll max-h-[min(60vh,28rem)] overflow-y-auto p-1.5">
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-faint">Nothing matches — try fewer letters.</p>
            ) : (
              results.map((command, index) => {
                const showHeading = index === 0 || results[index - 1]?.group !== command.group;
                const isActive = index === active;
                const Icon = command.icon;
                return (
                  <div key={command.id}>
                    {showHeading ? <p className="wj-label px-2.5 pb-1 pt-2.5">{command.group}</p> : null}
                    <button
                      type="button"
                      data-index={index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => run(command)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-sm transition-colors',
                        isActive ? 'bg-gold/10 text-ink' : 'text-ink/85',
                      )}
                    >
                      {command.sigil ? (
                        <Sigil name={command.sigil} portrait={command.portrait} size="sm" className="h-5 w-5 text-[0.5rem]" />
                      ) : (
                        <Icon className={cn('h-4 w-4 shrink-0', command.iconClass ?? 'text-muted')} strokeWidth={1.75} />
                      )}
                      <span className="min-w-0 flex-1 truncate">{command.label}</span>
                      {command.hint ? <span className="shrink-0 text-2xs text-faint">{command.hint}</span> : null}
                      {isActive ? <span className="shrink-0 text-2xs text-gold/70">↵</span> : null}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-4 border-t px-4 py-2 text-2xs text-faint">
            <span>↑↓ move</span>
            <span>↵ open</span>
            <span className="ml-auto">{doc.entries.length} entries searchable</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
