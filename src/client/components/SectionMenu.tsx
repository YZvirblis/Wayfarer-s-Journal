import { ArrowDown, ArrowUp, ListChecks, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { EntryType } from '../../shared/schema';
import { cn } from '../lib/cn';
import { moveEntryType } from '../lib/documentStore';
import { IconButton } from './ui/Button';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from './ui/Menu';

interface SectionMenuProps {
  type: EntryType;
  /** Position among the sections, for the move items. */
  index: number;
  total: number;
  onEditSection: (type: EntryType) => void;
  onEditFields: (type: EntryType) => void;
  onDeleteSection: (type: EntryType) => void;
  className?: string;
}

/** The "…" menu a section carries in the sidebar and in the compact list header. */
export function SectionMenu({ type, index, total, onEditSection, onEditFields, onDeleteSection, className }: SectionMenuProps) {
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton variant="ghost" size="sm" className={cn('h-6 w-6', className)} aria-label={`${type.name} options`}>
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
        <MenuSeparator />
        <MenuItem disabled={index === 0} onSelect={() => moveEntryType(type.id, -1)}>
          <ArrowUp className="h-3.5 w-3.5 opacity-70" />
          Move up
        </MenuItem>
        <MenuItem disabled={index >= total - 1} onSelect={() => moveEntryType(type.id, 1)}>
          <ArrowDown className="h-3.5 w-3.5 opacity-70" />
          Move down
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
  );
}
