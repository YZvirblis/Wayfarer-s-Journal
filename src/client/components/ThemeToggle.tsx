import { Moon, Sun } from 'lucide-react';
import { toggleTheme, useSettings } from '../lib/settingsStore';
import { Button, IconButton } from './ui/Button';
import { Tooltip } from './ui/Tooltip';

/**
 * `labelled` is for places where the control stands alone and an unexplained
 * icon would be a riddle; `icon` is for toolbars where space is tight.
 */
export function ThemeToggle({ labelled = false }: { labelled?: boolean }) {
  const { theme } = useSettings();
  const next = theme === 'dark' ? 'Parchment' : 'Dark';
  const Icon = theme === 'dark' ? Sun : Moon;

  if (labelled) {
    return (
      <Button variant="ghost" size="sm" onClick={toggleTheme} className="text-faint hover:text-gold">
        <Icon className="h-3.5 w-3.5" />
        {next} theme
      </Button>
    );
  }

  return (
    <Tooltip label={`Switch to ${next}`} side="top">
      <IconButton variant="ghost" size="sm" onClick={toggleTheme} aria-label={`Switch to ${next} theme`}>
        <Icon />
      </IconButton>
    </Tooltip>
  );
}
