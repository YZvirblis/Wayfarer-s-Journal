import * as Popover from '@radix-ui/react-popover';
import {
  CalendarDays,
  Coins,
  Feather,
  Inbox,
  Plus,
  Search,
  Tags,
  Target,
  UserRound,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import type { CharacterDocument, CharacterSummary } from '../../shared/schema';
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
import { Button } from './ui/Button';
import { Menu, MenuTrigger } from './ui/Menu';
import { Tooltip } from './ui/Tooltip';

interface SidebarRailProps {
  doc: CharacterDocument;
  characters: CharacterSummary[];
  view: View;
  activeTagIds: string[];
  onNavigate: (view: View) => void;
  onToggleTag: (tagId: string) => void;
  onClearTags: () => void;
  onOpenTagManager: () => void;
  onOpenPalette: () => void;
  onCapture: () => void;
  onNewSection: () => void;
  onSwitchCharacter: (id: string) => void;
  onManageCharacters: () => void;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onImport: () => void;
  onBackups: () => void;
}

function RailButton({
  label,
  icon: Icon,
  color,
  active,
  onClick,
  badge,
}: {
  label: string;
  icon: LucideIcon;
  color?: string;
  active?: boolean;
  onClick: () => void;
  badge?: ReactNode;
}) {
  return (
    <Tooltip label={label} side="right">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded transition-colors duration-150',
          active ? 'bg-gold/[0.09] text-ink' : 'text-muted hover:bg-ink/[0.045] hover:text-ink',
        )}
      >
        {active ? <span className="absolute inset-y-1.5 -left-2 w-[2px] rounded-full bg-gold/80" /> : null}
        <Icon className={cn('h-[1.05rem] w-[1.05rem]', active && color)} strokeWidth={1.75} />
        {badge}
      </button>
    </Tooltip>
  );
}

/** The sidebar collapsed to icons, for windows narrower than the `wide` breakpoint. */
export function SidebarRail({
  doc,
  characters,
  view,
  activeTagIds,
  onNavigate,
  onToggleTag,
  onClearTags,
  onOpenTagManager,
  onOpenPalette,
  onCapture,
  onNewSection,
  onSwitchCharacter,
  onManageCharacters,
  onExportJson,
  onExportMarkdown,
  onImport,
  onBackups,
}: SidebarRailProps) {
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

  return (
    <aside className="flex w-[3.5rem] shrink-0 flex-col items-center border-r bg-panel/80 pb-2 pt-2.5 backdrop-blur-sm">
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            aria-label={`${doc.profile.name} — switch character`}
            className="rounded transition-transform duration-150 hover:scale-105"
          >
            <Sigil name={doc.profile.name} portrait={doc.profile.portrait} size="sm" className="h-9 w-9" />
          </button>
        </MenuTrigger>
        <CharacterMenu
          characters={characters}
          currentId={doc.id}
          onSwitchCharacter={onSwitchCharacter}
          onManageCharacters={onManageCharacters}
          onExportJson={onExportJson}
          onExportMarkdown={onExportMarkdown}
          onImport={onImport}
          onBackups={onBackups}
        />
      </Menu>

      <span className="my-2.5 h-px w-6 bg-line/15" />

      <RailButton label={`Jump to anything · ${PALETTE_SHORTCUT}`} icon={Search} onClick={onOpenPalette} />
      <RailButton label={`Quick capture · ${CAPTURE_SHORTCUT}`} icon={Feather} onClick={onCapture} />

      <span className="my-1.5 h-px w-4 bg-line/10" />

      <nav className="wj-scroll flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-x-hidden overflow-y-auto">
        <RailButton
          label="Overview"
          icon={UserRound}
          color="text-gold"
          active={view.kind === 'overview'}
          onClick={() => onNavigate({ kind: 'overview' })}
        />
        <RailButton
          label={`Inbox · ${doc.captures.length}`}
          icon={Inbox}
          color="text-gold"
          active={view.kind === 'inbox'}
          onClick={() => onNavigate({ kind: 'inbox' })}
          badge={
            doc.captures.length > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 min-w-[1rem] rounded-full border border-panel bg-gold px-1 text-center text-[0.55rem] font-semibold leading-4 text-base">
                {doc.captures.length}
              </span>
            ) : undefined
          }
        />
        <RailButton
          label={`Sessions · ${doc.sessions.length}`}
          icon={CalendarDays}
          color="text-gold"
          active={view.kind === 'sessions'}
          onClick={() => onNavigate({ kind: 'sessions', sessionId: null })}
        />
        <RailButton
          label={`Ledger · ${doc.transactions.length}`}
          icon={Coins}
          color="text-gold"
          active={view.kind === 'ledger'}
          onClick={() => onNavigate({ kind: 'ledger', counterpartyId: null })}
        />
        <RailButton
          label={`Goals · ${doc.goals.length}`}
          icon={Target}
          color="text-gold"
          active={view.kind === 'goals'}
          onClick={() => onNavigate({ kind: 'goals' })}
        />
        <RailButton
          label="Relationship web"
          icon={Waypoints}
          color="text-gold"
          active={view.kind === 'web'}
          onClick={() => onNavigate({ kind: 'web' })}
        />
        <span className="my-1.5 h-px w-4 bg-line/10" />
        {doc.entryTypes.map((type) => (
          <RailButton
            key={type.id}
            label={`${type.name} · ${counts.get(type.id) ?? 0}`}
            icon={iconByName(type.icon)}
            color={colorClasses(type.color).text}
            active={view.kind === 'type' && view.typeId === type.id}
            onClick={() => onNavigate({ kind: 'type', typeId: type.id })}
          />
        ))}
        <RailButton label="New section" icon={Plus} onClick={onNewSection} />
      </nav>

      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label={activeTagIds.length ? `Tags (${activeTagIds.length} filtering)` : 'Tags'}
            className={cn(
              'relative mt-1 flex h-9 w-9 items-center justify-center rounded transition-colors duration-150',
              activeTagIds.length ? 'text-gold' : 'text-muted hover:bg-ink/[0.045] hover:text-ink',
            )}
          >
            <Tags className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.75} />
            {activeTagIds.length ? (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-gold" />
            ) : null}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="right"
            align="end"
            sideOffset={10}
            className="z-50 w-64 animate-scale-in rounded-card border bg-panel p-3 shadow-lifted"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="wj-label">Tags</span>
              <div className="flex items-center gap-2">
                {activeTagIds.length ? (
                  <button type="button" onClick={onClearTags} className="text-2xs text-faint hover:text-ink">
                    clear
                  </button>
                ) : null}
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-2xs" onClick={onOpenTagManager}>
                  Manage
                </Button>
              </div>
            </div>
            {sortedTags.length === 0 ? (
              <p className="text-2xs leading-relaxed text-faint">No tags yet. Add them while writing an entry.</p>
            ) : (
              <div className="wj-scroll flex max-h-72 flex-wrap gap-1 overflow-y-auto">
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
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <span className="my-2 h-px w-6 bg-line/15" />
      <SecretsToggle side="right" />
      <ThemeToggle />
      <SaveStatus compact className="mt-1" />
    </aside>
  );
}
