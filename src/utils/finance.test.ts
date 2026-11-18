import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptPaymentIndicationInState,
  addExpenseToState,
  cancelPaymentIndicationInState,
  canIndicatePayment,
  canModifyExpense,
  cascadeDeleteProfile,
  compensateBilateralBalanceInState,
  computeBilateralBalances,
  computeMemberStatsForCasa,
  computeSummaryMetrics,
  computeUserReports,
  createPaymentIndicationInState,
  deleteExpenseFromState,
  filterExpensesByMonth,
  formatBRL,
  getAssignableProfiles,
  getExpenseAssigneeBreakdown,
  getHomeSectionsForUser,
  parseBRLInput,
  registerPaymentInState,
  rejectPaymentIndicationInState,
  updateExpenseInState,
  validateExpenseInput,
} from './finance';
import {
  createProfileInState,
  createSeedState,
  deleteCategoryFromState,
  saveCategoryInState,
  updateProfileInState,
} from './storage';
import { ProfileRole } from '../types/finance';

test('formatBRL and parseBRLInput handle Brazilian currency accurately', () => {
  assert.equal(parseBRLInput('1.250,50'), 1250.5);
  assert.equal(parseBRLInput('R$ 450,00'), 450);
  assert.equal(parseBRLInput('99.90'), 99.9);
  assert.equal(Number.isNaN(parseBRLInput('abc')), true);
  assert.match(formatBRL(1250.5), /R\$\s?1\.250,50/);
});

test('Casa profile never appears in assignable profiles and cannot be assigned', () => {
  const seed = createSeedState();
  const casa = seed.profiles.find((p) => p.role === ProfileRole.CASA)!;
  const ana = seed.profiles.find((p) => p.id === 'user_ana')!;

  const casaAssignables = getAssignableProfiles(seed.profiles, casa);
  assert.equal(casaAssignables.some((p) => p.role === ProfileRole.CASA), false);

  const anaAssignables = getAssignableProfiles(seed.profiles, ana);
  assert.equal(anaAssignables.some((p) => p.role === ProfileRole.CASA), false);
  assert.equal(anaAssignables.some((p) => p.id === ana.id), true);

  // Data-layer enforcement rejects assigning Casa even if UI is bypassed
  const invalidValidation = validateExpenseInput(
    {
      title: 'Teste Casa',
      amountRaw: '100,00',
      date: '2026-11-15',
      installmentsRaw: '1',
      categoryId: 'cat_casa_moradia',
      assigneeIds: [casa.id],
    },
    ana,
    seed.profiles
  );
  assert.equal(invalidValidation.valid, false);
  assert.ok(invalidValidation.errors.assigneeIds);
});

test('Expense validation enforces required fields and installments 1..60', () => {
  const seed = createSeedState();
  const casa = seed.profiles.find((p) => p.role === ProfileRole.CASA)!;

  const emptyResult = validateExpenseInput(
    {
      title: '',
      amountRaw: '',
      date: '',
      installmentsRaw: '61',
      categoryId: '',
      assigneeIds: [],
    },
    casa,
    seed.profiles
  );

  assert.equal(emptyResult.valid, false);
  assert.ok(emptyResult.errors.title);
  assert.ok(emptyResult.errors.amount);
  assert.ok(emptyResult.errors.date);
  assert.ok(emptyResult.errors.installments);
  assert.ok(emptyResult.errors.categoryId);
  assert.ok(emptyResult.errors.assigneeIds);
});

test('Only creator can edit, delete, or register payments on an expense', () => {
  const seed = createSeedState();
  const casa = seed.profiles.find((p) => p.role === ProfileRole.CASA)!;
  const ana = seed.profiles.find((p) => p.id === 'user_ana')!;
  const expByCasa = seed.expenses.find((e) => e.creatorId === casa.id && e.paidAmount < e.amount)!;

  assert.equal(canModifyExpense(expByCasa, casa), true);
  assert.equal(canModifyExpense(expByCasa, ana), false);

  const deniedEdit = updateExpenseInState(seed, ana.id, expByCasa.id, {
    title: 'Hack',
    amountRaw: '10',
    date: '2026-11-15',
    installmentsRaw: '1',
    categoryId: expByCasa.categoryId,
    assigneeIds: expByCasa.assigneeIds,
  });
  assert.equal(deniedEdit.ok, false);

  const deniedDelete = deleteExpenseFromState(seed, ana.id, expByCasa.id);
  assert.equal(deniedDelete.ok, false);

  const deniedPayment = registerPaymentInState(
    seed,
    ana.id,
    expByCasa.id,
    '10,00',
    '2026-11-15'
  );
  assert.equal(deniedPayment.ok, false);
});

test('Partial and total payment validation rejects exceeding pending balance', () => {
  const seed = createSeedState();
  // exp_seed_2: amount 960, paidAmount 400 -> pending 560, creator user_casa
  const overPay = registerPaymentInState(
    seed,
    'user_casa',
    'exp_seed_2',
    '600,00',
    '2026-11-15'
  );
  assert.equal(overPay.ok, false);

  const validPay = registerPaymentInState(
    seed,
    'user_casa',
    'exp_seed_2',
    '260,00',
    '2026-11-15',
    'Parcela 2'
  );
  assert.equal(validPay.ok, true);
  if (validPay.ok) {
    const updated = validPay.state.expenses.find((e) => e.id === 'exp_seed_2')!;
    assert.equal(updated.paidAmount, 660);
    assert.equal(updated.payments.length, 2);
  }
});

test('Month filter and summary KPIs calculate totals accurately', () => {
  const seed = createSeedState();
  const nov = filterExpensesByMonth(seed.expenses, '2026-11');
  const oct = filterExpensesByMonth(seed.expenses, '2026-10');
  assert.equal(nov.length, 6);
  assert.equal(oct.length, 1);

  const metrics = computeSummaryMetrics(oct);
  assert.equal(metrics.total, 640);
  assert.equal(metrics.paid, 640);
  assert.equal(metrics.pending, 0);
});

test('Cascade deletion removes user, their created expenses, categories, and updates shared expenses', () => {
  let state = createSeedState();

  // Regular user cannot delete anyone
  const unauthorized = cascadeDeleteProfile(state, 'user_ana', 'user_carlos');
  assert.equal(unauthorized.ok, false);

  // Casa cannot delete itself
  const selfDelete = cascadeDeleteProfile(state, 'user_casa', 'user_casa');
  assert.equal(selfDelete.ok, false);

  // Add an expense created by Sofia so we verify it gets deleted
  const createdBySofia = addExpenseToState(state, 'user_sofia', {
    title: 'Livro Técnico',
    amountRaw: '150,00',
    date: '2026-11-15',
    installmentsRaw: '1',
    categoryId: 'cat_sofia_estudos',
    assigneeIds: ['user_sofia'],
  });
  assert.equal(createdBySofia.ok, true);
  if (createdBySofia.ok) {
    state = createdBySofia.state;
  }

  // Delete Sofia as Casa
  const deleted = cascadeDeleteProfile(state, 'user_casa', 'user_sofia');
  assert.equal(deleted.ok, true);
  if (deleted.ok) {
    const next = deleted.state;
    assert.equal(next.profiles.some((p) => p.id === 'user_sofia'), false);
    assert.equal(next.categories.some((c) => c.ownerId === 'user_sofia'), false);
    assert.equal(next.expenses.some((e) => e.creatorId === 'user_sofia'), false);
    // exp_seed_3 had ONLY Sofia as assignee -> removed cleanly
    assert.equal(next.expenses.some((e) => e.id === 'exp_seed_3'), false);
    // exp_seed_2 had Ana, Carlos, Sofia -> Sofia removed from assignees
    const shared = next.expenses.find((e) => e.id === 'exp_seed_2')!;
    assert.deepEqual(shared.assigneeIds, ['user_ana', 'user_carlos']);
  }
});

test('Reports strictly filter expenses created by the logged-in user', () => {
  const seed = createSeedState();
  const anaReports = computeUserReports(
    seed.expenses,
    seed.categories,
    seed.profiles,
    'user_ana',
    '2026-11'
  );
  // Ana created exp_seed_5 (120) and exp_seed_6 (290) = 410 total
  assert.equal(anaReports.overallSummary.total, 410);
  assert.equal(anaReports.overallSummary.paid, 290);
  assert.equal(anaReports.overallSummary.pending, 120);
});

test('Home sections expose Me deve for regular user and Todas for Casa', () => {
  const seed = createSeedState();
  const nov = filterExpensesByMonth(seed.expenses, '2026-11');
  const casa = seed.profiles.find((p) => p.role === ProfileRole.CASA)!;
  const ana = seed.profiles.find((p) => p.id === 'user_ana')!;

  const casaSections = getHomeSectionsForUser(nov, casa);
  assert.equal(casaSections.allExpenses.length, 6);
  assert.equal(casaSections.casaExpenses.length, 4);

  const anaSections = getHomeSectionsForUser(nov, ana);
  // exp_seed_5 created by Ana for Carlos -> appears in "Me deve"
  assert.equal(anaSections.owedToMeExpenses.some((e) => e.id === 'exp_seed_5'), true);
  // exp_seed_1, exp_seed_2, exp_seed_4 assigned to Ana by Casa -> appear in "Devo a Outros"
  assert.equal(anaSections.iOweOthersExpenses.length, 3);
});

test('Profile and category permissions enforce ownership rules', () => {
  const seed = createSeedState();
  // Regular user cannot create profile
  const createDenied = createProfileInState(seed, 'user_ana', 'Novo', '123', '#2563EB');
  assert.equal(createDenied.ok, false);

  // Regular user cannot edit another user's profile
  const editDenied = updateProfileInState(seed, 'user_ana', 'user_carlos', 'Carlos 2', '999');
  assert.equal(editDenied.ok, false);

  // Regular user can edit own profile
  const editOwn = updateProfileInState(seed, 'user_ana', 'user_ana', 'Ana Paula', '456');
  assert.equal(editOwn.ok, true);

  // User cannot delete another user's category
  const catDelDenied = deleteCategoryFromState(seed, 'user_ana', 'cat_casa_moradia');
  assert.equal(catDelDenied.ok, false);

  // User can create their own category
  const catCreated = saveCategoryInState(seed, 'user_ana', 'Lazer', '#DB2777');
  assert.equal(catCreated.ok, true);
});

test('Distribute installments across months splits cents accurately and clamps month-end dates', () => {
  const seed = createSeedState();
  const res = addExpenseToState(seed, 'user_casa', {
    title: 'Geladeira',
    amountRaw: '100,00',
    date: '2026-01-31',
    installmentsRaw: '3',
    categoryId: 'cat_casa_moradia',
    assigneeIds: ['user_ana', 'user_carlos'],
    distributeInstallments: true,
  });

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.createdExpenses.length, 3);
    assert.equal(res.createdExpenses[0].title, 'Geladeira (1/3)');
    assert.equal(res.createdExpenses[0].date, '2026-01-31');
    assert.equal(res.createdExpenses[1].date, '2026-02-28');
    assert.equal(res.createdExpenses[2].date, '2026-03-31');
    const sum = res.createdExpenses.reduce((acc, e) => acc + e.amount, 0);
    assert.equal(Math.round(sum * 100), 10000);
  }
});

test('Recurring monthly expense creates N monthly entries and paidImmediately records payment', () => {
  const seed = createSeedState();
  const res = addExpenseToState(seed, 'user_ana', {
    title: 'Academia',
    amountRaw: '150,00',
    date: '2026-11-10',
    installmentsRaw: '1',
    categoryId: 'cat_ana_pessoal',
    assigneeIds: ['user_ana'],
    repeatMonths: 3,
    paidImmediately: true,
  });

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.createdExpenses.length, 3);
    assert.equal(res.createdExpenses[0].date, '2026-11-10');
    assert.equal(res.createdExpenses[1].date, '2026-12-10');
    assert.equal(res.createdExpenses[2].date, '2027-01-10');
    assert.equal(res.createdExpenses[0].paidAmount, 150);
    assert.equal(res.createdExpenses[0].payments.length, 1);
    assert.equal(res.createdExpenses[1].paidAmount, 0);
  }
});

test('Custom assignee split enforces exact total sum and saves individual shares', () => {
  const seed = createSeedState();
  const invalidSplit = addExpenseToState(seed, 'user_casa', {
    title: 'Jantar',
    amountRaw: '300,00',
    date: '2026-11-15',
    installmentsRaw: '1',
    categoryId: 'cat_casa_mercado',
    assigneeIds: ['user_ana', 'user_carlos'],
    splitMode: 'custom',
    assigneeShares: { user_ana: '200,00', user_carlos: '50,00' },
  });
  assert.equal(invalidSplit.ok, false);

  const validSplit = addExpenseToState(seed, 'user_casa', {
    title: 'Jantar',
    amountRaw: '300,00',
    date: '2026-11-15',
    installmentsRaw: '1',
    categoryId: 'cat_casa_mercado',
    assigneeIds: ['user_ana', 'user_carlos'],
    splitMode: 'custom',
    assigneeShares: { user_ana: '200,00', user_carlos: '100,00' },
  });
  assert.equal(validSplit.ok, true);
  if (validSplit.ok) {
    assert.deepEqual(validSplit.expense.assigneeShares, {
      user_ana: 200,
      user_carlos: 100,
    });
  }
});

test('Payment indications do not deduct balance until accepted by creator and support optional rejection reason', () => {
  let state = createSeedState();
  const casa = state.profiles.find((p) => p.role === ProfileRole.CASA)!;
  const ana = state.profiles.find((p) => p.id === 'user_ana')!;
  const carlos = state.profiles.find((p) => p.id === 'user_carlos')!;

  // exp_seed_2 created by Casa (pending 560, assignees Ana/Carlos/Sofia)
  const expCasa = state.expenses.find((e) => e.id === 'exp_seed_2')!;
  assert.equal(canIndicatePayment(expCasa, ana), true);
  assert.equal(canIndicatePayment(expCasa, casa), false);

  // Ana sends partial indication of R$ 200,00 -> paidAmount stays 400 until Casa accepts
  const indicated = createPaymentIndicationInState(
    state,
    ana.id,
    'exp_seed_2',
    '200,00',
    '2026-11-16',
    'Pix parcial Ana'
  );
  assert.equal(indicated.ok, true);
  if (!indicated.ok) return;
  state = indicated.state;

  const afterIndicate = state.expenses.find((e) => e.id === 'exp_seed_2')!;
  assert.equal(afterIndicate.paidAmount, 400);
  assert.equal(afterIndicate.paymentIndications?.length, 1);

  // Non-creator (Carlos) cannot accept
  const deniedAccept = acceptPaymentIndicationInState(
    state,
    carlos.id,
    'exp_seed_2',
    indicated.indication.id
  );
  assert.equal(deniedAccept.ok, false);

  // Casa accepts -> paidAmount becomes 600 and PaymentRecord is created
  const accepted = acceptPaymentIndicationInState(
    state,
    casa.id,
    'exp_seed_2',
    indicated.indication.id
  );
  assert.equal(accepted.ok, true);
  if (!accepted.ok) return;
  state = accepted.state;

  const afterAccept = state.expenses.find((e) => e.id === 'exp_seed_2')!;
  assert.equal(afterAccept.paidAmount, 600);
  assert.equal(afterAccept.payments.length, 2);

  // Member-to-member (exp_seed_5 created by Ana for Carlos, R$ 120): Carlos indicates, Ana rejects with reason
  const carlosInd = createPaymentIndicationInState(
    state,
    carlos.id,
    'exp_seed_5',
    '120,00',
    '2026-11-16',
    'Pix enviado'
  );
  assert.equal(carlosInd.ok, true);
  if (!carlosInd.ok) return;
  state = carlosInd.state;

  const rejected = rejectPaymentIndicationInState(
    state,
    ana.id,
    'exp_seed_5',
    carlosInd.indication.id,
    'Comprovante não caiu ainda'
  );
  assert.equal(rejected.ok, true);
  if (!rejected.ok) return;
  state = rejected.state;

  const exp5AfterReject = state.expenses.find((e) => e.id === 'exp_seed_5')!;
  assert.equal(exp5AfterReject.paidAmount, 0);
  assert.equal(exp5AfterReject.paymentIndications?.[0].status, 'rejected');
  assert.equal(
    exp5AfterReject.paymentIndications?.[0].rejectionReason,
    'Comprovante não caiu ainda'
  );

  // Member can cancel own pending indication
  const carlosInd2 = createPaymentIndicationInState(
    state,
    carlos.id,
    'exp_seed_5',
    '120,00',
    '2026-11-17'
  );
  assert.equal(carlosInd2.ok, true);
  if (!carlosInd2.ok) return;
  state = carlosInd2.state;

  const canceled = cancelPaymentIndicationInState(
    state,
    carlos.id,
    'exp_seed_5',
    carlosInd2.indication.id
  );
  assert.equal(canceled.ok, true);
  if (canceled.ok) {
    const exp5Final = canceled.state.expenses.find((e) => e.id === 'exp_seed_5')!;
    assert.equal(exp5Final.paymentIndications?.length, 1);
  }
});

test('Individual share breakdown attributes payerId payments without reducing other members shares', () => {
  const seed = createSeedState();
  // Create 3-way expense of R$ 300 by Ana for Ana, Carlos, Sofia -> 100 each
  const added = addExpenseToState(seed, 'user_ana', {
    title: 'Churrasco Compartilhado',
    amountRaw: '300,00',
    date: '2026-11-16',
    installmentsRaw: '1',
    categoryId: 'cat_ana_pessoal',
    assigneeIds: ['user_ana', 'user_carlos', 'user_sofia'],
  });
  assert.equal(added.ok, true);
  if (!added.ok) return;

  let state = added.state;
  const expId = added.expense.id;

  // Carlos indicates R$ 100 and Ana accepts -> PaymentRecord gets payerId: 'user_carlos'
  const ind = createPaymentIndicationInState(
    state,
    'user_carlos',
    expId,
    '100,00',
    '2026-11-16'
  );
  assert.equal(ind.ok, true);
  if (!ind.ok) return;
  state = ind.state;

  const acc = acceptPaymentIndicationInState(
    state,
    'user_ana',
    expId,
    ind.indication.id
  );
  assert.equal(acc.ok, true);
  if (!acc.ok) return;
  state = acc.state;

  const updated = state.expenses.find((e) => e.id === expId)!;
  const breakdown = getExpenseAssigneeBreakdown(updated);
  const carlosShare = breakdown.find((b) => b.userId === 'user_carlos')!;
  const sofiaShare = breakdown.find((b) => b.userId === 'user_sofia')!;
  const anaShare = breakdown.find((b) => b.userId === 'user_ana')!;

  assert.equal(carlosShare.paidShare, 100);
  assert.equal(carlosShare.pendingShare, 0);
  assert.equal(sofiaShare.pendingShare, 100);
  assert.equal(anaShare.pendingShare, 100);

  // Casa member stats compute exact share totals instead of raw bill total
  const sofiaStats = computeMemberStatsForCasa(
    filterExpensesByMonth(seed.expenses, '2026-11'),
    'user_sofia'
  );
  // exp_seed_2 (960 / 3 = 320, paid 400 / 3 = 133.33, pending 186.67) + exp_seed_3 (139.90)
  assert.equal(sofiaStats.total, 459.9);
  assert.equal(sofiaStats.pending, 326.57);
});

test('Bilateral balances show symmetric net 0 and mutual compensation settles both sides', () => {
  let state = createSeedState();

  // Base in 2026-11: Carlos owes Ana R$ 120 (exp_seed_5). Make Ana also owe Carlos R$ 120!
  const anaOwesCarlos = addExpenseToState(state, 'user_carlos', {
    title: 'Pizza e Bebidas',
    amountRaw: '120,00',
    date: '2026-11-15',
    installmentsRaw: '1',
    categoryId: 'cat_carlos_mercado',
    assigneeIds: ['user_ana'],
  });
  assert.equal(anaOwesCarlos.ok, true);
  if (!anaOwesCarlos.ok) return;
  state = anaOwesCarlos.state;

  const nov = filterExpensesByMonth(state.expenses, '2026-11');
  const carlosVsAna = computeBilateralBalances(
    nov,
    'user_carlos',
    state.profiles
  ).find((b) => b.profile.id === 'user_ana')!;
  const anaVsCarlos = computeBilateralBalances(
    nov,
    'user_ana',
    state.profiles
  ).find((b) => b.profile.id === 'user_carlos')!;

  // Exact symmetric reflection
  assert.equal(carlosVsAna.iOwe, 120);
  assert.equal(carlosVsAna.theyOweMe, 120);
  assert.equal(carlosVsAna.netAmount, 0);
  assert.equal(carlosVsAna.compensableAmount, 120);

  assert.equal(anaVsCarlos.iOwe, 120);
  assert.equal(anaVsCarlos.theyOweMe, 120);
  assert.equal(anaVsCarlos.netAmount, 0);
  assert.equal(anaVsCarlos.compensableAmount, 120);

  // Add an expense in 2026-12 (Ana owes Carlos extra R$ 50) to test month vs all scopes
  const decExp = addExpenseToState(state, 'user_carlos', {
    title: 'Farmácia Dezembro',
    amountRaw: '50,00',
    date: '2026-12-02',
    installmentsRaw: '1',
    categoryId: 'cat_carlos_mercado',
    assigneeIds: ['user_ana'],
  });
  assert.equal(decExp.ok, true);
  if (!decExp.ok) return;
  state = decExp.state;

  const carlosVsAnaAll = computeBilateralBalances(
    state.expenses,
    'user_carlos',
    state.profiles
  ).find((b) => b.profile.id === 'user_ana')!;
  assert.equal(carlosVsAnaAll.iOwe, 120);
  assert.equal(carlosVsAnaAll.theyOweMe, 170);
  assert.equal(carlosVsAnaAll.netAmount, 50);
  assert.equal(carlosVsAnaAll.compensableAmount, 120);

  // Compensate in 'month' (2026-11) -> settles R$ 120 on both sides, leaving December R$ 50 untouched
  const comp = compensateBilateralBalanceInState(
    state,
    'user_carlos',
    'user_ana',
    'month',
    '2026-11'
  );
  assert.equal(comp.ok, true);
  if (!comp.ok) return;
  assert.equal(comp.compensatedAmount, 120);
  state = comp.state;

  const afterNovCarlos = computeBilateralBalances(
    filterExpensesByMonth(state.expenses, '2026-11'),
    'user_carlos',
    state.profiles
  ).find((b) => b.profile.id === 'user_ana')!;
  assert.equal(afterNovCarlos.iOwe, 0);
  assert.equal(afterNovCarlos.theyOweMe, 0);
  assert.equal(afterNovCarlos.netAmount, 0);
  assert.equal(afterNovCarlos.compensableAmount, 0);

  const afterAllAna = computeBilateralBalances(
    state.expenses,
    'user_ana',
    state.profiles
  ).find((b) => b.profile.id === 'user_carlos')!;
  assert.equal(afterAllAna.iOwe, 50);
  assert.equal(afterAllAna.theyOweMe, 0);
  assert.equal(afterAllAna.netAmount, -50);
  assert.equal(afterAllAna.compensableAmount, 0);
});



