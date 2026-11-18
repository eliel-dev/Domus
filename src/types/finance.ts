export enum ProfileRole {
  CASA = 'casa',
  REGULAR = 'regular',
}

export interface UserProfile {
  id: string;
  name: string;
  role: ProfileRole;
  password: string;
  avatarColor: string;
  avatarId?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  ownerId: string;
  name: string;
  color: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  note?: string;
  payerId?: string;
}

export interface InstallmentInfo {
  current: number;
  total: number;
  seriesId: string;
}

export type PaymentIndicationStatus = 'pending' | 'accepted' | 'rejected';

export interface PaymentIndication {
  id: string;
  requesterId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
  status: PaymentIndicationStatus;
  createdAt: string;
  reviewedById?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  paidAmount: number;
  payments: PaymentRecord[];
  paymentIndications?: PaymentIndication[];
  date: string; // YYYY-MM-DD
  installments: number; // 1 to 60
  installmentInfo?: InstallmentInfo;
  categoryId: string;
  creatorId: string;
  assigneeIds: string[];
  assigneeShares?: Record<string, number>;
  notes?: string;
  createdAt: string;
}

export interface AppState {
  profiles: UserProfile[];
  categories: Category[];
  expenses: Expense[];
  activeUserId: string;
  dismissedTutorials: Record<string, boolean>;
  dismissedNotices: Record<string, string[]>;
}

export interface ExpenseFormInput {
  title: string;
  amountRaw: string;
  date: string;
  installmentsRaw: string;
  categoryId: string;
  assigneeIds: string[];
  notes?: string;
  splitMode?: 'equal' | 'custom';
  assigneeShares?: Record<string, string>;
  distributeInstallments?: boolean;
  repeatMonths?: number;
  paidImmediately?: boolean;
  initialPaidRaw?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface SummaryMetrics {
  total: number;
  paid: number;
  pending: number;
  count: number;
  paidCount: number;
  pendingCount: number;
}

export type PeriodScope = 'month' | 'all';

export interface AssigneeShareBreakdown {
  userId: string;
  totalShare: number;
  paidShare: number;
  pendingShare: number;
}

export interface BilateralBalanceSummary {
  profile: UserProfile;
  iOwe: number;
  theyOweMe: number;
  netAmount: number;
  compensableAmount: number;
  totalHistoricalIOwe: number;
  totalHistoricalTheyOweMe: number;
  paidByMeToThem: number;
  paidByThemToMe: number;
  openCountIOwe: number;
  openCountTheyOweMe: number;
  expensesBetween: Expense[];
  expensesIOwe: Expense[];
  expensesTheyOweMe: Expense[];
}

