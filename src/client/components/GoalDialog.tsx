import { useEffect, useState } from 'react';
import { type Goal, type GoalKind } from '../../shared/schema';
import type { GoalInput } from '../lib/documentStore';
import { LinkTextarea } from './LinkTextarea';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { SegmentedControl } from './ui/SegmentedControl';

const KINDS = [
  { value: 'save' as const, label: 'Saving up' },
  { value: 'debt' as const, label: 'Paying off' },
];

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing. */
  goal?: Goal | null;
  onSubmit: (values: GoalInput) => void;
}

export function GoalDialog({ open, onOpenChange, goal, onSubmit }: GoalDialogProps) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<GoalKind>('save');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [secret, setSecret] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(goal?.title ?? '');
    setKind(goal?.kind ?? 'save');
    setTarget(goal ? String(goal.target) : '');
    setDeadline(goal?.deadline ?? '');
    setNotes(goal?.notes ?? '');
    setSecret(goal?.secret ?? false);
  }, [open, goal]);

  const targetValue = Number(target.replace(/,/g, ''));
  const canSubmit = title.trim().length > 0 && Number.isFinite(targetValue) && targetValue > 0;

  function submit() {
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      kind,
      target: Math.round(targetValue),
      notes,
      secret,
      ...(deadline ? { deadline } : {}),
    });
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? 'Edit goal' : 'New goal'}
      description={
        goal
          ? 'Progress comes from the ledger, so only the target and the words change here.'
          : 'Something to save toward, or a debt to work down. Every payment you log against it moves the bar.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit}>
            {goal ? 'Save' : 'Set the goal'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="goal-title" className="wj-label mb-1.5 block">
            Title
          </label>
          <input
            id="goal-title"
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={kind === 'save' ? 'A horse of my own' : 'What is owed to Ma’ziri'}
            className="wj-field h-9"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="wj-label mb-1.5 block">Kind</span>
            <SegmentedControl value={kind} options={KINDS} onChange={setKind} />
          </div>
          <div>
            <label htmlFor="goal-target" className="wj-label mb-1.5 block">
              Target, in septims
            </label>
            <input
              id="goal-target"
              type="number"
              min={1}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="900"
              className="wj-field h-9 tabular-nums"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="goal-deadline" className="wj-label mb-1.5 block">
              By when <span className="normal-case tracking-normal opacity-70">(optional)</span>
            </label>
            <input
              id="goal-deadline"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              className="wj-field h-9"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={secret}
              onChange={(event) => setSecret(event.target.checked)}
              className="h-3.5 w-3.5 accent-[rgb(var(--wj-gold))]"
            />
            Keep this secret
          </label>
        </div>

        <div>
          <span className="wj-label mb-1.5 block">Notes</span>
          <LinkTextarea
            value={notes}
            onChange={setNotes}
            placeholder="Why it matters, who it involves — [[links]] work here."
            minHeight={72}
            className="wj-field font-serif text-[1rem] leading-[1.6]"
          />
        </div>
      </div>
    </Modal>
  );
}
