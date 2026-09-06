/**
 * Financial calculation helper functions.
 * All amounts handled in cents/smallest currency unit or rounded deterministically.
 */

export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES' | 'ITEM';

export interface ParticipantShare {
  userId: string;
  amount: number; // in cents or standard decimal
}

export interface SplitInput {
  amount: number;
  payerIds: { userId: string; amount: number }[];
  type: SplitType;
  participants: {
    userId: string;
    share?: number; // percentage (0-100), exact amount, or shares count
  }[];
}

/**
 * Deterministically round to 2 decimal places / cents
 */
export function roundCurrency(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate equal split among participants, distributing remainder cents evenly.
 */
export function calculateEqualSplit(
  totalAmount: number,
  participantIds: string[]
): ParticipantShare[] {
  if (!participantIds.length) return [];
  const count = participantIds.length;
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / count);
  let remainderCents = totalCents - baseCents * count;

  return participantIds.map((userId) => {
    const extra = remainderCents > 0 ? 1 : 0;
    if (remainderCents > 0) remainderCents--;
    return {
      userId,
      amount: roundCurrency((baseCents + extra) / 100),
    };
  });
}

/**
 * Calculate percentage split. Validates total equals 100%.
 */
export function calculatePercentageSplit(
  totalAmount: number,
  splits: { userId: string; percentage: number }[]
): { shares: ParticipantShare[]; error?: string } {
  const totalPercentage = splits.reduce((sum, s) => sum + s.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    return {
      shares: [],
      error: `Percentages must sum to 100%. Current sum: ${totalPercentage}%`,
    };
  }

  const totalCents = Math.round(totalAmount * 100);
  let allocatedCents = 0;
  const result: ParticipantShare[] = [];

  splits.forEach((split, index) => {
    if (index === splits.length - 1) {
      // Last participant gets remaining cents to guarantee exact match
      const shareCents = totalCents - allocatedCents;
      result.push({ userId: split.userId, amount: roundCurrency(shareCents / 100) });
    } else {
      const shareCents = Math.round((totalCents * split.percentage) / 100);
      allocatedCents += shareCents;
      result.push({ userId: split.userId, amount: roundCurrency(shareCents / 100) });
    }
  });

  return { shares: result };
}

/**
 * Calculate shares-based split (e.g. Rahul 2 shares, Amit 1 share).
 */
export function calculateSharesSplit(
  totalAmount: number,
  splits: { userId: string; shares: number }[]
): { shares: ParticipantShare[]; error?: string } {
  const totalShares = splits.reduce((sum, s) => sum + s.shares, 0);
  if (totalShares <= 0) {
    return { shares: [], error: 'Total shares must be greater than 0.' };
  }

  const totalCents = Math.round(totalAmount * 100);
  let allocatedCents = 0;
  const result: ParticipantShare[] = [];

  splits.forEach((split, index) => {
    if (index === splits.length - 1) {
      const shareCents = totalCents - allocatedCents;
      result.push({ userId: split.userId, amount: roundCurrency(shareCents / 100) });
    } else {
      const shareCents = Math.round((totalCents * split.shares) / totalShares);
      allocatedCents += shareCents;
      result.push({ userId: split.userId, amount: roundCurrency(shareCents / 100) });
    }
  });

  return { shares: result };
}

/**
 * Validate exact split totals match expense amount.
 */
export function validateExactSplit(
  totalAmount: number,
  splits: { userId: string; amount: number }[]
): { valid: boolean; difference: number } {
  const sum = splits.reduce((acc, s) => acc + s.amount, 0);
  const diff = roundCurrency(totalAmount - sum);
  return {
    valid: Math.abs(diff) < 0.001,
    difference: diff,
  };
}
