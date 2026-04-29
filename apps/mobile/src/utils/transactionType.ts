import type { TransactionItem } from '@loyalty/shared-types';

export type TransactionKind = 'earn' | 'spend' | 'neutral';

const NEUTRAL_DESCRIPTIONS = [
  'сумма чека',
  'оплата наличн',
  'оплата карт',
];

export function classifyTransaction(tx: Pick<TransactionItem, 'type' | 'description'>): TransactionKind {
  if (tx.type === 'spend') return 'spend';
  const desc = (tx.description ?? '').trim().toLowerCase();
  if (NEUTRAL_DESCRIPTIONS.some((p) => desc.includes(p))) return 'neutral';
  return 'earn';
}
