import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExpenseTimeline } from './timeline';
import { Expense } from '../types/finance';

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp_1',
    title: 'Teste',
    amount: 900,
    paidAmount: 0,
    payments: [],
    date: '2026-11-10',
    installments: 3,
    categoryId: 'cat_1',
    creatorId: 'user_casa',
    assigneeIds: ['user_ana'],
    createdAt: '2026-11-10T10:00:00.000Z',
    ...overrides,
  };
}

test('buildExpenseTimeline marks partial payments in silver status and computes cumulative progress', () => {
  const expense = makeExpense({
    amount: 960,
    paidAmount: 400,
    installments: 3,
    date: '2026-11-08',
    payments: [
      {
        id: 'p1',
        amount: 250,
        date: '2026-11-08',
        note: 'Entrada Pix',
      },
      {
        id: 'p2',
        amount: 150,
        date: '2026-11-12',
        note: 'Reforço',
      },
    ],
  });

  const model = buildExpenseTimeline(expense, '2026-11-17');

  assert.equal(model.totalAmount, 960);
  assert.equal(model.paidAmount, 400);
  assert.equal(model.pendingAmount, 560);
  assert.equal(model.partialPaymentCount, 2);
  assert.equal(model.paymentMilestones.length, 2);

  assert.equal(model.paymentMilestones[0].kind, 'partial_payment');
  assert.equal(model.paymentMilestones[0].status, 'partial');
  assert.equal(model.paymentMilestones[0].cumulativePaid, 250);
  assert.equal(model.paymentMilestones[0].scalePercent, 26.04);

  assert.equal(model.paymentMilestones[1].kind, 'partial_payment');
  assert.equal(model.paymentMilestones[1].status, 'partial');
  assert.equal(model.paymentMilestones[1].cumulativePaid, 400);
  assert.equal(model.paymentMilestones[1].scalePercent, 41.67);

  // Installment due dates: 320 (paid), 640 (partial), 960 (pending)
  assert.equal(model.dueMilestones.length, 3);
  assert.equal(model.dueMilestones[0].status, 'paid');
  assert.equal(model.dueMilestones[0].date, '2026-11-08');
  assert.equal(model.dueMilestones[1].status, 'partial');
  assert.equal(model.dueMilestones[1].date, '2026-12-08');
  assert.equal(model.dueMilestones[2].status, 'pending');
  assert.equal(model.dueMilestones[2].date, '2027-01-08');
});

test('buildExpenseTimeline marks final payment as full_payment and detects overdue due dates', () => {
  const unpaidPast = makeExpense({
    amount: 300,
    paidAmount: 0,
    installments: 2,
    date: '2026-10-01',
    payments: [],
  });

  const overdueModel = buildExpenseTimeline(unpaidPast, '2026-11-17');
  assert.equal(overdueModel.overdueCount, 2);
  assert.equal(overdueModel.dueMilestones[0].status, 'overdue');
  assert.equal(overdueModel.dueMilestones[1].status, 'overdue');

  const settled = makeExpense({
    amount: 300,
    paidAmount: 300,
    installments: 2,
    date: '2026-10-01',
    payments: [
      { id: 'p1', amount: 100, date: '2026-10-05' },
      { id: 'p2', amount: 200, date: '2026-11-02' },
    ],
  });

  const settledModel = buildExpenseTimeline(settled, '2026-11-17');
  assert.equal(settledModel.partialPaymentCount, 1);
  assert.equal(settledModel.paymentMilestones[0].kind, 'partial_payment');
  assert.equal(settledModel.paymentMilestones[1].kind, 'full_payment');
  assert.equal(settledModel.paymentMilestones[1].status, 'paid');
  assert.equal(settledModel.overdueCount, 0);
  assert.equal(settledModel.nextDueDate, undefined);
});
