import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/cn';
import { toggleHideSecrets, useSettings } from '../lib/settingsStore';
import { IconButton } from './ui/Button';
import { Tooltip } from './ui/Tooltip';

/** The hide-secrets switch: lit in plum while secrets are blurred. */
export function SecretsToggle({ side = 'top' }: { side?: 'top' | 'right' }) {
  const { hideSecrets } = useSettings();
  return (
    <Tooltip label={hideSecrets ? 'Secrets are hidden — show them' : 'Hide secrets (for screenshots)'} side={side}>
      <IconButton
        variant="ghost"
        size="sm"
        onClick={toggleHideSecrets}
        aria-label={hideSecrets ? 'Show secrets' : 'Hide secrets'}
        aria-pressed={hideSecrets}
        className={cn(hideSecrets && 'bg-plum/15 text-plum hover:bg-plum/25 hover:text-plum')}
      >
        {hideSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </IconButton>
    </Tooltip>
  );
}
