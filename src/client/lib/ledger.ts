import type { Goal, Transaction } from '../../shared/schema';
import { localDate } from './format';

/** Oldest first, ties broken by when the row was written. */
export function chronological(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

export interface LedgerRow {
  transaction: Transaction;
  /** Balance after this transaction, counting every transaction (not just the visible ones). */
  balance: number;
}

/** Newest first, each row carrying the running balance at that point. */
export function withRunningBalance(all: Transaction[], visible: Set<string> | null = null): LedgerRow[] {
  let balance = 0;
  const rows: LedgerRow[] = [];
  for (const transaction of chronological(all)) {
    balance += transaction.amount;
    if (!visible || visible.has(transaction.id)) rows.push({ transaction, balance });
  }
  return rows.reverse();
}

export interface Totals {
  income: number;
  expense: number;
  net: number;
}

export function totals(transactions: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const { amount } of transactions) {
    if (amount >= 0) income += amount;
    else expense += -amount;
  }
  return { income, expense, net: income - expense };
}

/** An unsigned amount with digit grouping; the currency name is the character's own (`profile.currency`). */
export const formatAmount = (amount: number): string => Math.round(Math.abs(amount)).toLocaleString();

/** "+120" / "−40": the sign the player thinks in, with a real minus sign. */
export function formatSigned(amount: number): string {
  return `${amount < 0 ? '−' : '+'}${formatAmount(amount)}`;
}

export interface GoalProgress {
  /** Coin saved (for a save goal) or repaid (for a debt) so far. */
  done: number;
  remaining: number;
  ratio: number;
  complete: boolean;
  /** Whole days until the deadline; negative when overdue; null without a deadline. */
  daysLeft: number | null;
  /** Coin per week still needed to make the deadline; null when there is none or it has passed. */
  perWeek: number | null;
  /** The transactions carrying this goal, newest first. */
  transactions: Transaction[];
}

function daysBetween(from: string, to: string): number {
  const parse = (date: string) => {
    const [y, m, d] = date.split('-').map(Number);
    return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

/**
 * Progress is derived, never stored. Deposits toward a save goal are income
 * (positive); repayments of a debt are expenses (negative), so a debt goal
 * counts the money that went *out* under its name.
 */
export function goalProgress(goal: Goal, transactions: Transaction[], today = localDate()): GoalProgress {
  const own = transactions.filter((transaction) => transaction.goalId === goal.id);
  const sum = own.reduce((total, transaction) => total + transaction.amount, 0);
  const done = Math.max(0, goal.kind === 'save' ? sum : -sum);
  const remaining = Math.max(0, goal.target - done);
  const ratio = goal.target > 0 ? Math.min(1, done / goal.target) : done > 0 ? 1 : 0;
  const daysLeft = goal.deadline ? daysBetween(today, goal.deadline) : null;
  const perWeek = daysLeft !== null && daysLeft > 0 && remaining > 0 ? remaining / (daysLeft / 7) : null;
  return {
    done,
    remaining,
    ratio,
    complete: remaining === 0 && goal.target > 0,
    daysLeft,
    perWeek,
    transactions: chronological(own).reverse(),
  };
}

/** "120", "+120", "-40", "1,200": the leading amount of a quick-entry line. */
export function parseQuickEntry(text: string): { amount: number | null; signed: boolean; description: string } {
  const match = /^\s*([+−-])?\s*(\d[\d,]*(?:\.\d+)?)\s*(.*)$/s.exec(text);
  if (!match) return { amount: null, signed: false, description: text.trim() };
  const magnitude = Number(match[2]?.replace(/,/g, ''));
  const sign = match[1];
  return {
    amount: Number.isFinite(magnitude) ? (sign === '-' || sign === '−' ? -magnitude : magnitude) : null,
    signed: Boolean(sign),
    description: (match[3] ?? '').trim(),
  };
}
