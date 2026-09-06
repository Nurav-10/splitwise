import { roundCurrency } from './split';
import { UserBalance } from './balances';

export interface SimplifiedTransaction {
  from: string; // debtor
  to: string; // creditor
  amount: number;
}

/**
 * Debt simplification algorithm (Minimizing number of transactions).
 * Takes net balances and computes the minimal set of direct settlements.
 * Algorithm: Greedy matching of largest debtor with largest creditor.
 */
export function simplifyDebts(
  balances: Map<string, UserBalance> | Record<string, number>
): SimplifiedTransaction[] {
  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  const entries: [string, number][] =
    balances instanceof Map
      ? Array.from(balances.entries()).map(([id, b]) => [id, b.netBalance])
      : Object.entries(balances);

  for (const [userId, net] of entries) {
    const rounded = roundCurrency(net);
    if (rounded < -0.009) {
      debtors.push({ userId, amount: -rounded }); // positive debt amount
    } else if (rounded > 0.009) {
      creditors.push({ userId, amount: rounded });
    }
  }

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: SimplifiedTransaction[] = [];
  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settledAmount = Math.min(debtor.amount, creditor.amount);
    const roundedSettled = roundCurrency(settledAmount);

    if (roundedSettled > 0) {
      transactions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: roundedSettled,
      });
    }

    debtor.amount = roundCurrency(debtor.amount - settledAmount);
    creditor.amount = roundCurrency(creditor.amount - settledAmount);

    if (debtor.amount <= 0.009) i++;
    if (creditor.amount <= 0.009) j++;
  }

  return transactions;
}
