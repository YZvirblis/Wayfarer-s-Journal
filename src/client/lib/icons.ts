import {
  Beer,
  BookMarked,
  Coins,
  Feather,
  Flame,
  Gem,
  Hammer,
  Key,
  Leaf,
  MapPin,
  Moon,
  Mountain,
  NotebookPen,
  ScrollText,
  Shield,
  Skull,
  Sparkles,
  Star,
  Swords,
  Tent,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Entry types store an icon *name* in the character file. Only the icons listed
 * here can be chosen, which keeps the bundle tree-shakeable and means an
 * unknown name from a hand-edited file degrades to a sensible default.
 */
const ICONS: Record<string, LucideIcon> = {
  Users,
  MapPin,
  Shield,
  ScrollText,
  NotebookPen,
  BookMarked,
  Sparkles,
  Swords,
  Coins,
  Beer,
  Feather,
  Flame,
  Gem,
  Hammer,
  Key,
  Leaf,
  Moon,
  Mountain,
  Skull,
  Star,
  Tent,
};

export const iconByName = (name: string): LucideIcon => ICONS[name] ?? BookMarked;
