import {
  CalendarDays,
  ChevronsUpDown,
  Coins,
  Feather,
  Inbox,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Tags,
  Target,
  Trash2,
  UserRound,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { PROFILE_FIELD_IDS } from '../../shared/defaults';
import type { CharacterDocument, CharacterSummary, EntryType } from '../../shared/schema';
import { cn } from '../lib/cn';
import { iconByName } from '../lib/icons';
import { CAPTURE_SHORTCUT, PALETTE_SHORTCUT } from '../lib/keys';
import { colorClasses } from '../lib/palette';
import type { View } from '../types';
import { CharacterMenu } from './CharacterMenu';
import { SaveStatus } from './SaveStatus';
import { SecretsToggle } from './SecretsToggle';
import { Sigil } from './Sigil';
import { TagChip } from './TagChip';
import { ThemeToggle } from './ThemeToggle';
import { IconButton } from './ui/Button';
import { Divider } from './ui/Divider';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from './ui/Menu';
import { Tooltip } from './ui/Tooltip';

interface SidebarProps {
  doc: CharacterDocument;
  characters: CharacterSummary[];
  view: View;
  activeTagIds: string[];
  onNavigate: (view: View) => void;
  onToggleTag: (tagId: string) => void;
  onOpenTagManager: () => void;
  onOpenPalette: () => void;
  onCapture: () => void;
  onNewSection: () => void;
  onEditSection: (type: EntryType) => void;
  onEditFields: (type: EntryType) => void;
  onDeleteSection: (type: EntryType) => void;
  onSwitchCharacter: (id: string) => void;
  onManageCharacters: () => void;
}

function NavRow({
  label,
  count,
  icon: Icon,
  color,
  active,
  onClick,
  trailing,
}: {
  label: string;
  count?: number;
  icon: LucideIcon;
  color: string;
  active: boolean;
  onClick: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="group/row relative">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-2.5 rounded py-[0.4rem] pl-3 pr-2 text-left text-sm transition-colors duration-150',
          active ? 'text-ink' : 'text-muted hover:bg-ink/[0.035] hover:text-ink',
        )}
      >
        {active ? (
          <>
            <span className="absolute inset-y-[0.15rem] left-0 w-[2px] rounded-full bg-gold/80" />
            <span className="absolute inset-0 rounded bg-gold/[0.07]" />
          </>
        ) : null}
        <Icon className={cn('relative h-4 w-4 shrink-0', active ? color : 'opacity-70')} strokeWidth={1.75} />
        <span className="relative min-w-0 flex-1 truncate">{label}</span>
        {typeof count === 'number' ? (
          <span
            className={cn(
              'relative shrink-0 text-2xs tabular-nums transition-opacity',
              active ? 'text-gold/80' : 'text-faint',
              trailing && 'group-hover/row:opacity-0',
            )}
          >
            {count}
          </span>
        ) : null}
      </button>
      {trailing ? (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({
  doc,
  characters,
  view,
  activeTagIds,
  onNavigate,
  onToggleTag,
  onOpenTagManager,
  onOpenPalette,
  onCapture,
  onNewSection,
  onEditSection,
  onEditFields,
  onDeleteSection,
  onSwitchCharacter,
  onManageCharacters,
}: SidebarProps) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of doc.entries) map.set(entry.typeId, (map.get(entry.typeId) ?? 0) + 1);
    return map;
  }, [doc.entries]);

  const sortedTags = useMemo(
    () =>
      [...doc.tags].sort(
        (a, b) => (a.group ?? '￿').localeCompare(b.group ?? '￿') || a.name.localeCompare(b.name),
      ),
    [doc.tags],
  );

  const trade = doc.profile.fields.find((field) => field.id === PROFILE_FIELD_IDS.trade)?.value;
  const race = doc.profile.fields.find((field) => field.id === PROFILE_FIELD_IDS.race)?.value;
  const subtitle = [race, trade].filter(Boolean).join(' · ');

  return (
    <aside className="flex w-[17.5rem] shrink-0 flex-col border-r bg-panel/80 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 pb-2.5 pt-4">
        <span className="text-[0.5rem] text-gold/70">◆</span>
        <span className="font-display text-[0.6rem] uppercase tracking-wordmark text-gold/70">Wayfarer&rsquo;s Journal</span>
      </div>

      <div className="px-2.5">
        <Menu>
          <MenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded border border-transparent px-1.5 py-1.5 text-left transition-colors duration-150 hover:border-line/15 hover:bg-ink/[0.03]"
            >
              <Sigil name={doc.profile.name} portrait={doc.profile.portrait} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm tracking-title text-ink">{doc.profile.name}</span>
                {subtitle ? <span className="block truncate text-2xs text-faint">{subtitle}</span> : null}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-faint" />
            </button>
          </MenuTrigger>
          <CharacterMenu
            characters={characters}
            currentId={doc.id}
            onSwitchCharacter={onSwitchCharacter}
            onManageCharacters={onManageCharacters}
          />
        </Menu>
      </div>

      <div className="px-2.5 pt-2">
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex w-full items-center gap-2.5 rounded border border-line/[0.12] bg-base/30 py-1.5 pl-2.5 pr-2 text-left text-sm text-faint transition-colors duration-150 hover:border-line/25 hover:text-muted"
        >
          <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 truncate">Jump to…</span>
          <kbd className="shrink-0 rounded border border-line/15 px-1.5 py-px font-sans text-2xs tracking-wide text-faint">
            {PALETTE_SHORTCUT}
          </kbd>
        </button>
      </div>

      <Divider className="mx-4 my-2.5" />

      <nav className="wj-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pb-2">
        <NavRow
          label="Overview"
          icon={UserRound}
          color="text-gold"
          active={view.kind === 'overview'}
          onClick={() => onNavigate({ kind: 'overview' })}
        />
        <NavRow
          label="Inbox"
          icon={Inbox}
          color="text-gold"
          count={doc.captures.length}
          active={view.kind === 'inbox'}
          onClick={() => onNavigate({ kind: 'inbox' })}
          trailing={
            <Tooltip label={`Quick capture · ${CAPTURE_SHORTCUT}`}>
              <IconButton variant="ghost" size="sm" className="h-6 w-6" aria-label="Quick capture" onClick={onCapture}>
                <Feather className="h-3.5 w-3.5" />
              </IconButton>
            </Tooltip>
          }
        />

        <NavRow
          label="Sessions"
          icon={CalendarDays}
          color="text-gold"
          count={doc.sessions.length}
          active={view.kind === 'sessions'}
          onClick={() => onNavigate({ kind: 'sessions', sessionId: null })}
        />
        <NavRow
          label="Ledger"
          icon={Coins}
          color="text-gold"
          count={doc.transactions.length}
          active={view.kind === 'ledger'}
          onClick={() => onNavigate({ kind: 'ledger', counterpartyId: null })}
        />
        <NavRow
          label="Goals"
          icon={Target}
          color="text-gold"
          count={doc.goals.length}
          active={view.kind === 'goals'}
          onClick={() => onNavigate({ kind: 'goals' })}
        />
        <NavRow
          label="Web"
          icon={Waypoints}
          color="text-gold"
          active={view.kind === 'web'}
          onClick={() => onNavigate({ kind: 'web' })}
        />

        <p className="wj-label px-3 pb-1 pt-4">Journal</p>
        {doc.entryTypes.map((type) => {
          const Icon = iconByName(type.icon);
          return (
            <NavRow
              key={type.id}
              label={type.name}
              icon={Icon}
              color={colorClasses(type.color).text}
              count={counts.get(type.id) ?? 0}
              active={view.kind === 'type' && view.typeId === type.id}
              onClick={() => onNavigate({ kind: 'type', typeId: type.id })}
              trailing={
                <Menu>
                  <MenuTrigger asChild>
                    <IconButton variant="ghost" size="sm" className="h-6 w-6" aria-label={`${type.name} options`}>
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </IconButton>
                  </MenuTrigger>
                  <MenuContent>
                    {type.builtIn ? null : (
                      <MenuItem onSelect={() => onEditSection(type)}>
                        <Pencil className="h-3.5 w-3.5 opacity-70" />
                        Rename &amp; restyle
                      </MenuItem>
                    )}
                    <MenuItem onSelect={() => onEditFields(type)}>
                      <ListChecks className="h-3.5 w-3.5 opacity-70" />
                      Edit fields…
                    </MenuItem>
                    {type.builtIn ? null : (
                      <>
                        <MenuSeparator />
                        <MenuItem danger onSelect={() => onDeleteSection(type)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete section
                        </MenuItem>
                      </>
                    )}
                  </MenuContent>
                </Menu>
              }
            />
          );
        })}

        <button
          type="button"
          onClick={onNewSection}
          className="mt-1 flex w-full items-center gap-2.5 rounded py-[0.4rem] pl-3 pr-2 text-left text-sm text-faint transition-colors duration-150 hover:bg-ink/[0.035] hover:text-gold"
        >
          <Plus className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          New section
        </button>

        <div className="flex items-center justify-between px-3 pb-1.5 pt-5">
          <p className="wj-label">Tags</p>
          <Tooltip label="Manage tags">
            <IconButton
              variant="ghost"
              size="sm"
              className="h-5 w-5"
              onClick={onOpenTagManager}
              aria-label="Manage tags"
            >
              <Tags className="h-3 w-3" />
            </IconButton>
          </Tooltip>
        </div>
        {sortedTags.length === 0 ? (
          <p className="px-3 text-2xs leading-relaxed text-faint">
            No tags yet. Add them while writing an entry and they will gather here.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1 px-2">
            {sortedTags.map((tag) => (
              <TagChip
                key={tag.id}
                tag={tag}
                size="sm"
                active={activeTagIds.includes(tag.id)}
                onClick={() => onToggleTag(tag.id)}
              />
            ))}
          </div>
        )}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
        <SaveStatus />
        <div className="flex items-center gap-0.5">
          <SecretsToggle />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
