import { EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { newId } from '../../shared/defaults';
import type { CharacterDocument, ProfileField, ProfileSection } from '../../shared/schema';
import { cn } from '../lib/cn';
import { mutate } from '../lib/documentStore';
import { compactRelative } from '../lib/format';
import { useAutoCommit } from '../lib/useAutoCommit';
import { MarkdownField } from './MarkdownField';
import { Sigil } from './Sigil';
import { Button, IconButton } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Divider } from './ui/Divider';
import { Tooltip } from './ui/Tooltip';

function updateProfile(recipe: (profile: CharacterDocument['profile']) => void): void {
  mutate((draft) => recipe(draft.profile));
}

function FieldRow({ field, onDelete }: { field: ProfileField; onDelete: () => void }) {
  const label = useAutoCommit(field.label, (value) =>
    updateProfile((profile) => {
      const target = profile.fields.find((candidate) => candidate.id === field.id);
      if (target) target.label = value;
    }),
  );
  const value = useAutoCommit(field.value, (next) =>
    updateProfile((profile) => {
      const target = profile.fields.find((candidate) => candidate.id === field.id);
      if (target) target.value = next;
    }),
  );

  return (
    <div className="group/field flex items-center gap-3 border-b border-line/[0.08] py-2">
      <input
        value={label.value}
        onChange={(event) => label.onChange(event.target.value)}
        onBlur={label.flush}
        aria-label="Field name"
        className="wj-quiet-field w-28 shrink-0 px-1.5 py-0.5 text-2xs font-medium uppercase tracking-[0.14em] text-faint"
      />
      <input
        value={value.value}
        onChange={(event) => value.onChange(event.target.value)}
        onBlur={value.flush}
        placeholder="—"
        aria-label={`${field.label} value`}
        className="wj-quiet-field min-w-0 flex-1 px-1.5 py-0.5 font-serif text-[1.02rem] text-ink"
      />
      <Tooltip label="Remove field">
        <IconButton
          variant="ghost"
          size="sm"
          aria-label={`Remove ${field.label}`}
          className="h-6 w-6 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/field:opacity-100"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </IconButton>
      </Tooltip>
    </div>
  );
}

function SectionBlock({ section, onDelete }: { section: ProfileSection; onDelete: () => void }) {
  const title = useAutoCommit(section.title, (value) =>
    updateProfile((profile) => {
      const target = profile.sections.find((candidate) => candidate.id === section.id);
      if (target) target.title = value;
    }),
  );

  return (
    <section className="group/section">
      <header className="mb-3 flex items-center gap-2">
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-faint/40" aria-hidden />
        <input
          value={title.value}
          onChange={(event) => title.onChange(event.target.value)}
          onBlur={title.flush}
          aria-label="Section title"
          className="wj-quiet-field min-w-0 flex-1 px-1.5 py-0.5 font-display text-base tracking-title text-ink"
        />
        {section.secret ? <EyeOff className="h-3.5 w-3.5 shrink-0 text-plum/80" aria-label="Secret section" /> : null}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/section:opacity-100">
          <Tooltip label={section.secret ? 'Unmark secret' : 'Mark as secret'}>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label={section.secret ? 'Unmark secret' : 'Mark as secret'}
              className={cn('h-6 w-6', section.secret && 'text-plum opacity-100')}
              onClick={() =>
                updateProfile((profile) => {
                  const target = profile.sections.find((candidate) => candidate.id === section.id);
                  if (target) target.secret = !target.secret;
                })
              }
            >
              <EyeOff className="h-3 w-3" />
            </IconButton>
          </Tooltip>
          <Tooltip label="Delete section">
            <IconButton variant="ghost" size="sm" aria-label="Delete section" className="h-6 w-6" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </IconButton>
          </Tooltip>
        </div>
      </header>
      <MarkdownField
        value={section.body}
        onChange={(value) =>
          updateProfile((profile) => {
            const target = profile.sections.find((candidate) => candidate.id === section.id);
            if (target) target.body = value;
          })
        }
        placeholder="Write freely here — markdown works."
        minHeight={140}
      />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-display text-xl tabular-nums tracking-title text-gold/90">{value}</p>
      <p className="wj-label mt-0.5 truncate">{label}</p>
    </div>
  );
}

export function Overview({ doc }: { doc: CharacterDocument }) {
  const [pendingSection, setPendingSection] = useState<ProfileSection | null>(null);
  const name = useAutoCommit(doc.profile.name, (value) =>
    updateProfile((profile) => void (profile.name = value || 'Unnamed Wayfarer')),
  );

  const stats = useMemo(() => {
    const questType = doc.entryTypes.find((type) => type.features.status);
    const open = questType
      ? doc.entries.filter((entry) => entry.typeId === questType.id && (entry.status ?? 'active') === 'active').length
      : 0;
    return { entries: doc.entries.length, tags: doc.tags.length, open, questType };
  }, [doc.entries, doc.entryTypes, doc.tags]);

  const subtitle = doc.profile.fields
    .filter((field) => field.value.trim())
    .slice(0, 3)
    .map((field) => field.value)
    .join(' · ');

  return (
    <div className="wj-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-5 pb-28 pt-6 pane:px-10 pane:pt-10">
        <header className="flex items-start gap-5">
          <Sigil name={doc.profile.name} size="lg" />
          <div className="min-w-0 flex-1 pt-1">
            <input
              value={name.value}
              onChange={(event) => name.onChange(event.target.value)}
              onBlur={name.flush}
              aria-label="Character name"
              className="wj-quiet-field -ml-2 px-2 py-0.5 font-display text-[2.1rem] leading-tight tracking-title text-ink"
            />
            {subtitle ? <p className="mt-1 px-0.5 font-serif text-[1.05rem] text-muted">{subtitle}</p> : null}
          </div>
        </header>

        <div className="mt-8 grid grid-cols-3 gap-6 border-y border-line/[0.1] py-4">
          <Stat label="Entries" value={String(stats.entries)} />
          <Stat label={stats.questType ? 'Quests afoot' : 'Tags'} value={String(stats.questType ? stats.open : stats.tags)} />
          <Stat label="Last written" value={compactRelative(doc.updatedAt)} />
        </div>

        <div className="mt-8">
          <p className="wj-eyebrow mb-2">The bearer of this journal</p>
          <div className="border-t border-line/[0.08]">
            {doc.profile.fields.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                onDelete={() =>
                  updateProfile((profile) => {
                    profile.fields = profile.fields.filter((candidate) => candidate.id !== field.id);
                  })
                }
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-faint hover:text-gold"
            onClick={() =>
              updateProfile((profile) => {
                profile.fields.push({ id: newId(), label: 'New field', value: '' });
              })
            }
          >
            <Plus className="h-3 w-3" />
            Add field
          </Button>
        </div>

        <Divider className="my-9" />

        <div className="space-y-10">
          {doc.profile.sections.map((section) => (
            <SectionBlock key={section.id} section={section} onDelete={() => setPendingSection(section)} />
          ))}
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="mt-8"
          onClick={() =>
            updateProfile((profile) => {
              profile.sections.push({ id: newId(), title: 'New section', body: '', secret: false });
            })
          }
        >
          <Plus className="h-3.5 w-3.5" />
          Add a section
        </Button>
      </div>

      <ConfirmDialog
        open={pendingSection !== null}
        onOpenChange={(open) => !open && setPendingSection(null)}
        title={`Delete "${pendingSection?.title ?? ''}"?`}
        confirmLabel="Delete section"
        onConfirm={() => {
          const target = pendingSection;
          if (target) {
            updateProfile((profile) => {
              profile.sections = profile.sections.filter((candidate) => candidate.id !== target.id);
            });
          }
          setPendingSection(null);
        }}
      >
        <p className="text-sm text-muted">Everything written in this section will be removed.</p>
      </ConfirmDialog>
    </div>
  );
}
