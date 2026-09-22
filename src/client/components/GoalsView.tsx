import { Plus, Target } from 'lucide-react';
import { useState } from 'react';
import type { CharacterDocument, Goal } from '../../shared/schema';
import { deleteGoal } from '../lib/documentStore';
import { goalProgress } from '../lib/ledger';
import { GoalCard } from './GoalCard';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { EmptyState } from './ui/EmptyState';

interface GoalsViewProps {
  doc: CharacterDocument;
  onNewGoal: () => void;
  onEditGoal: (goal: Goal) => void;
  onOpenLedger: () => void;
}

export function GoalsView({ doc, onNewGoal, onEditGoal, onOpenLedger }: GoalsViewProps) {
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null);

  return (
    <div className="wj-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-5 pb-24 pt-6 pane:px-10 pane:pt-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="wj-eyebrow">Ambitions and obligations</p>
            <h2 className="mt-1 font-display text-[1.75rem] leading-tight tracking-title text-ink">Goals</h2>
            <p className="mt-1.5 text-sm text-muted">
              What you are saving for and what you owe. Every septim logged against a goal moves its bar.
            </p>
          </div>
          <Button variant="primary" onClick={onNewGoal}>
            <Plus className="h-3.5 w-3.5" />
            New goal
          </Button>
        </header>

        {doc.goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals yet"
            hint="A sum to save, or a debt to clear. Give it a target and, if it has one, a date — the ledger does the counting."
            action={
              <Button variant="primary" onClick={onNewGoal}>
                <Plus className="h-3.5 w-3.5" />
                Set a goal
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 pane:grid-cols-2">
            {doc.goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                progress={goalProgress(goal, doc.transactions)}
                onEdit={() => onEditGoal(goal)}
                onDelete={() => setPendingDelete(goal)}
                onOpenLedger={onOpenLedger}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.title ?? ''}"?`}
        confirmLabel="Delete goal"
        onConfirm={() => {
          if (pendingDelete) deleteGoal(pendingDelete.id);
          setPendingDelete(null);
        }}
      >
        <p className="text-sm leading-relaxed text-muted">
          The transactions logged against it stay in the ledger; they simply stop pointing at this goal.
        </p>
      </ConfirmDialog>
    </div>
  );
}
