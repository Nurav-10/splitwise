import { roundCurrency } from './split';
export { roundCurrency };

export interface ExpenseRecord {
  id: string;
  amount: number;
  payers: { userId: string; amount: number }[];
  splits: { userId: string; amount: number }[];
}

export interface SettlementRecord {
  id: string;
  payerId: string;
  receiverId: string;
  amount: number;
}

export interface UserBalance {
  userId: string;
  totalPaid: number;
  totalShare: number;
  netBalance: number; // positive = should receive, negative = owes
}

/**
 * Calculates deterministic net balances for all members in a group
 * Formula: netBalance = (totalPaid - totalShare) - settledPaid + settledReceived
 */
export function calculateGroupBalances(
  memberIds: string[],
  expenses: ExpenseRecord[],
  settlements: SettlementRecord[] = []
): Map<string, UserBalance> {
  const balanceMap = new Map<string, UserBalance>();

  for (const id of memberIds) {
    balanceMap.set(id, {
      userId: id,
      totalPaid: 0,
      totalShare: 0,
      netBalance: 0,
    });
  }

  // Aggregate expenses
  for (const exp of expenses) {
    for (const payer of exp.payers) {
      const user = balanceMap.get(payer.userId) || {
        userId: payer.userId,
        totalPaid: 0,
        totalShare: 0,
        netBalance: 0,
      };
      user.totalPaid = roundCurrency(user.totalPaid + payer.amount);
      balanceMap.set(payer.userId, user);
    }

    for (const split of exp.splits) {
      const user = balanceMap.get(split.userId) || {
        userId: split.userId,
        totalPaid: 0,
        totalShare: 0,
        netBalance: 0,
      };
      user.totalShare = roundCurrency(user.totalShare + split.amount);
      balanceMap.set(split.userId, user);
    }
  }

  // Adjust for settlements
  for (const settlement of settlements) {
    const payer = balanceMap.get(settlement.payerId);
    if (payer) {
      payer.totalPaid = roundCurrency(payer.totalPaid + settlement.amount);
    }
    const receiver = balanceMap.get(settlement.receiverId);
    if (receiver) {
      receiver.totalShare = roundCurrency(receiver.totalShare + settlement.amount);
    }
  }

  // Compute final net balance for each member
  for (const [, b] of balanceMap) {
    b.netBalance = roundCurrency(b.totalPaid - b.totalShare);
  }

  return balanceMap;
}
