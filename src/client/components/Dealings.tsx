import { Coins } from 'lucide-react';
import { useMemo } from 'react';
import type { CharacterDocument } from '../../shared/schema';
import { cn } from '../lib/cn';
import { bodyPreview, formatCalendarShort } from '../lib/format';
import { chronological, formatAmount, formatSigned, totals } from '../lib/ledger';
import { useLinks } from '../lib/linkContext';
import { useSettings } from '../lib/settingsStore';
import { Button } from './ui/Button';

/** A person's money history: what passed between you, and the last few lines of it. */
export function Dealings({ doc, entryId, className }: { doc: CharacterDocument; entryId: string; className?: string }) {
  const { openLedger } = useLinks();
  const { hideSecrets } = useSettings();
  const own = useMemo(
    () =>
      chronological(
        doc.transactions.filter(
          (transaction) => transaction.counterpartyId === entryId && !(hideSecrets && transaction.secret),
        ),
      ).reverse(),
    [doc.transactions, entryId, hideSecrets],
  );
  const sums = totals(own);

  return (
    <section className={className} aria-label="Dealings">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="wj-label">Dealings</span>
        {own.length > 0 ? (
          <span className="text-2xs tabular-nums text-faint">
            {own.length} line{own.length === 1 ? '' : 's'} · net{' '}
            <span className={cn(sums.net < 0 ? 'text-rose/90' : 'text-sage')}>{formatSigned(sums.net)}</span>
          </span>
        ) : null}
      </div>
      {own.length === 0 ? (
        <p className="px-0.5 text-xs leading-relaxed text-faint">
          No coin has passed between you yet.{' '}
          <button type="button" onClick={() => openLedger(entryId)} className="text-muted underline-offset-2 hover:text-gold hover:underline">
            Record something in the ledger.
          </button>
        </p>
      ) : (
        <>
          <ul className="divide-y divide-line/[0.08]">
            {own.slice(0, 5).map((transaction) => (
              <li key={transaction.id} className="flex items-baseline gap-3 py-1.5 text-xs">
                <span className="w-[4.75rem] shrink-0 text-faint">{formatCalendarShort(transaction.date)}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{bodyPreview(transaction.description, 120) || '—'}</span>
                <span className={cn('shrink-0 tabular-nums', transaction.amount < 0 ? 'text-rose/90' : 'text-sage')}>
                  {formatSigned(transaction.amount)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between text-2xs text-faint">
            <span className="tabular-nums">
              +{formatAmount(sums.income)} in · −{formatAmount(sums.expense)} out
            </span>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-2xs text-faint hover:text-gold" onClick={() => openLedger(entryId)}>
              <Coins className="h-3 w-3" />
              {own.length > 5 ? `All ${own.length} in the ledger` : 'Open in the ledger'}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
