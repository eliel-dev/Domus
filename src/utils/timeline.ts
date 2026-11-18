import { Expense, PaymentRecord } from '../types/finance';
import {
  addMonthsToIsoDate,
  formatBRL,
  formatDateBR,
  roundCents,
  splitAmountEvenly,
} from './finance';

export type TimelineMilestoneKind =
  | 'partial_payment'
  | 'full_payment'
  | 'due_date';

export type TimelineMilestoneStatus =
  | 'partial'
  | 'paid'
  | 'pending'
  | 'overdue';

export interface TimelineMilestone {
  id: string;
  kind: TimelineMilestoneKind;
  status: TimelineMilestoneStatus;
  date: string;
  title: string;
  shortLabel: string;
  amount: number;
  cumulativePaid: number;
  remainingAfter: number;
  scalePercent: number; // 0..100 along financial value scale
  chronoPercent: number; // 0..100 along chronological date axis
  installmentIndex?: number;
  installmentTotal?: number;
  note?: string;
}

export interface ExpenseTimelineModel {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  progressPercent: number;
  milestones: TimelineMilestone[];
  paymentMilestones: TimelineMilestone[];
  dueMilestones: TimelineMilestone[];
  partialPaymentCount: number;
  overdueCount: number;
  nextDueDate?: string;
}

function getLocalTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function toTimestamp(isoDate: string): number {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return 0;
  }
  return Date.UTC(parts[0], parts[1] - 1, parts[2]);
}

function sortPaymentsChronologically(payments: PaymentRecord[]): PaymentRecord[] {
  return payments
    .map((p, index) => ({ p, index }))
    .sort((a, b) => {
      const cmp = a.p.date.localeCompare(b.p.date);
      return cmp !== 0 ? cmp : a.index - b.index;
    })
    .map((item) => item.p);
}

export function buildExpenseTimeline(
  expense: Expense,
  referenceDateIso: string = getLocalTodayIso()
): ExpenseTimelineModel {
  const totalAmount = Math.max(0, roundCents(expense.amount));
  const paidAmount = Math.min(totalAmount, Math.max(0, roundCents(expense.paidAmount)));
  const pendingAmount = Math.max(0, roundCents(totalAmount - paidAmount));
  const progressPercent =
    totalAmount > 0 ? Math.min(100, roundCents((paidAmount / totalAmount) * 100)) : 0;

  const sortedPayments = sortPaymentsChronologically(expense.payments || []);
  const paymentMilestones: TimelineMilestone[] = [];

  let runningPaid = 0;
  sortedPayments.forEach((payment, idx) => {
    const payAmount = Math.max(0, roundCents(payment.amount));
    runningPaid = Math.min(totalAmount, roundCents(runningPaid + payAmount));
    const remainingAfter = Math.max(0, roundCents(totalAmount - runningPaid));
    const isFull = remainingAfter <= 0.009 || runningPaid >= totalAmount;
    const scalePercent =
      totalAmount > 0
        ? Math.min(100, Math.max(0, roundCents((runningPaid / totalAmount) * 100)))
        : 0;

    paymentMilestones.push({
      id: `pay_${payment.id}`,
      kind: isFull ? 'full_payment' : 'partial_payment',
      status: isFull ? 'paid' : 'partial',
      date: payment.date,
      title: isFull
        ? 'Quitação final'
        : `Pagamento parcial #${idx + 1}`,
      shortLabel: isFull ? 'Quitado' : formatBRL(payAmount),
      amount: payAmount,
      cumulativePaid: runningPaid,
      remainingAfter,
      scalePercent,
      chronoPercent: 0,
      note: payment.note,
    });
  });

  // Fallback milestone if paidAmount > 0 was recorded without payment items
  if (paymentMilestones.length === 0 && paidAmount > 0) {
    const isFull = pendingAmount <= 0;
    paymentMilestones.push({
      id: `pay_legacy_${expense.id}`,
      kind: isFull ? 'full_payment' : 'partial_payment',
      status: isFull ? 'paid' : 'partial',
      date: expense.date,
      title: isFull ? 'Pagamento integral' : 'Pagamento parcial registrado',
      shortLabel: isFull ? 'Quitado' : formatBRL(paidAmount),
      amount: paidAmount,
      cumulativePaid: paidAmount,
      remainingAfter: pendingAmount,
      scalePercent: progressPercent,
      chronoPercent: 0,
    });
  }

  // Due-date milestones (1..installments)
  const totalInstallments = Math.max(1, Math.min(60, Math.floor(expense.installments || 1)));
  const slices = splitAmountEvenly(totalAmount, totalInstallments);
  const dueMilestones: TimelineMilestone[] = [];

  let cumulativeTarget = 0;
  let prevTarget = 0;

  for (let i = 0; i < totalInstallments; i++) {
    const sliceAmount = slices[i];
    cumulativeTarget =
      i === totalInstallments - 1
        ? totalAmount
        : roundCents(cumulativeTarget + sliceAmount);
    const dueDate = addMonthsToIsoDate(expense.date, i);
    const scalePercent =
      totalAmount > 0
        ? Math.min(100, Math.max(0, roundCents((cumulativeTarget / totalAmount) * 100)))
        : 100;

    let status: TimelineMilestoneStatus;
    if (paidAmount >= cumulativeTarget - 0.01) {
      status = 'paid';
    } else if (paidAmount > prevTarget + 0.01) {
      status = 'partial';
    } else if (dueDate < referenceDateIso) {
      status = 'overdue';
    } else {
      status = 'pending';
    }

    const labelNum =
      totalInstallments === 1
        ? expense.installmentInfo
          ? `Vencimento (${expense.installmentInfo.current}/${expense.installmentInfo.total})`
          : 'Vencimento'
        : `Parcela ${i + 1}/${totalInstallments}`;

    dueMilestones.push({
      id: `due_${expense.id}_${i + 1}`,
      kind: 'due_date',
      status,
      date: dueDate,
      title: labelNum,
      shortLabel:
        totalInstallments === 1
          ? formatDateBR(dueDate).slice(0, 5)
          : `${i + 1}/${totalInstallments} · ${formatDateBR(dueDate).slice(0, 5)}`,
      amount: sliceAmount,
      cumulativePaid: Math.min(paidAmount, cumulativeTarget),
      remainingAfter: Math.max(0, roundCents(cumulativeTarget - paidAmount)),
      scalePercent,
      chronoPercent: 0,
      installmentIndex: i + 1,
      installmentTotal: totalInstallments,
      note:
        status === 'paid'
          ? 'Parcela totalmente coberta'
          : status === 'partial'
          ? `Coberta parcialmente (${formatBRL(Math.max(0, roundCents(paidAmount - prevTarget)))} de ${formatBRL(sliceAmount)})`
          : status === 'overdue'
          ? 'Vencimento em atraso'
          : 'Vencimento futuro em aberto',
    });

    prevTarget = cumulativeTarget;
  }

  // Merge and compute chronological axis positions (0..100)
  const combined = [...paymentMilestones, ...dueMilestones].sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) return cmp;
    // Same date: payments appear right after due date or in natural order
    if (a.kind === 'due_date' && b.kind !== 'due_date') return -1;
    if (a.kind !== 'due_date' && b.kind === 'due_date') return 1;
    return a.scalePercent - b.scalePercent;
  });

  if (combined.length === 1) {
    combined[0].chronoPercent = 50;
  } else if (combined.length > 1) {
    const timestamps = combined.map((m) => toTimestamp(m.date));
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    const span = maxTs - minTs;

    combined.forEach((m, index) => {
      if (span <= 0) {
        m.chronoPercent = roundCents((index / (combined.length - 1)) * 100);
      } else {
        m.chronoPercent = roundCents(((toTimestamp(m.date) - minTs) / span) * 100);
      }
    });
  }

  const partialPaymentCount = paymentMilestones.filter(
    (m) => m.kind === 'partial_payment'
  ).length;
  const overdueCount = dueMilestones.filter((m) => m.status === 'overdue').length;
  const nextDue = dueMilestones.find(
    (m) => m.status === 'pending' || m.status === 'partial' || m.status === 'overdue'
  );

  return {
    totalAmount,
    paidAmount,
    pendingAmount,
    progressPercent,
    milestones: combined,
    paymentMilestones,
    dueMilestones,
    partialPaymentCount,
    overdueCount,
    nextDueDate: nextDue?.date,
  };
}
