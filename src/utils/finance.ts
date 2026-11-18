import {
  AppState,
  AssigneeShareBreakdown,
  BilateralBalanceSummary,
  Category,
  Expense,
  ExpenseFormInput,
  PaymentIndication,
  PaymentRecord,
  PeriodScope,
  ProfileRole,
  SummaryMetrics,
  UserProfile,
  ValidationResult,
} from '../types/finance';

export function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatBRL(value: number): string {
  const safe = Number.isFinite(value) ? roundCents(value) : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function parseBRLInput(raw: string): number {
  if (!raw || typeof raw !== 'string') return NaN;
  const cleaned = raw
    .replace(/R\$/gi, '')
    .replace(/\s+/g, '')
    .trim();
  if (!cleaned) return NaN;

  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Brazilian format: 1.234,56
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return NaN;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? roundCents(parsed) : NaN;
}

export function formatDateBR(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function getMonthLabelPT(yearMonth: string): string {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) return yearMonth;
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const date = new Date(year, monthIndex, 1);
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function shiftYearMonth(yearMonth: string, deltaMonths: number): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1 + deltaMonths, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function addMonthsToIsoDate(isoDate: string, deltaMonths: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const day = Number(dayStr);

  const targetMonthStart = new Date(year, monthIndex + deltaMonths, 1);
  const targetYear = targetMonthStart.getFullYear();
  const targetMonth = targetMonthStart.getMonth();
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, daysInTargetMonth);

  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

export function splitAmountEvenly(total: number, parts: number): number[] {
  if (parts <= 1) return [roundCents(total)];
  const totalCents = Math.round(roundCents(total) * 100);
  const baseCents = Math.floor(totalCents / parts);
  const remainder = totalCents - baseCents * parts;
  const result: number[] = [];
  for (let i = 0; i < parts; i++) {
    const cents = baseCents + (i < remainder ? 1 : 0);
    result.push(cents / 100);
  }
  return result;
}

export function getAssignableProfiles(
  profiles: UserProfile[],
  _creator: UserProfile
): UserProfile[] {
  // Perfil "Casa" nunca atua como responsável por uma despesa
  return profiles.filter((p) => p.role !== ProfileRole.CASA);
}

export function canModifyExpense(expense: Expense, user: UserProfile): boolean {
  return expense.creatorId === user.id;
}

export function canAccessAdminFeatures(user: UserProfile): boolean {
  return user.role === ProfileRole.CASA;
}

export function getPendingAmount(expense: Expense): number {
  return Math.max(0, roundCents(expense.amount - expense.paidAmount));
}

export function isExpensePaid(expense: Expense): boolean {
  return getPendingAmount(expense) <= 0;
}

export function getPendingIndications(expense: Expense): PaymentIndication[] {
  return (expense.paymentIndications || []).filter((i) => i.status === 'pending');
}

export function getPendingIndicatedTotal(expense: Expense): number {
  return roundCents(
    getPendingIndications(expense).reduce((sum, ind) => sum + ind.amount, 0)
  );
}

export function getAvailableToIndicateAmount(expense: Expense): number {
  return Math.max(
    0,
    roundCents(getPendingAmount(expense) - getPendingIndicatedTotal(expense))
  );
}

export function canIndicatePayment(expense: Expense, user: UserProfile): boolean {
  return (
    user.role !== ProfileRole.CASA &&
    expense.creatorId !== user.id &&
    expense.assigneeIds.includes(user.id) &&
    getPendingAmount(expense) > 0
  );
}

export function validateExpenseInput(
  input: ExpenseFormInput,
  creator: UserProfile,
  allProfiles: UserProfile[]
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.title.trim()) {
    errors.title = 'Informe uma descrição para a despesa.';
  } else if (input.title.trim().length < 2) {
    errors.title = 'A descrição deve ter pelo menos 2 caracteres.';
  }

  const parsedAmount = parseBRLInput(input.amountRaw);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    errors.amount = 'Informe um valor válido maior que R$ 0,00.';
  }

  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    errors.date = 'A data de compra ou vencimento é obrigatória.';
  }

  const installmentsNum = Number(input.installmentsRaw);
  if (
    !input.installmentsRaw.trim() ||
    !Number.isInteger(installmentsNum) ||
    installmentsNum < 1 ||
    installmentsNum > 60
  ) {
    errors.installments = 'O número de parcelas deve ser um inteiro entre 1 e 60.';
  }

  if (!input.categoryId.trim()) {
    errors.categoryId = 'Selecione uma categoria para a despesa.';
  }

  if (!input.assigneeIds || input.assigneeIds.length === 0) {
    errors.assigneeIds = 'Selecione pelo menos um responsável pela despesa.';
  } else {
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));
    const hasInvalidCasa = input.assigneeIds.some((id) => {
      const target = profileMap.get(id);
      return !target || target.role === ProfileRole.CASA;
    });
    if (hasInvalidCasa) {
      errors.assigneeIds =
        'O perfil Casa não pode ser atribuído como responsável por despesas.';
    }
    if (creator.role === ProfileRole.CASA && input.assigneeIds.includes(creator.id)) {
      errors.assigneeIds =
        'O perfil Casa só pode criar despesas para outros usuários.';
    }
  }

  if (
    input.splitMode === 'custom' &&
    input.assigneeIds.length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0
  ) {
    let sumShares = 0;
    let invalidShare = false;
    for (const id of input.assigneeIds) {
      const val = parseBRLInput(input.assigneeShares?.[id] ?? '');
      if (!Number.isFinite(val) || val <= 0) {
        invalidShare = true;
        break;
      }
      sumShares = roundCents(sumShares + val);
    }
    if (invalidShare) {
      errors.assigneeShares =
        'Informe um valor válido maior que R$ 0,00 para cada responsável.';
    } else if (Math.abs(roundCents(sumShares - parsedAmount)) > 0.02) {
      errors.assigneeShares = `A soma da divisão (${formatBRL(sumShares)}) deve ser igual ao valor total (${formatBRL(parsedAmount)}).`;
    }
  }

  if (input.paidImmediately && input.initialPaidRaw !== undefined && input.initialPaidRaw.trim() !== '') {
    const initialPaid = parseBRLInput(input.initialPaidRaw);
    if (!Number.isFinite(initialPaid) || initialPaid <= 0) {
      errors.initialPaid = 'Informe um valor pago inicial maior que R$ 0,00.';
    } else if (Number.isFinite(parsedAmount) && parsedAmount > 0 && initialPaid > parsedAmount) {
      errors.initialPaid = `O valor inicial pago não pode ultrapassar ${formatBRL(parsedAmount)}.`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validatePaymentInput(
  expense: Expense,
  amountRaw: string
): { valid: boolean; amount: number; error?: string } {
  const pending = getPendingAmount(expense);
  if (pending <= 0) {
    return {
      valid: false,
      amount: 0,
      error: 'Esta despesa já está totalmente quitada.',
    };
  }

  const amount = parseBRLInput(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      valid: false,
      amount: 0,
      error: 'Informe um valor de pagamento maior que R$ 0,00.',
    };
  }

  if (amount > pending) {
    return {
      valid: false,
      amount: 0,
      error: `O valor informado (${formatBRL(amount)}) excede o saldo pendente de ${formatBRL(pending)}.`,
    };
  }

  return { valid: true, amount };
}

export function validatePaymentIndicationInput(
  expense: Expense,
  amountRaw: string
): { valid: boolean; amount: number; error?: string } {
  const pending = getPendingAmount(expense);
  if (pending <= 0) {
    return {
      valid: false,
      amount: 0,
      error: 'Esta despesa já está totalmente quitada.',
    };
  }

  const available = getAvailableToIndicateAmount(expense);
  if (available <= 0) {
    return {
      valid: false,
      amount: 0,
      error: 'Já existem indicações pendentes cobrindo todo o saldo em aberto.',
    };
  }

  const amount = parseBRLInput(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      valid: false,
      amount: 0,
      error: 'Informe um valor de pagamento maior que R$ 0,00.',
    };
  }

  if (amount > available) {
    const pendingIndicated = getPendingIndicatedTotal(expense);
    return {
      valid: false,
      amount: 0,
      error:
        pendingIndicated > 0
          ? `O valor (${formatBRL(amount)}) excede o saldo livre para indicação (${formatBRL(available)}), pois ${formatBRL(pendingIndicated)} já aguarda aceite.`
          : `O valor informado (${formatBRL(amount)}) excede o saldo pendente de ${formatBRL(pending)}.`,
    };
  }

  return { valid: true, amount };
}

export function filterExpensesByMonth(
  expenses: Expense[],
  yearMonth: string
): Expense[] {
  return expenses.filter((e) => e.date.startsWith(yearMonth));
}

export function computeSummaryMetrics(expenses: Expense[]): SummaryMetrics {
  let total = 0;
  let paid = 0;
  let pending = 0;
  let paidCount = 0;
  let pendingCount = 0;

  for (const exp of expenses) {
    const expTotal = roundCents(exp.amount);
    const expPaid = Math.min(expTotal, roundCents(exp.paidAmount));
    const expPending = Math.max(0, roundCents(expTotal - expPaid));

    total = roundCents(total + expTotal);
    paid = roundCents(paid + expPaid);
    pending = roundCents(pending + expPending);

    if (expPending <= 0) {
      paidCount += 1;
    } else {
      pendingCount += 1;
    }
  }

  return {
    total,
    paid,
    pending,
    count: expenses.length,
    paidCount,
    pendingCount,
  };
}

export function getVisibleExpensesForUser(
  expenses: Expense[],
  user: UserProfile
): Expense[] {
  if (user.role === ProfileRole.CASA) {
    return expenses;
  }
  return expenses.filter(
    (e) => e.creatorId === user.id || e.assigneeIds.includes(user.id)
  );
}

export function getHomeSectionsForUser(
  monthExpenses: Expense[],
  user: UserProfile
): {
  allExpenses: Expense[];
  casaExpenses: Expense[];
  myExpenses: Expense[];
  owedToMeExpenses: Expense[];
  iOweOthersExpenses: Expense[];
} {
  if (user.role === ProfileRole.CASA) {
    const casaExpenses = monthExpenses.filter((e) => e.creatorId === user.id);
    return {
      allExpenses: monthExpenses,
      casaExpenses,
      myExpenses: [],
      owedToMeExpenses: [],
      iOweOthersExpenses: [],
    };
  }

  // Regular user:
  // "Minhas Despesas": atribuídas a mim (criadas por mim para mim ou por outros para mim)
  const myExpenses = monthExpenses.filter((e) => e.assigneeIds.includes(user.id));
  // "Me deve": criadas por mim e atribuídas a terceiros (outros perfis que não sejam somente eu)
  const owedToMeExpenses = monthExpenses.filter(
    (e) =>
      e.creatorId === user.id &&
      e.assigneeIds.some((assigneeId) => assigneeId !== user.id)
  );
  // "Devo a Outros": criadas por outros perfis e atribuídas a mim
  const iOweOthersExpenses = monthExpenses.filter(
    (e) => e.creatorId !== user.id && e.assigneeIds.includes(user.id)
  );

  return {
    allExpenses: monthExpenses,
    casaExpenses: [],
    myExpenses,
    owedToMeExpenses,
    iOweOthersExpenses,
  };
}

function resolveAssigneeShares(
  input: ExpenseFormInput,
  targetAmount: number,
  originalTotal: number
): Record<string, number> | undefined {
  if (input.splitMode !== 'custom' || !input.assigneeShares || input.assigneeIds.length === 0) {
    return undefined;
  }
  const uniqueIds = [...new Set(input.assigneeIds)];
  const ratio = originalTotal > 0 ? targetAmount / originalTotal : 1;
  const shares: Record<string, number> = {};
  let running = 0;

  uniqueIds.forEach((id, idx) => {
    const rawVal = parseBRLInput(input.assigneeShares?.[id] ?? '0');
    if (idx === uniqueIds.length - 1) {
      shares[id] = Math.max(0, roundCents(targetAmount - running));
    } else {
      const scaled = roundCents(rawVal * ratio);
      shares[id] = scaled;
      running = roundCents(running + scaled);
    }
  });

  return shares;
}

export function addExpenseToState(
  state: AppState,
  creatorId: string,
  input: ExpenseFormInput
):
  | { ok: true; state: AppState; expense: Expense; createdExpenses: Expense[] }
  | { ok: false; errors: Record<string, string> } {
  const creator = state.profiles.find((p) => p.id === creatorId);
  if (!creator) {
    return { ok: false, errors: { form: 'Usuário criador não encontrado.' } };
  }

  const validation = validateExpenseInput(input, creator, state.profiles);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  const amount = parseBRLInput(input.amountRaw);
  const installments = Number(input.installmentsRaw);
  const uniqueAssignees = [...new Set(input.assigneeIds)];
  const nowIso = new Date().toISOString();
  const baseStamp = Date.now();

  const shouldDistribute = Boolean(input.distributeInstallments && installments > 1);
  const repeatCount =
    installments === 1 && input.repeatMonths && input.repeatMonths > 1
      ? Math.min(12, Math.max(1, Math.floor(input.repeatMonths)))
      : 1;

  const createdExpenses: Expense[] = [];

  if (shouldDistribute) {
    const slices = splitAmountEvenly(amount, installments);
    const seriesId = `ser_${baseStamp}_${Math.random().toString(36).slice(2, 6)}`;

    for (let i = 0; i < installments; i++) {
      const sliceAmount = slices[i];
      const sliceDate = addMonthsToIsoDate(input.date, i);
      const paidAmount =
        input.paidImmediately && i === 0 && !input.initialPaidRaw?.trim()
          ? sliceAmount
          : input.paidImmediately && i === 0 && input.initialPaidRaw?.trim()
          ? Math.min(sliceAmount, parseBRLInput(input.initialPaidRaw))
          : 0;

      createdExpenses.push({
        id: `exp_${baseStamp}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        title: `${input.title.trim()} (${i + 1}/${installments})`,
        amount: sliceAmount,
        paidAmount,
        payments:
          paidAmount > 0
            ? [
                {
                  id: `pay_${baseStamp}_${i}`,
                  amount: paidAmount,
                  date: sliceDate,
                  note:
                    paidAmount >= sliceAmount
                      ? 'Quitado no lançamento'
                      : 'Pagamento inicial',
                },
              ]
            : [],
        date: sliceDate,
        installments: 1,
        installmentInfo: {
          current: i + 1,
          total: installments,
          seriesId,
        },
        categoryId: input.categoryId,
        creatorId,
        assigneeIds: uniqueAssignees,
        assigneeShares: resolveAssigneeShares(input, sliceAmount, amount),
        notes: input.notes?.trim() || undefined,
        createdAt: nowIso,
      });
    }
  } else if (repeatCount > 1) {
    const seriesId = `rec_${baseStamp}_${Math.random().toString(36).slice(2, 6)}`;
    for (let i = 0; i < repeatCount; i++) {
      const itemDate = addMonthsToIsoDate(input.date, i);
      const paidAmount =
        input.paidImmediately && i === 0
          ? input.initialPaidRaw?.trim()
            ? Math.min(amount, parseBRLInput(input.initialPaidRaw))
            : amount
          : 0;

      createdExpenses.push({
        id: `exp_${baseStamp}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        title: input.title.trim(),
        amount,
        paidAmount,
        payments:
          paidAmount > 0
            ? [
                {
                  id: `pay_${baseStamp}_${i}`,
                  amount: paidAmount,
                  date: itemDate,
                  note:
                    paidAmount >= amount
                      ? 'Quitado no lançamento'
                      : 'Pagamento inicial',
                },
              ]
            : [],
        date: itemDate,
        installments: 1,
        installmentInfo: {
          current: i + 1,
          total: repeatCount,
          seriesId,
        },
        categoryId: input.categoryId,
        creatorId,
        assigneeIds: uniqueAssignees,
        assigneeShares: resolveAssigneeShares(input, amount, amount),
        notes: input.notes?.trim() || undefined,
        createdAt: nowIso,
      });
    }
  } else {
    const paidAmount = input.paidImmediately
      ? input.initialPaidRaw?.trim()
        ? Math.min(amount, parseBRLInput(input.initialPaidRaw))
        : amount
      : 0;

    createdExpenses.push({
      id: `exp_${baseStamp}_${Math.random().toString(36).slice(2, 7)}`,
      title: input.title.trim(),
      amount,
      paidAmount,
      payments:
        paidAmount > 0
          ? [
              {
                id: `pay_${baseStamp}`,
                amount: paidAmount,
                date: input.date,
                note:
                  paidAmount >= amount
                    ? 'Quitado no lançamento'
                    : 'Pagamento inicial',
              },
            ]
          : [],
      date: input.date,
      installments,
      categoryId: input.categoryId,
      creatorId,
      assigneeIds: uniqueAssignees,
      assigneeShares: resolveAssigneeShares(input, amount, amount),
      notes: input.notes?.trim() || undefined,
      createdAt: nowIso,
    });
  }

  return {
    ok: true,
    expense: createdExpenses[0],
    createdExpenses,
    state: {
      ...state,
      expenses: [...createdExpenses, ...state.expenses],
    },
  };
}

export function updateExpenseInState(
  state: AppState,
  actorId: string,
  expenseId: string,
  input: ExpenseFormInput
): { ok: true; state: AppState } | { ok: false; errors: Record<string, string> } {
  const actor = state.profiles.find((p) => p.id === actorId);
  const existing = state.expenses.find((e) => e.id === expenseId);

  if (!actor || !existing) {
    return { ok: false, errors: { form: 'Despesa ou usuário não encontrado.' } };
  }

  if (!canModifyExpense(existing, actor)) {
    return {
      ok: false,
      errors: { form: 'Apenas o criador da despesa pode editá-la.' },
    };
  }

  const validation = validateExpenseInput(input, actor, state.profiles);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  const newAmount = parseBRLInput(input.amountRaw);
  if (newAmount < existing.paidAmount) {
    return {
      ok: false,
      errors: {
        amount: `O valor total não pode ser menor que o valor já pago (${formatBRL(existing.paidAmount)}).`,
      },
    };
  }

  const updated: Expense = {
    ...existing,
    title: input.title.trim(),
    amount: newAmount,
    date: input.date,
    installments: Number(input.installmentsRaw),
    categoryId: input.categoryId,
    assigneeIds: [...new Set(input.assigneeIds)],
    assigneeShares: resolveAssigneeShares(input, newAmount, newAmount),
    notes: input.notes?.trim() || undefined,
  };

  return {
    ok: true,
    state: {
      ...state,
      expenses: state.expenses.map((e) => (e.id === expenseId ? updated : e)),
    },
  };
}

export function deleteExpenseFromState(
  state: AppState,
  actorId: string,
  expenseId: string
): { ok: true; state: AppState } | { ok: false; error: string } {
  const actor = state.profiles.find((p) => p.id === actorId);
  const existing = state.expenses.find((e) => e.id === expenseId);

  if (!actor || !existing) {
    return { ok: false, error: 'Despesa não encontrada.' };
  }

  if (!canModifyExpense(existing, actor)) {
    return {
      ok: false,
      error: 'Apenas o criador da despesa pode excluí-la.',
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      expenses: state.expenses.filter((e) => e.id !== expenseId),
    },
  };
}

export function registerPaymentInState(
  state: AppState,
  actorId: string,
  expenseId: string,
  amountRaw: string,
  paymentDate: string,
  note?: string
): { ok: true; state: AppState } | { ok: false; error: string } {
  const actor = state.profiles.find((p) => p.id === actorId);
  const existing = state.expenses.find((e) => e.id === expenseId);

  if (!actor || !existing) {
    return { ok: false, error: 'Despesa ou usuário não encontrado.' };
  }

  if (!canModifyExpense(existing, actor)) {
    return {
      ok: false,
      error: 'Apenas o criador da despesa pode registrar pagamentos ou marcá-la como paga.',
    };
  }

  const check = validatePaymentInput(existing, amountRaw);
  if (!check.valid) {
    return { ok: false, error: check.error || 'Valor de pagamento inválido.' };
  }

  const record: PaymentRecord = {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    amount: check.amount,
    date: paymentDate,
    note: note?.trim() || undefined,
  };

  const nextPaidAmount = Math.min(
    existing.amount,
    roundCents(existing.paidAmount + check.amount)
  );
  const remainingAfter = Math.max(0, roundCents(existing.amount - nextPaidAmount));
  const nowIso = new Date().toISOString();

  return {
    ok: true,
    state: {
      ...state,
      expenses: state.expenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              paidAmount: nextPaidAmount,
              payments: [...e.payments, record],
              paymentIndications:
                remainingAfter <= 0 && e.paymentIndications
                  ? e.paymentIndications.map((ind) =>
                      ind.status === 'pending'
                        ? {
                            ...ind,
                            status: 'rejected',
                            reviewedById: actorId,
                            reviewedAt: nowIso,
                            rejectionReason: 'Saldo já quitado diretamente.',
                          }
                        : ind
                    )
                  : e.paymentIndications,
            }
          : e
      ),
    },
  };
}

export function createPaymentIndicationInState(
  state: AppState,
  actorId: string,
  expenseId: string,
  amountRaw: string,
  paymentDate: string,
  note?: string
): { ok: true; state: AppState; indication: PaymentIndication } | { ok: false; error: string } {
  const actor = state.profiles.find((p) => p.id === actorId);
  const existing = state.expenses.find((e) => e.id === expenseId);

  if (!actor || !existing) {
    return { ok: false, error: 'Despesa ou usuário não encontrado.' };
  }

  if (!canIndicatePayment(existing, actor)) {
    return {
      ok: false,
      error: 'Apenas responsáveis atribuídos podem enviar indicações de pagamento nesta conta.',
    };
  }

  const check = validatePaymentIndicationInput(existing, amountRaw);
  if (!check.valid) {
    return { ok: false, error: check.error || 'Valor de indicação inválido.' };
  }

  const indication: PaymentIndication = {
    id: `ind_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    requesterId: actorId,
    amount: check.amount,
    date: paymentDate,
    note: note?.trim() || undefined,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true,
    indication,
    state: {
      ...state,
      expenses: state.expenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              paymentIndications: [...(e.paymentIndications || []), indication],
            }
          : e
      ),
    },
  };
}

export function cancelPaymentIndicationInState(
  state: AppState,
  actorId: string,
  expenseId: string,
  indicationId: string
): { ok: true; state: AppState } | { ok: false; error: string } {
  const existing = state.expenses.find((e) => e.id === expenseId);
  if (!existing) {
    return { ok: false, error: 'Despesa não encontrada.' };
  }

  const target = (existing.paymentIndications || []).find(
    (i) => i.id === indicationId
  );
  if (!target) {
    return { ok: false, error: 'Indicação de pagamento não encontrada.' };
  }
  if (target.requesterId !== actorId) {
    return { ok: false, error: 'Você só pode cancelar suas próprias indicações.' };
  }
  if (target.status !== 'pending') {
    return { ok: false, error: 'Esta indicação já foi analisada.' };
  }

  return {
    ok: true,
    state: {
      ...state,
      expenses: state.expenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              paymentIndications: (e.paymentIndications || []).filter(
                (i) => i.id !== indicationId
              ),
            }
          : e
      ),
    },
  };
}

export function acceptPaymentIndicationInState(
  state: AppState,
  actorId: string,
  expenseId: string,
  indicationId: string
): { ok: true; state: AppState } | { ok: false; error: string } {
  const actor = state.profiles.find((p) => p.id === actorId);
  const existing = state.expenses.find((e) => e.id === expenseId);

  if (!actor || !existing) {
    return { ok: false, error: 'Despesa ou usuário não encontrado.' };
  }

  if (!canModifyExpense(existing, actor)) {
    return {
      ok: false,
      error: 'Apenas o criador da despesa pode aceitar indicações de pagamento.',
    };
  }

  const target = (existing.paymentIndications || []).find(
    (i) => i.id === indicationId
  );
  if (!target) {
    return { ok: false, error: 'Indicação de pagamento não encontrada.' };
  }
  if (target.status !== 'pending') {
    return { ok: false, error: 'Esta indicação já foi analisada.' };
  }

  const pending = getPendingAmount(existing);
  if (pending <= 0) {
    return { ok: false, error: 'Esta despesa já está totalmente quitada.' };
  }
  if (target.amount > pending) {
    return {
      ok: false,
      error: `O valor indicado (${formatBRL(target.amount)}) excede o saldo em aberto atual (${formatBRL(pending)}).`,
    };
  }

  const requester = state.profiles.find((p) => p.id === target.requesterId);
  const requesterName = requester ? requester.name : 'Membro';
  const noteParts = [target.note, `Indicado por ${requesterName}`].filter(Boolean);

  const record: PaymentRecord = {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    amount: target.amount,
    date: target.date,
    note: noteParts.join(' · '),
    payerId: target.requesterId,
  };

  const nextPaidAmount = Math.min(
    existing.amount,
    roundCents(existing.paidAmount + target.amount)
  );
  const remainingAfter = Math.max(0, roundCents(existing.amount - nextPaidAmount));
  const nowIso = new Date().toISOString();

  return {
    ok: true,
    state: {
      ...state,
      expenses: state.expenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              paidAmount: nextPaidAmount,
              payments: [...e.payments, record],
              paymentIndications: (e.paymentIndications || []).map((ind) => {
                if (ind.id === indicationId) {
                  return {
                    ...ind,
                    status: 'accepted',
                    reviewedById: actorId,
                    reviewedAt: nowIso,
                  };
                }
                if (remainingAfter <= 0 && ind.status === 'pending') {
                  return {
                    ...ind,
                    status: 'rejected',
                    reviewedById: actorId,
                    reviewedAt: nowIso,
                    rejectionReason: 'Saldo já quitado anteriormente.',
                  };
                }
                return ind;
              }),
            }
          : e
      ),
    },
  };
}

export function rejectPaymentIndicationInState(
  state: AppState,
  actorId: string,
  expenseId: string,
  indicationId: string,
  reason?: string
): { ok: true; state: AppState } | { ok: false; error: string } {
  const actor = state.profiles.find((p) => p.id === actorId);
  const existing = state.expenses.find((e) => e.id === expenseId);

  if (!actor || !existing) {
    return { ok: false, error: 'Despesa ou usuário não encontrado.' };
  }

  if (!canModifyExpense(existing, actor)) {
    return {
      ok: false,
      error: 'Apenas o criador da despesa pode recusar indicações de pagamento.',
    };
  }

  const target = (existing.paymentIndications || []).find(
    (i) => i.id === indicationId
  );
  if (!target) {
    return { ok: false, error: 'Indicação de pagamento não encontrada.' };
  }
  if (target.status !== 'pending') {
    return { ok: false, error: 'Esta indicação já foi analisada.' };
  }

  const nowIso = new Date().toISOString();

  return {
    ok: true,
    state: {
      ...state,
      expenses: state.expenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              paymentIndications: (e.paymentIndications || []).map((ind) =>
                ind.id === indicationId
                  ? {
                      ...ind,
                      status: 'rejected',
                      reviewedById: actorId,
                      reviewedAt: nowIso,
                      rejectionReason: reason?.trim() || undefined,
                    }
                  : ind
              ),
            }
          : e
      ),
    },
  };
}

export function cascadeDeleteProfile(
  state: AppState,
  actorId: string,
  targetProfileId: string
): { ok: true; state: AppState; removedExpensesCount: number } | { ok: false; error: string } {
  const actor = state.profiles.find((p) => p.id === actorId);
  const target = state.profiles.find((p) => p.id === targetProfileId);

  if (!actor || !canAccessAdminFeatures(actor)) {
    return {
      ok: false,
      error: 'Apenas o perfil Casa (Administrador) pode excluir usuários.',
    };
  }

  if (!target) {
    return { ok: false, error: 'Perfil não encontrado.' };
  }

  if (target.role === ProfileRole.CASA) {
    return {
      ok: false,
      error: 'O perfil Casa é administrativo e não pode ser excluído.',
    };
  }

  const initialCount = state.expenses.length;

  // 1. Remove despesas criadas pelo usuário excluído
  // 2. Remove o usuário da lista de responsáveis e eventuais indicações pendentes dele; se ficar sem responsáveis, remove a despesa órfã
  const nextExpenses = state.expenses
    .filter((exp) => exp.creatorId !== targetProfileId)
    .map((exp) => ({
      ...exp,
      assigneeIds: exp.assigneeIds.filter((id) => id !== targetProfileId),
      paymentIndications: exp.paymentIndications?.filter(
        (ind) => ind.requesterId !== targetProfileId
      ),
    }))
    .filter((exp) => exp.assigneeIds.length > 0);

  const nextCategories = state.categories.filter(
    (cat) => cat.ownerId !== targetProfileId
  );

  const nextProfiles = state.profiles.filter((p) => p.id !== targetProfileId);

  const nextDismissedTutorials = { ...state.dismissedTutorials };
  delete nextDismissedTutorials[targetProfileId];

  const nextDismissedNotices = { ...state.dismissedNotices };
  delete nextDismissedNotices[targetProfileId];

  const nextActiveUserId =
    state.activeUserId === targetProfileId ? actor.id : state.activeUserId;

  return {
    ok: true,
    removedExpensesCount: initialCount - nextExpenses.length,
    state: {
      ...state,
      profiles: nextProfiles,
      categories: nextCategories,
      expenses: nextExpenses,
      activeUserId: nextActiveUserId,
      dismissedTutorials: nextDismissedTutorials,
      dismissedNotices: nextDismissedNotices,
    },
  };
}

export interface MonthlyReportRow {
  month: string;
  label: string;
  total: number;
  paid: number;
  pending: number;
  count: number;
}

export interface CategoryReportRow {
  categoryId: string;
  categoryName: string;
  color: string;
  total: number;
  paid: number;
  pending: number;
  count: number;
  percentage: number;
}

export interface ProfileReportRow {
  profileId: string;
  profileName: string;
  avatarColor: string;
  total: number;
  paid: number;
  pending: number;
  count: number;
}

export function computeUserReports(
  expenses: Expense[],
  categories: Category[],
  profiles: UserProfile[],
  creatorId: string,
  selectedMonth?: string
): {
  byMonth: MonthlyReportRow[];
  byCategory: CategoryReportRow[];
  byProfile: ProfileReportRow[];
  overallSummary: SummaryMetrics;
} {
  // Relatórios filtram estritamente despesas criadas pelo usuário logado
  const userCreated = expenses.filter((e) => e.creatorId === creatorId);

  const monthBuckets = new Map<string, Expense[]>();
  for (const exp of userCreated) {
    const ym = exp.date.slice(0, 7);
    const list = monthBuckets.get(ym) || [];
    list.push(exp);
    monthBuckets.set(ym, list);
  }

  const byMonth: MonthlyReportRow[] = Array.from(monthBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, list]) => {
      const m = computeSummaryMetrics(list);
      return {
        month,
        label: getMonthLabelPT(month),
        ...m,
      };
    });

  const scoped = selectedMonth
    ? filterExpensesByMonth(userCreated, selectedMonth)
    : userCreated;

  const overallSummary = computeSummaryMetrics(scoped);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const catTotals = new Map<string, Expense[]>();
  for (const exp of scoped) {
    const list = catTotals.get(exp.categoryId) || [];
    list.push(exp);
    catTotals.set(exp.categoryId, list);
  }

  const byCategory: CategoryReportRow[] = Array.from(catTotals.entries())
    .map(([categoryId, list]) => {
      const cat = categoryMap.get(categoryId);
      const metrics = computeSummaryMetrics(list);
      return {
        categoryId,
        categoryName: cat ? cat.name : 'Sem categoria',
        color: cat ? cat.color : '#64748B',
        total: metrics.total,
        paid: metrics.paid,
        pending: metrics.pending,
        count: metrics.count,
        percentage:
          overallSummary.total > 0
            ? roundCents((metrics.total / overallSummary.total) * 100)
            : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const profTotals = new Map<
    string,
    { total: number; paid: number; pending: number; count: number }
  >();

  for (const exp of scoped) {
    const shareCount = Math.max(1, exp.assigneeIds.length);
    const shareTotal = roundCents(exp.amount / shareCount);
    const sharePaid = roundCents(Math.min(exp.amount, exp.paidAmount) / shareCount);
    const sharePending = Math.max(0, roundCents(shareTotal - sharePaid));

    for (const assigneeId of exp.assigneeIds) {
      const curr = profTotals.get(assigneeId) || {
        total: 0,
        paid: 0,
        pending: 0,
        count: 0,
      };
      profTotals.set(assigneeId, {
        total: roundCents(curr.total + shareTotal),
        paid: roundCents(curr.paid + sharePaid),
        pending: roundCents(curr.pending + sharePending),
        count: curr.count + 1,
      });
    }
  }

  const byProfile: ProfileReportRow[] = Array.from(profTotals.entries())
    .map(([profileId, data]) => {
      const prof = profileMap.get(profileId);
      return {
        profileId,
        profileName: prof ? prof.name : 'Usuário removido',
        avatarColor: prof ? prof.avatarColor : '#475569',
        ...data,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    byMonth,
    byCategory,
    byProfile,
    overallSummary,
  };
}

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getExpenseAssigneeBreakdown(
  expense: Expense
): AssigneeShareBreakdown[] {
  const assignees = expense.assigneeIds;
  if (assignees.length === 0) return [];

  const totalAmount = Math.max(0, roundCents(expense.amount));
  const totalCents = Math.round(totalAmount * 100);

  let totalShares: number[];
  const customMap = expense.assigneeShares;
  const hasAllCustom =
    customMap &&
    assignees.every(
      (id) => typeof customMap[id] === 'number' && Number.isFinite(customMap[id]) && customMap[id] >= 0
    );

  if (hasAllCustom && customMap) {
    const rawValues = assignees.map((id) => roundCents(customMap[id]));
    const rawSum = roundCents(rawValues.reduce((s, v) => s + v, 0));
    if (Math.abs(rawSum - totalAmount) <= 0.02) {
      totalShares = [...rawValues];
      const diff = roundCents(totalAmount - rawSum);
      if (diff !== 0 && totalShares.length > 0) {
        const lastIdx = totalShares.length - 1;
        totalShares[lastIdx] = Math.max(0, roundCents(totalShares[lastIdx] + diff));
      }
    } else if (rawSum > 0) {
      const ratio = totalAmount / rawSum;
      let running = 0;
      totalShares = rawValues.map((val, idx) => {
        if (idx === rawValues.length - 1) {
          return Math.max(0, roundCents(totalAmount - running));
        }
        const scaled = roundCents(val * ratio);
        running = roundCents(running + scaled);
        return scaled;
      });
    } else {
      totalShares = splitAmountEvenly(totalAmount, assignees.length);
    }
  } else {
    totalShares = splitAmountEvenly(totalAmount, assignees.length);
  }

  const totalPaid = Math.max(0, Math.min(totalAmount, roundCents(expense.paidAmount)));
  const totalPaidCents = Math.min(totalCents, Math.round(totalPaid * 100));
  const totalShareCents = totalShares.map((s) => Math.round(s * 100));
  const paidCents = new Array<number>(assignees.length).fill(0);

  let attributedCentsSum = 0;
  for (const payment of expense.payments || []) {
    if (!payment.payerId) continue;
    const idx = assignees.indexOf(payment.payerId);
    if (idx === -1) continue;
    const room = Math.max(0, totalShareCents[idx] - paidCents[idx]);
    const pCents = Math.max(0, Math.round(roundCents(payment.amount) * 100));
    const remainingBudget = Math.max(0, totalPaidCents - attributedCentsSum);
    const apply = Math.min(room, pCents, remainingBudget);
    paidCents[idx] += apply;
    attributedCentsSum += apply;
  }

  const unattributedCents = Math.max(0, totalPaidCents - attributedCentsSum);
  if (unattributedCents > 0) {
    const remainingCentsByIdx = totalShareCents.map((sc, i) =>
      Math.max(0, sc - paidCents[i])
    );
    const totalRemainingCents = remainingCentsByIdx.reduce((s, v) => s + v, 0);

    if (totalRemainingCents > 0) {
      const targetAlloc = Math.min(unattributedCents, totalRemainingCents);
      const exacts = remainingCentsByIdx.map(
        (rem) => (targetAlloc * rem) / totalRemainingCents
      );
      const floors = exacts.map((ex, i) =>
        Math.min(remainingCentsByIdx[i], Math.floor(ex))
      );
      let leftover = targetAlloc - floors.reduce((s, v) => s + v, 0);

      if (leftover > 0) {
        const order = assignees
          .map((_, i) => ({
            i,
            frac: floors[i] < remainingCentsByIdx[i] ? exacts[i] - floors[i] : -1,
          }))
          .sort((a, b) => b.frac - a.frac || a.i - b.i);

        for (const item of order) {
          if (leftover <= 0) break;
          if (floors[item.i] < remainingCentsByIdx[item.i]) {
            floors[item.i] += 1;
            leftover -= 1;
          }
        }
      }

      for (let i = 0; i < assignees.length; i++) {
        paidCents[i] += floors[i];
      }
    }
  }

  return assignees.map((userId, i) => {
    const tShare = totalShareCents[i] / 100;
    const pShare = paidCents[i] / 100;
    const remShare = Math.max(0, (totalShareCents[i] - paidCents[i]) / 100);
    return {
      userId,
      totalShare: roundCents(tShare),
      paidShare: roundCents(pShare),
      pendingShare: roundCents(remShare),
    };
  });
}

export function getMemberShareForExpense(
  expense: Expense,
  memberId: string
): AssigneeShareBreakdown | null {
  return (
    getExpenseAssigneeBreakdown(expense).find((b) => b.userId === memberId) || null
  );
}

export function computeMemberStatsForCasa(
  expenses: Expense[],
  memberId: string
): SummaryMetrics {
  let total = 0;
  let paid = 0;
  let pending = 0;
  let count = 0;
  let paidCount = 0;
  let pendingCount = 0;

  for (const exp of expenses) {
    const share = getMemberShareForExpense(exp, memberId);
    if (!share) continue;
    count += 1;
    total = roundCents(total + share.totalShare);
    paid = roundCents(paid + share.paidShare);
    pending = roundCents(pending + share.pendingShare);
    if (share.pendingShare <= 0) {
      paidCount += 1;
    } else {
      pendingCount += 1;
    }
  }

  return {
    total,
    paid,
    pending,
    count,
    paidCount,
    pendingCount,
  };
}

export function computeBilateralBalances(
  expenses: Expense[],
  currentUserId: string,
  profiles: UserProfile[]
): BilateralBalanceSummary[] {
  const others = profiles.filter((p) => p.id !== currentUserId);

  const summaries: BilateralBalanceSummary[] = others.map((other) => {
    let iOwe = 0;
    let theyOweMe = 0;
    let totalHistoricalIOwe = 0;
    let totalHistoricalTheyOweMe = 0;
    let paidByMeToThem = 0;
    let paidByThemToMe = 0;
    let openCountIOwe = 0;
    let openCountTheyOweMe = 0;
    const expensesIOwe: Expense[] = [];
    const expensesTheyOweMe: Expense[] = [];
    const betweenIds = new Set<string>();
    const expensesBetween: Expense[] = [];

    for (const exp of expenses) {
      const iOweOnExp =
        exp.creatorId === other.id && exp.assigneeIds.includes(currentUserId);
      const theyOweOnExp =
        exp.creatorId === currentUserId && exp.assigneeIds.includes(other.id);

      if (!iOweOnExp && !theyOweOnExp) continue;

      if (iOweOnExp) {
        const myShare = getMemberShareForExpense(exp, currentUserId);
        if (myShare) {
          iOwe = roundCents(iOwe + myShare.pendingShare);
          totalHistoricalIOwe = roundCents(
            totalHistoricalIOwe + myShare.totalShare
          );
          paidByMeToThem = roundCents(paidByMeToThem + myShare.paidShare);
          if (myShare.pendingShare > 0) openCountIOwe += 1;
        }
        expensesIOwe.push(exp);
      }

      if (theyOweOnExp) {
        const otherShare = getMemberShareForExpense(exp, other.id);
        if (otherShare) {
          theyOweMe = roundCents(theyOweMe + otherShare.pendingShare);
          totalHistoricalTheyOweMe = roundCents(
            totalHistoricalTheyOweMe + otherShare.totalShare
          );
          paidByThemToMe = roundCents(paidByThemToMe + otherShare.paidShare);
          if (otherShare.pendingShare > 0) openCountTheyOweMe += 1;
        }
        expensesTheyOweMe.push(exp);
      }

      if (!betweenIds.has(exp.id)) {
        betweenIds.add(exp.id);
        expensesBetween.push(exp);
      }
    }

    expensesBetween.sort((a, b) => b.date.localeCompare(a.date));
    expensesIOwe.sort((a, b) => b.date.localeCompare(a.date));
    expensesTheyOweMe.sort((a, b) => b.date.localeCompare(a.date));

    const netAmount = roundCents(theyOweMe - iOwe);
    const compensableAmount = roundCents(Math.min(iOwe, theyOweMe));

    return {
      profile: other,
      iOwe,
      theyOweMe,
      netAmount,
      compensableAmount,
      totalHistoricalIOwe,
      totalHistoricalTheyOweMe,
      paidByMeToThem,
      paidByThemToMe,
      openCountIOwe,
      openCountTheyOweMe,
      expensesBetween,
      expensesIOwe,
      expensesTheyOweMe,
    };
  });

  // Casa primeiro; demais membros ordenados por relevância (compensável ou maior saldo líquido) e nome
  return summaries.sort((a, b) => {
    const aIsCasa = a.profile.role === ProfileRole.CASA ? 0 : 1;
    const bIsCasa = b.profile.role === ProfileRole.CASA ? 0 : 1;
    if (aIsCasa !== bIsCasa) return aIsCasa - bIsCasa;

    const aComp = a.compensableAmount > 0 ? 0 : 1;
    const bComp = b.compensableAmount > 0 ? 0 : 1;
    if (aComp !== bComp) return aComp - bComp;

    const diffNet = Math.abs(b.netAmount) - Math.abs(a.netAmount);
    if (Math.abs(diffNet) > 0.009) return diffNet;

    const diffHist =
      b.totalHistoricalIOwe +
      b.totalHistoricalTheyOweMe -
      (a.totalHistoricalIOwe + a.totalHistoricalTheyOweMe);
    if (Math.abs(diffHist) > 0.009) return diffHist;

    return a.profile.name.localeCompare(b.profile.name, 'pt-BR');
  });
}

export function compensateBilateralBalanceInState(
  state: AppState,
  actorId: string,
  otherProfileId: string,
  scope: PeriodScope,
  selectedMonth?: string
):
  | {
      ok: true;
      state: AppState;
      compensatedAmount: number;
      settledCount: number;
    }
  | { ok: false; error: string } {
  const actor = state.profiles.find((p) => p.id === actorId);
  const other = state.profiles.find((p) => p.id === otherProfileId);

  if (!actor || !other || actor.id === other.id) {
    return { ok: false, error: 'Perfis inválidos para compensação.' };
  }

  if (actor.role === ProfileRole.CASA || other.role === ProfileRole.CASA) {
    return {
      ok: false,
      error: 'Apenas relações entre moradores possuem dívidas mútuas para compensar.',
    };
  }

  if (scope === 'month' && !selectedMonth) {
    return { ok: false, error: 'Selecione um mês válido para compensar.' };
  }

  const scopedExpenses =
    scope === 'month' && selectedMonth
      ? filterExpensesByMonth(state.expenses, selectedMonth)
      : state.expenses;

  const summary = computeBilateralBalances(
    scopedExpenses,
    actorId,
    state.profiles
  ).find((b) => b.profile.id === otherProfileId);

  const compensable = summary ? summary.compensableAmount : 0;
  if (compensable <= 0) {
    return {
      ok: false,
      error: 'Não há saldo mútuo em aberto para compensar neste período.',
    };
  }

  const nowIso = new Date().toISOString();
  const todayIso = getTodayIsoDate();
  const noteText = `Compensação entre ${actor.name} e ${other.name}`;
  const updatedMap = new Map<string, Expense>();
  let settledCount = 0;

  const applySide = (
    list: Expense[],
    debtorId: string,
    reviewerId: string,
    targetTotal: number,
    tag: string
  ) => {
    const chronological = [...list].sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
    );
    let remaining = targetTotal;
    let idx = 0;

    for (const orig of chronological) {
      if (remaining <= 0) break;
      const exp = updatedMap.get(orig.id) || orig;
      const share = getMemberShareForExpense(exp, debtorId);
      const expPending = getPendingAmount(exp);
      const maxPayable = share ? Math.min(share.pendingShare, expPending) : 0;

      if (maxPayable <= 0) continue;

      const applyAmt = roundCents(Math.min(remaining, maxPayable));
      if (applyAmt <= 0) continue;

      const payment: PaymentRecord = {
        id: `pay_comp_${Date.now()}_${tag}_${idx++}_${Math.random()
          .toString(36)
          .slice(2, 5)}`,
        amount: applyAmt,
        date: todayIso,
        note: noteText,
        payerId: debtorId,
      };

      const nextPaidAmount = Math.min(
        exp.amount,
        roundCents(exp.paidAmount + applyAmt)
      );
      const remainingAfterExp = Math.max(0, roundCents(exp.amount - nextPaidAmount));
      const shareAfter = roundCents((share?.pendingShare ?? 0) - applyAmt);

      const nextIndications = exp.paymentIndications?.map((ind) => {
        if (ind.status !== 'pending') return ind;
        if (remainingAfterExp <= 0 || (ind.requesterId === debtorId && shareAfter <= 0)) {
          return {
            ...ind,
            status: 'rejected' as const,
            reviewedById: reviewerId,
            reviewedAt: nowIso,
            rejectionReason: 'Saldo quitado na compensação de contas.',
          };
        }
        return ind;
      });

      updatedMap.set(exp.id, {
        ...exp,
        paidAmount: nextPaidAmount,
        payments: [...exp.payments, payment],
        paymentIndications: nextIndications,
      });

      settledCount += 1;
      remaining = roundCents(remaining - applyAmt);
    }
  };

  // 1) Abate o que actor deve a other (contas criadas por other)
  applySide(summary!.expensesIOwe, actorId, otherProfileId, compensable, 'a');
  // 2) Abate o que other deve a actor (contas criadas por actor)
  applySide(summary!.expensesTheyOweMe, otherProfileId, actorId, compensable, 'b');

  return {
    ok: true,
    compensatedAmount: compensable,
    settledCount,
    state: {
      ...state,
      expenses: state.expenses.map((e) => updatedMap.get(e.id) || e),
    },
  };
}

