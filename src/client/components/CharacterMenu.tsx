import { Download, FileText, Upload, Users } from 'lucide-react';
import type { CharacterSummary } from '../../shared/schema';
import { Sigil } from './Sigil';
import { MenuContent, MenuItem, MenuSeparator } from './ui/Menu';

/** The dropdown behind the character switcher; the trigger differs by layout. */
export function CharacterMenu({
  characters,
  currentId,
  onSwitchCharacter,
  onManageCharacters,
  onExportJson,
  onExportMarkdown,
  onImport,
  align = 'start',
}: {
  characters: CharacterSummary[];
  currentId: string;
  onSwitchCharacter: (id: string) => void;
  onManageCharacters: () => void;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onImport: () => void;
  align?: 'start' | 'center' | 'end';
}) {
  return (
    <MenuContent align={align} className="w-[16rem]">
      {characters.map((character) => (
        <MenuItem key={character.id} onSelect={() => onSwitchCharacter(character.id)}>
          <Sigil name={character.name} portrait={character.portrait} size="sm" className="h-6 w-6 text-[0.6rem]" />
          <span className="min-w-0 flex-1 truncate">{character.name}</span>
          {character.id === currentId ? <span className="text-[0.5rem] text-gold">◆</span> : null}
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuItem onSelect={onExportJson}>
        <Download className="h-3.5 w-3.5 opacity-70" />
        Export as JSON
      </MenuItem>
      <MenuItem onSelect={onExportMarkdown}>
        <FileText className="h-3.5 w-3.5 opacity-70" />
        Export as Markdown…
      </MenuItem>
      <MenuItem onSelect={onImport}>
        <Upload className="h-3.5 w-3.5 opacity-70" />
        Import a character…
      </MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={onManageCharacters}>
        <Users className="h-3.5 w-3.5 opacity-70" />
        All characters…
      </MenuItem>
    </MenuContent>
  );
}
