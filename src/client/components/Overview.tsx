import { EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { newId } from '../../shared/defaults';
import { DEFAULT_CURRENCY, type CharacterDocument, type ProfileField, type ProfileSection } from '../../shared/schema';
import { cn } from '../lib/cn';
import { mutate } from '../lib/documentStore';
import { compactRelative } from '../lib/format';
import { goalProgress, totals } from '../lib/ledger';
import { useLinks } from '../lib/linkContext';
import { useSettings } from '../lib/settingsStore';
import { useAutoCommit } from '../lib/useAutoCommit';
import { useReorder } from '../lib/useReorder';
import { GoalTile } from './GoalCard';
import { MarkdownField } from './MarkdownField';
import { PortraitPicker } from './PortraitPicker';
import { Button, IconButton } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Divider } from './ui/Divider';
import { Tooltip } from './ui/Tooltip';
import { Veil } from './ui/Veil';

function updateProfile(recipe: (profile: CharacterDocument['profile']) => void): void {
  mutate((draft) => recipe(draft.profile));
}

type HandleProps = ReturnType<ReturnType<typeof useReorder>['handleProps']>;

function Grip({ handle, dragging, className }: { handle: HandleProps; dragging: boolean; className?: string }) {
  return (
    <Tooltip label="Drag to reorder · ↑↓ with the keyboard">
      <span
        {...handle}
        className={cn(
          'flex h-6 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-faint/50 transition-colors hover:text-gold focus-visible:text-gold active:cursor-grabbing',
          dragging && 'text-gold',
          className,
        )}
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden />
      </span>
    </Tooltip>
  );
}

function FieldRow({
  field,
  handle,
  dragging,
  onDelete,
}: {
  field: ProfileField;
  handle: HandleProps;
  dragging: boolean;
  onDelete: () => void;
}) {
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
    <div
      className={cn(
        'group/field -ml-5 flex items-center gap-1 border-b border-line/[0.08] py-2 pl-0 transition-colors',
        dragging && 'rounded bg-gold/[0.06]',
      )}
    >
      <Grip
        handle={handle}
        dragging={dragging}
        className={cn('opacity-0 group-hover/field:opacity-100 focus-visible:opacity-100', dragging && 'opacity-100')}
      />
      <input
        value={label.value}
        onChange={(event) => label.onChange(event.target.value)}
        onBlur={label.flush}
        aria-label="Field name"
        className="wj-quiet-field ml-2 w-28 shrink-0 px-1.5 py-0.5 text-2xs font-medium uppercase tracking-[0.14em] text-faint"
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

function SectionBlock({
  section,
  handle,
  dragging,
  onDelete,
}: {
  section: ProfileSection;
  handle: HandleProps;
  dragging: boolean;
  onDelete: () => void;
}) {
  const { hideSecrets } = useSettings();
  const title = useAutoCommit(section.title, (value) =>
    updateProfile((profile) => {
      const target = profile.sections.find((candidate) => candidate.id === section.id);
      if (target) target.title = value;
    }),
  );

  return (
    <section
      id={`profile-section-${section.id}`}
      className={cn('group/section scroll-mt-6 rounded transition-colors', dragging && 'bg-gold/[0.05] ring-1 ring-gold/25')}
    >
      <Veil hidden={hideSecrets && section.secret} label="Secret section">
      <header className="mb-3 flex items-center gap-2">
        <Grip handle={handle} dragging={dragging} className="-ml-1" />
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
      </Veil>
    </section>
  );
}

/** The balance, with the currency's name editable in place: click "septims" and call it what your world calls it. */
function CurrencyStat({ balance, currency }: { balance: number; currency: string }) {
  const name = useAutoCommit(currency, (value) =>
    updateProfile((profile) => void (profile.currency = value.trim() || DEFAULT_CURRENCY)),
  );
  return (
    <div className="min-w-0">
      <p className="font-display text-xl tabular-nums tracking-title text-gold/90">
        {balance < 0 ? '−' : ''}
        {Math.abs(balance).toLocaleString()}
      </p>
      <Tooltip label="The name of your currency — rename it here">
        <input
          value={name.value}
          onChange={(event) => name.onChange(event.target.value)}
          onBlur={name.flush}
          aria-label="Currency name"
          className="wj-quiet-field -ml-1.5 mt-0.5 w-full px-1.5 py-0 font-sans text-2xs font-medium uppercase tracking-[0.14em] text-faint"
        />
      </Tooltip>
    </div>
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
  const { openGoals } = useLinks();
  const { hideSecrets } = useSettings();
  const name = useAutoCommit(doc.profile.name, (value) =>
    updateProfile((profile) => void (profile.name = value || 'Unnamed Wayfarer')),
  );

  const stats = useMemo(() => {
    const questType = doc.entryTypes.find((type) => type.features.status);
    const open = questType
      ? doc.entries.filter((entry) => entry.typeId === questType.id && (entry.status ?? 'active') === 'active').length
      : 0;
    return { entries: doc.entries.length, tags: doc.tags.length, open, questType, balance: totals(doc.transactions).net };
  }, [doc.entries, doc.entryTypes, doc.tags, doc.transactions]);

  const subtitle = doc.profile.fields
    .filter((field) => field.value.trim())
    .slice(0, 3)
    .map((field) => field.value)
    .join(' · ');

  const fieldsById = new Map(doc.profile.fields.map((field) => [field.id, field] as const));
  const sectionsById = new Map(doc.profile.sections.map((section) => [section.id, section] as const));
  const fieldOrder = useReorder(
    doc.profile.fields.map((field) => field.id),
    (next) =>
      updateProfile((profile) => {
        const byId = new Map(profile.fields.map((field) => [field.id, field] as const));
        profile.fields = next.flatMap((id) => byId.get(id) ?? []);
      }),
  );
  const sectionOrder = useReorder(
    doc.profile.sections.map((section) => section.id),
    (next) =>
      updateProfile((profile) => {
        const byId = new Map(profile.sections.map((section) => [section.id, section] as const));
        profile.sections = next.flatMap((id) => byId.get(id) ?? []);
      }),
  );

  return (
    <div className="wj-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-5 pb-28 pt-6 pane:px-10 pane:pt-10">
        <header className="flex items-start gap-5">
          <PortraitPicker
            name={doc.profile.name}
            portrait={doc.profile.portrait}
            onChange={(portrait) =>
              updateProfile((profile) => {
                if (portrait) profile.portrait = portrait;
                else delete profile.portrait;
              })
            }
          />
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

        <div className="mt-8 grid grid-cols-2 gap-6 border-y border-line/[0.1] py-4 sm:grid-cols-4">
          <Stat label="Entries" value={String(stats.entries)} />
          <Stat label={stats.questType ? 'Quests afoot' : 'Tags'} value={String(stats.questType ? stats.open : stats.tags)} />
          <CurrencyStat balance={stats.balance} currency={doc.profile.currency} />
          <Stat label="Last written" value={compactRelative(doc.updatedAt)} />
        </div>

        {doc.goals.length > 0 ? (
          <div className="mt-8">
            <p className="wj-eyebrow mb-3">Goals</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {doc.goals.map((goal) => (
                <Veil key={goal.id} hidden={hideSecrets && goal.secret} label="Secret goal">
                  <GoalTile goal={goal} progress={goalProgress(goal, doc.transactions)} onOpen={openGoals} />
                </Veil>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8">
          <p className="wj-eyebrow mb-2">The bearer of this journal</p>
          <div className="border-t border-line/[0.08]">
            {fieldOrder.order.map((id) => {
              const field = fieldsById.get(id);
              return field ? (
                <div key={field.id} ref={fieldOrder.register(field.id)}>
                  <FieldRow
                    field={field}
                    handle={fieldOrder.handleProps(field.id)}
                    dragging={fieldOrder.draggingId === field.id}
                    onDelete={() =>
                      updateProfile((profile) => {
                        profile.fields = profile.fields.filter((candidate) => candidate.id !== field.id);
                      })
                    }
                  />
                </div>
              ) : null;
            })}
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
          {sectionOrder.order.map((id) => {
            const section = sectionsById.get(id);
            return section ? (
              <div key={section.id} ref={sectionOrder.register(section.id)}>
                <SectionBlock
                  section={section}
                  handle={sectionOrder.handleProps(section.id)}
                  dragging={sectionOrder.draggingId === section.id}
                  onDelete={() => setPendingSection(section)}
                />
              </div>
            ) : null;
          })}
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
