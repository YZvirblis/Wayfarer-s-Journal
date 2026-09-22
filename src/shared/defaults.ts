import { nanoid } from 'nanoid';
import {
  SCHEMA_VERSION,
  type CharacterDocument,
  type CharacterSummary,
  type EntryType,
  type Profile,
} from './schema';

export const newId = (): string => nanoid(12);

/** Stable ids for the default profile fields so the character-select summary can
 *  find race/trade without matching on user-editable labels. */
export const PROFILE_FIELD_IDS = {
  race: 'race',
  age: 'age',
  birthplace: 'birthplace',
  birthSign: 'birthsign',
  trade: 'trade',
} as const;

export const BUILT_IN_TYPE_IDS = {
  people: 'people',
  places: 'places',
  factions: 'factions',
  quests: 'quests',
  notes: 'notes',
} as const;

export const STANDING_OPTIONS = ['Close', 'Known', 'Met'] as const;

export function builtInEntryTypes(): EntryType[] {
  return [
    {
      id: BUILT_IN_TYPE_IDS.people,
      name: 'People',
      icon: 'Users',
      color: 'gold',
      builtIn: true,
      fields: [
        { key: 'role', label: 'Role', kind: 'text' },
        { key: 'location', label: 'Usually found', kind: 'text' },
        { key: 'standing', label: 'Standing', kind: 'select', options: [...STANDING_OPTIONS] },
      ],
      features: {},
    },
    {
      id: BUILT_IN_TYPE_IDS.places,
      name: 'Places',
      icon: 'MapPin',
      color: 'sage',
      builtIn: true,
      fields: [{ key: 'hold', label: 'Hold / Region', kind: 'text' }],
      features: {},
    },
    {
      id: BUILT_IN_TYPE_IDS.factions,
      name: 'Factions',
      icon: 'Shield',
      color: 'frost',
      builtIn: true,
      fields: [{ key: 'base', label: 'Base', kind: 'text' }],
      features: {},
    },
    {
      id: BUILT_IN_TYPE_IDS.quests,
      name: 'Quests',
      icon: 'ScrollText',
      color: 'ember',
      builtIn: true,
      fields: [],
      features: { status: true, progress: true },
    },
    {
      id: BUILT_IN_TYPE_IDS.notes,
      name: 'Notes',
      icon: 'NotebookPen',
      color: 'plum',
      builtIn: true,
      fields: [],
      features: {},
    },
  ];
}

/** Icons offered when creating a custom section. Names are lucide-react exports. */
export const SECTION_ICON_CHOICES = [
  'BookMarked',
  'Sparkles',
  'Swords',
  'Coins',
  'Beer',
  'Feather',
  'Flame',
  'Gem',
  'Hammer',
  'Key',
  'Leaf',
  'Moon',
  'Mountain',
  'Skull',
  'Star',
  'Tent',
] as const;

function defaultProfile(name: string): Profile {
  return {
    name,
    fields: [
      { id: PROFILE_FIELD_IDS.race, label: 'Race', value: '' },
      { id: PROFILE_FIELD_IDS.age, label: 'Age', value: '' },
      { id: PROFILE_FIELD_IDS.birthplace, label: 'Birthplace', value: '' },
      { id: PROFILE_FIELD_IDS.birthSign, label: 'Birth Sign', value: '' },
      { id: PROFILE_FIELD_IDS.trade, label: 'Trade', value: '' },
    ],
    sections: [
      { id: newId(), title: 'Backstory', body: '', secret: false },
      { id: newId(), title: 'Personality', body: '', secret: false },
    ],
  };
}

export function createCharacterDocument(name: string, now = new Date().toISOString()): CharacterDocument {
  return {
    id: newId(),
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    profile: defaultProfile(name.trim() || 'Unnamed Wayfarer'),
    tags: [],
    entryTypes: builtInEntryTypes(),
    entries: [],
    captures: [],
    sessions: [],
    transactions: [],
    goals: [],
  };
}

export function profileFieldValue(doc: CharacterDocument, fieldId: string, label: string): string {
  const byId = doc.profile.fields.find((f) => f.id === fieldId);
  if (byId?.value) return byId.value;
  const byLabel = doc.profile.fields.find((f) => f.label.toLowerCase() === label.toLowerCase());
  return byLabel?.value ?? '';
}

export function toSummary(doc: CharacterDocument): CharacterSummary {
  return {
    id: doc.id,
    name: doc.profile.name,
    race: profileFieldValue(doc, PROFILE_FIELD_IDS.race, 'Race'),
    trade: profileFieldValue(doc, PROFILE_FIELD_IDS.trade, 'Trade'),
    entryCount: doc.entries.length,
    updatedAt: doc.updatedAt,
  };
}
