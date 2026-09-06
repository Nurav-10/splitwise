import { SplitType } from '../calculations/split';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  defaultCurrency: CurrencyCode;
}

export interface ExpensePayer {
  userId: string;
  userName: string;
  amount: number;
}

export interface ExpenseSplit {
  userId: string;
  userName: string;
  amount: number;
  percentage?: number;
  shares?: number;
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  currency: CurrencyCode;
  category: string;
  date: string;
  paymentMethod: string;
  merchant?: string;
  description?: string;
  groupId?: string;
  groupName?: string;
  splitType?: SplitType;
  payers: ExpensePayer[];
  splits: ExpenseSplit[];
  receiptUrl?: string;
  isGroup: boolean;
}

export interface GroupMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export interface GroupItem {
  id: string;
  name: string;
  description?: string;
  currency: CurrencyCode;
  createdById: string;
  members: GroupMember[];
  totalSpent: number;
  userNetBalance: number; // For current logged in user
}

export interface SettlementItem {
  id: string;
  groupId?: string;
  groupName?: string;
  payerId: string;
  payerName: string;
  receiverId: string;
  receiverName: string;
  amount: number;
  currency: CurrencyCode;
  date: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  note?: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  allocatedAmount: number;
  spentAmount: number;
  currency: CurrencyCode;
  month: string;
}
