import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Layers,
  Plus,
  Repeat,
  Users,
  X,
} from 'lucide-react';
import {
  Category,
  Expense,
  ExpenseFormInput,
  ProfileRole,
  UserProfile,
} from '../types/finance';
import {
  addMonthsToIsoDate,
  formatBRL,
  formatDateBR,
  getAssignableProfiles,
  parseBRLInput,
  roundCents,
  splitAmountEvenly,
  validateExpenseInput,
} from '../utils/finance';
import { CATEGORY_COLORS } from '../utils/storage';
import { ProfileAvatar } from './ProfileAvatar';

interface ExpenseFormModalProps {
  isOpen: boolean;
  editingExpense: Expense | null;
  duplicatingExpense?: Expense | null;
  currentUser: UserProfile;
  profiles: UserProfile[];
  userCategories: Category[];
  recentTemplates?: Expense[];
  defaultDate: string;
  onClose: () => void;
  onQuickCreateCategory?: (
    name: string,
    color: string
  ) => { ok: true; category: Category } | { ok: false; error: string };
  onSubmit: (
    input: ExpenseFormInput,
    editingId?: string
  ) => { ok: true } | { ok: false; errors: Record<string, string> };
}

function getLocalIsoToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function getLocalIsoYesterday(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function formatBRLInputField(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  editingExpense,
  duplicatingExpense = null,
  currentUser,
  profiles,
  userCategories,
  recentTemplates = [],
  defaultDate,
  onClose,
  onQuickCreateCategory,
  onSubmit,
}) => {
  const assignableProfiles = getAssignableProfiles(profiles, currentUser);
  const isEditing = Boolean(editingExpense);

  const [title, setTitle] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [installmentsRaw, setInstallmentsRaw] = useState('1');
  const [distributeInstallments, setDistributeInstallments] = useState(false);
  const [repeatMonthly, setRepeatMonthly] = useState(false);
  const [repeatMonths, setRepeatMonths] = useState(3);

  const [categoryId, setCategoryId] = useState('');
  const [showQuickCategory, setShowQuickCategory] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [quickCatColor, setQuickCatColor] = useState(CATEGORY_COLORS[0]);
  const [quickCatError, setQuickCatError] = useState('');

  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [assigneeShares, setAssigneeShares] = useState<Record<string, string>>({});

  const [paidImmediately, setPaidImmediately] = useState(false);
  const [paidPartialMode, setPaidPartialMode] = useState(false);
  const [initialPaidRaw, setInitialPaidRaw] = useState('');

  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shakeTrigger, setShakeTrigger] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setShowQuickCategory(false);
    setQuickCatName('');
    setQuickCatError('');

    const source = editingExpense || duplicatingExpense;
    if (source) {
      const cleanTitle = editingExpense
        ? source.title
        : source.title.replace(/\s*\(\d+\/\d+\)$/, '');
      setTitle(cleanTitle);
      setAmountRaw(formatBRLInputField(source.amount));
      setDate(editingExpense ? source.date : defaultDate);
      setInstallmentsRaw(String(source.installments));
      setDistributeInstallments(false);
      setRepeatMonthly(false);
      setRepeatMonths(3);
      setCategoryId(source.categoryId || userCategories[0]?.id || '');

      const validAssignees = source.assigneeIds.filter((id) =>
        assignableProfiles.some((p) => p.id === id)
      );
      setAssigneeIds(validAssignees);

      if (source.assigneeShares && Object.keys(source.assigneeShares).length > 0) {
        setSplitMode('custom');
        const nextShares: Record<string, string> = {};
        validAssignees.forEach((id) => {
          const v = source.assigneeShares?.[id];
          nextShares[id] = v !== undefined ? formatBRLInputField(v) : '';
        });
        setAssigneeShares(nextShares);
      } else {
        setSplitMode('equal');
        setAssigneeShares({});
      }

      setPaidImmediately(false);
      setPaidPartialMode(false);
      setInitialPaidRaw('');
      setNotes(source.notes || '');
    } else {
      setTitle('');
      setAmountRaw('');
      setDate(defaultDate);
      setInstallmentsRaw('1');
      setDistributeInstallments(false);
      setRepeatMonthly(false);
      setRepeatMonths(3);
      setCategoryId(userCategories[0]?.id || '');
      setAssigneeIds([]);
      setSplitMode('equal');
      setAssigneeShares({});
      setPaidImmediately(false);
      setPaidPartialMode(false);
      setInitialPaidRaw('');
      setNotes('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingExpense, duplicatingExpense, defaultDate]);

  useEffect(() => {
    if (!isOpen) return;
    if (!categoryId && userCategories.length > 0) {
      setCategoryId(userCategories[0].id);
    }
  }, [isOpen, categoryId, userCategories]);

  const parsedAmount = useMemo(() => parseBRLInput(amountRaw), [amountRaw]);
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const parsedInstallments = useMemo(() => {
    const n = Number(installmentsRaw);
    return Number.isInteger(n) && n >= 1 && n <= 60 ? n : 1;
  }, [installmentsRaw]);

  const clearError = (key: string) => {
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Keep custom shares initialized evenly when switching to custom mode
  const handleSwitchSplitMode = (mode: 'equal' | 'custom') => {
    setSplitMode(mode);
    clearError('assigneeShares');
    if (mode === 'custom' && assigneeIds.length > 0) {
      if (hasValidAmount) {
        const parts = splitAmountEvenly(parsedAmount, assigneeIds.length);
        const mapped: Record<string, string> = {};
        assigneeIds.forEach((id, idx) => {
          mapped[id] = formatBRLInputField(parts[idx]);
        });
        setAssigneeShares(mapped);
      }
    }
  };

  const toggleAssignee = (id: string) => {
    setAssigneeIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      if (splitMode === 'custom' && hasValidAmount && next.length > 0) {
        const parts = splitAmountEvenly(parsedAmount, next.length);
        const mapped: Record<string, string> = {};
        next.forEach((pid, idx) => {
          mapped[pid] = formatBRLInputField(parts[idx]);
        });
        setAssigneeShares(mapped);
      }
      return next;
    });
    clearError('assigneeIds');
    clearError('assigneeShares');
  };

  const handleSelectAllAssignees = () => {
    const allIds = assignableProfiles.map((p) => p.id);
    setAssigneeIds(allIds);
    clearError('assigneeIds');
    clearError('assigneeShares');
    if (splitMode === 'custom' && hasValidAmount && allIds.length > 0) {
      const parts = splitAmountEvenly(parsedAmount, allIds.length);
      const mapped: Record<string, string> = {};
      allIds.forEach((pid, idx) => {
        mapped[pid] = formatBRLInputField(parts[idx]);
      });
      setAssigneeShares(mapped);
    }
  };

  const handleSelectOnlyMe = () => {
    if (currentUser.role === ProfileRole.CASA) return;
    setAssigneeIds([currentUser.id]);
    setSplitMode('equal');
    setAssigneeShares({});
    clearError('assigneeIds');
    clearError('assigneeShares');
  };

  const handleApplyTemplate = (tpl: Expense) => {
    const cleanTitle = tpl.title.replace(/\s*\(\d+\/\d+\)$/, '');
    setTitle(cleanTitle);
    setAmountRaw(formatBRLInputField(tpl.amount));
    setInstallmentsRaw(String(tpl.installments));
    if (userCategories.some((c) => c.id === tpl.categoryId)) {
      setCategoryId(tpl.categoryId);
    }
    const validAssignees = tpl.assigneeIds.filter((id) =>
      assignableProfiles.some((p) => p.id === id)
    );
    setAssigneeIds(validAssignees);
    setSplitMode('equal');
    setAssigneeShares({});
    setErrors({});
  };

  const handleQuickCreateCat = () => {
    if (!onQuickCreateCategory) return;
    const res = onQuickCreateCategory(quickCatName, quickCatColor);
    if (!res.ok) {
      setQuickCatError(res.error);
      return;
    }
    setCategoryId(res.category.id);
    setQuickCatName('');
    setQuickCatError('');
    setShowQuickCategory(false);
    clearError('categoryId');
  };

  const customShareSum = useMemo(() => {
    if (splitMode !== 'custom') return 0;
    return assigneeIds.reduce((acc, id) => {
      const val = parseBRLInput(assigneeShares[id] ?? '');
      return Number.isFinite(val) && val > 0 ? roundCents(acc + val) : acc;
    }, 0);
  }, [splitMode, assigneeIds, assigneeShares]);

  const customShareDelta = hasValidAmount
    ? roundCents(parsedAmount - customShareSum)
    : 0;

  const uniqueTemplates = useMemo(() => {
    if (isEditing) return [];
    const seen = new Set<string>();
    const list: Expense[] = [];
    for (const exp of recentTemplates) {
      const normalized = exp.title.replace(/\s*\(\d+\/\d+\)$/, '').trim();
      const key = normalized.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(exp);
      }
      if (list.length >= 3) break;
    }
    return list;
  }, [isEditing, recentTemplates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: ExpenseFormInput = {
      title,
      amountRaw,
      date,
      installmentsRaw,
      categoryId,
      assigneeIds,
      notes,
      splitMode,
      assigneeShares: splitMode === 'custom' ? assigneeShares : undefined,
      distributeInstallments:
        !isEditing && parsedInstallments > 1 ? distributeInstallments : false,
      repeatMonths:
        !isEditing && parsedInstallments === 1 && repeatMonthly
          ? repeatMonths
          : undefined,
      paidImmediately: !isEditing ? paidImmediately : undefined,
      initialPaidRaw:
        !isEditing && paidImmediately && paidPartialMode
          ? initialPaidRaw
          : undefined,
    };

    const clientCheck = validateExpenseInput(input, currentUser, profiles);
    if (!clientCheck.valid) {
      setErrors(clientCheck.errors);
      setShakeTrigger((n) => n + 1);
      return;
    }

    const result = onSubmit(input, editingExpense?.id);
    if (!result.ok) {
      setErrors(result.errors);
      setShakeTrigger((n) => n + 1);
      return;
    }

    onClose();
  };

  if (!isOpen) return null;

  const todayIso = getLocalIsoToday();
  const yesterdayIso = getLocalIsoYesterday();

  const perInstallment = hasValidAmount
    ? parsedAmount / parsedInstallments
    : 0;
  const perAssignee =
    hasValidAmount && assigneeIds.length > 0
      ? parsedAmount / assigneeIds.length
      : 0;

  return (
    <div
      className="animate-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <div className="animate-modal max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-zinc-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/12 dark:bg-[#12141A]/95 sm:max-w-xl sm:rounded-2xl">
        {/* Sticky Modal Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-100 bg-white/95 px-5 py-4 backdrop-blur-md dark:border-white/10 dark:bg-[#12141A]/95">
          <div>
            <h2
              id="expense-modal-title"
              className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100"
            >
              {editingExpense
                ? 'Editar gasto'
                : duplicatingExpense
                ? 'Duplicar gasto'
                : 'Novo gasto'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {editingExpense
                ? 'Atualize os valores, parcelas ou responsáveis'
                : 'Preencha os valores e quem participa da divisão'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar formulário de gasto"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5 p-5">
          {errors.form && (
            <div
              key={`form-err-${shakeTrigger}`}
              className="animate-shake flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errors.form}</span>
            </div>
          )}

          {/* Quick-Fill Recent Templates */}
          {uniqueTemplates.length > 0 && !duplicatingExpense && (
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                <Copy className="h-3 w-3" aria-hidden="true" />
                <span>Preencher rápido de recente</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {uniqueTemplates.map((tpl) => {
                  const cleanTitle = tpl.title.replace(/\s*\(\d+\/\d+\)$/, '');
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50/90 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-white/25 dark:hover:bg-white/[0.08]"
                    >
                      <span className="max-w-[140px] truncate">{cleanTitle}</span>
                      <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                        {formatBRL(tpl.amount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hero Amount + Description Block */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <label
                htmlFor="expense-amount"
                className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Valor (R$) *
              </label>
              <div
                key={`amount-${errors.amount ? shakeTrigger : 'ok'}`}
                className={`flex h-[48px] items-center gap-2 rounded-xl border px-3.5 transition-colors ${
                  errors.amount
                    ? 'animate-shake border-red-500 bg-red-50/40 ring-2 ring-red-100 dark:bg-red-950/30 dark:ring-red-900/50'
                    : 'border-zinc-200 bg-zinc-50/70 focus-within:border-zinc-500 focus-within:bg-white dark:border-white/12 dark:bg-white/[0.05] dark:focus-within:border-white/40 dark:focus-within:bg-white/[0.08]'
                }`}
              >
                <span className="font-mono text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                  R$
                </span>
                <input
                  id="expense-amount"
                  type="text"
                  inputMode="decimal"
                  autoFocus={!isEditing}
                  value={amountRaw}
                  onChange={(e) => {
                    setAmountRaw(e.target.value);
                    clearError('amount');
                    clearError('assigneeShares');
                  }}
                  onBlur={() => {
                    const v = parseBRLInput(amountRaw);
                    if (Number.isFinite(v) && v > 0) {
                      setAmountRaw(formatBRLInputField(v));
                    }
                  }}
                  placeholder="0,00"
                  className="h-full w-full bg-transparent font-display text-lg font-bold tabular-nums text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white dark:placeholder:text-zinc-500"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.amount}
                </p>
              )}
            </div>

            <div className="sm:col-span-7">
              <label
                htmlFor="expense-title"
                className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Descrição *
              </label>
              <input
                id="expense-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  clearError('title');
                }}
                placeholder="Ex: Supermercado, Conta de Luz, Farmácia..."
                key={`title-${errors.title ? shakeTrigger : 'ok'}`}
                className={`h-[48px] w-full rounded-xl border px-3.5 text-sm text-zinc-900 outline-none transition-colors dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
                  errors.title
                    ? 'animate-shake border-red-500 bg-red-50/40 ring-2 ring-red-100 dark:bg-red-950/30 dark:ring-red-900/50'
                    : 'border-zinc-200 bg-white focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:focus:border-white/40'
                }`}
              />
              {errors.title && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.title}
                </p>
              )}
            </div>
          </div>

          {/* Date + Quick Chips & Installments + Quick Chips */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="expense-date"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                  <span>Data *</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDate(todayIso);
                      clearError('date');
                    }}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                      date === todayIso
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100'
                    }`}
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDate(yesterdayIso);
                      clearError('date');
                    }}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                      date === yesterdayIso
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100'
                    }`}
                  >
                    Ontem
                  </button>
                </div>
              </div>
              <input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  clearError('date');
                }}
                key={`date-${errors.date ? shakeTrigger : 'ok'}`}
                className={`h-[44px] w-full rounded-xl border px-3 text-sm text-zinc-900 outline-none transition-colors dark:text-zinc-100 dark:scheme-dark ${
                  errors.date
                    ? 'animate-shake border-red-500 bg-red-50/40 ring-2 ring-red-100 dark:bg-red-950/30 dark:ring-red-900/50'
                    : 'border-zinc-200 bg-white focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:focus:border-white/40'
                }`}
              />
              {errors.date && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.date}
                </p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="expense-installments"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  <Layers className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                  <span>Parcelas (1 a 60) *</span>
                </label>
                {hasValidAmount && parsedInstallments > 1 && (
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-zinc-500 dark:text-zinc-300">
                    {parsedInstallments}x de {formatBRL(perInstallment)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 6, 12].map((n) => {
                    const active = installmentsRaw === String(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setInstallmentsRaw(String(n));
                          clearError('installments');
                        }}
                        className={`h-[44px] min-w-[38px] rounded-xl border px-2 font-mono text-xs font-semibold transition-colors ${
                          active
                            ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-white/12 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-white/25'
                        }`}
                      >
                        {n === 1 ? '1x' : `${n}x`}
                      </button>
                    );
                  })}
                </div>
                <input
                  id="expense-installments"
                  type="number"
                  min={1}
                  max={60}
                  value={installmentsRaw}
                  onChange={(e) => {
                    setInstallmentsRaw(e.target.value);
                    clearError('installments');
                  }}
                  key={`inst-${errors.installments ? shakeTrigger : 'ok'}`}
                  aria-label="Número personalizado de parcelas"
                  className={`h-[44px] w-full min-w-[54px] rounded-xl border px-2 text-center font-mono text-sm tabular-nums text-zinc-900 outline-none transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none dark:text-zinc-100 ${
                    errors.installments
                      ? 'animate-shake border-red-500 bg-red-50/40 ring-2 ring-red-100 dark:bg-red-950/30 dark:ring-red-900/50'
                      : 'border-zinc-200 bg-white focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:focus:border-white/40'
                  }`}
                />
              </div>
              {errors.installments && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.installments}
                </p>
              )}
            </div>
          </div>

          {/* Installment Distribution OR Fixed Monthly Recurrence (New Expense Only) */}
          {!isEditing && (
            <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
              {parsedInstallments > 1 ? (
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={distributeInstallments}
                    onChange={(e) => setDistributeInstallments(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-red-600"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Distribuir parcelas pelos próximos meses
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {distributeInstallments && hasValidAmount
                        ? `Serão criados ${parsedInstallments} lançamentos mensais (${formatBRL(
                            perInstallment
                          )} cada) até ${formatDateBR(
                            addMonthsToIsoDate(date, parsedInstallments - 1)
                          )}.`
                        : 'Cria um lançamento em cada mês futuro (1/N, 2/N...) para acompanhar mês a mês.'}
                    </p>
                  </div>
                </label>
              ) : (
                <div className="space-y-2.5">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={repeatMonthly}
                      onChange={(e) => setRepeatMonthly(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-red-600"
                    />
                    <div className="space-y-0.5">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        <Repeat className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                        <span>Repetir mensalmente (conta fixa)</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Ideal para aluguel, internet ou assinaturas com o mesmo valor todo mês.
                      </p>
                    </div>
                  </label>

                  {repeatMonthly && (
                    <div className="flex flex-wrap items-center gap-1.5 pl-7">
                      {[2, 3, 6, 12].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setRepeatMonths(count)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                            repeatMonths === count
                              ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                              : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-white/12 dark:bg-white/[0.04] dark:text-zinc-300'
                          }`}
                        >
                          {count} meses
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Visual Category Selector + Inline "+ Nova categoria" */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Categoria *
              </span>
              {onQuickCreateCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickCategory((v) => !v);
                    setQuickCatError('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{showQuickCategory ? 'Fechar' : 'Nova categoria'}</span>
                </button>
              )}
            </div>

            {showQuickCategory && (
              <div className="mb-2.5 space-y-2.5 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-white/12 dark:bg-white/[0.04]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickCatName}
                    onChange={(e) => {
                      setQuickCatName(e.target.value);
                      if (quickCatError) setQuickCatError('');
                    }}
                    placeholder="Nome da categoria..."
                    aria-label="Nome da nova categoria"
                    className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleQuickCreateCat}
                    className="rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                  >
                    Criar
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setQuickCatColor(color)}
                      aria-label={`Cor ${color}`}
                      className={`h-5 w-5 rounded-full border-2 transition-transform ${
                        quickCatColor === color
                          ? 'scale-110 border-zinc-900 dark:border-white'
                          : 'border-transparent opacity-80'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                {quickCatError && (
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">
                    {quickCatError}
                  </p>
                )}
              </div>
            )}

            <div
              key={`cat-${errors.categoryId ? shakeTrigger : 'ok'}`}
              className={`flex flex-wrap gap-2 rounded-xl border p-2.5 ${
                errors.categoryId
                  ? 'animate-shake border-red-500 bg-red-50/40 ring-2 ring-red-100 dark:bg-red-950/30 dark:ring-red-900/50'
                  : 'border-zinc-200 bg-zinc-50/60 dark:border-white/10 dark:bg-white/[0.03]'
              }`}
              role="radiogroup"
              aria-label="Selecionar categoria"
            >
              {userCategories.length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Você ainda não tem categorias. Clique em “+ Nova categoria” acima.
                </p>
              ) : (
                userCategories.map((cat) => {
                  const selected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setCategoryId(cat.id);
                        clearError('categoryId');
                      }}
                      className={`inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selected
                          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-white/12 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:border-white/25'
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: cat.color }}
                        aria-hidden="true"
                      />
                      <span>{cat.name}</span>
                    </button>
                  );
                })
              )}
            </div>
            {errors.categoryId && (
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                {errors.categoryId}
              </p>
            )}
          </div>

          {/* Assignees with Real Circular Avatars + Quick Select + Equal/Custom Split */}
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <Users className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                <span>Responsáveis *</span>
              </span>
              <div className="flex items-center gap-1.5">
                {currentUser.role !== ProfileRole.CASA && (
                  <button
                    type="button"
                    onClick={handleSelectOnlyMe}
                    className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-white/12 dark:text-zinc-300 dark:hover:border-white/30 dark:hover:text-white"
                  >
                    Só eu
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSelectAllAssignees}
                  className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-white/12 dark:text-zinc-300 dark:hover:border-white/30 dark:hover:text-white"
                >
                  Todos
                </button>
              </div>
            </div>

            <p className="mb-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              {currentUser.role === ProfileRole.CASA
                ? 'O perfil Casa registra gastos para outros membros e não atua como responsável.'
                : 'Selecione você mesmo e/ou outros membros (o perfil Casa não pode ser atribuído).'}
            </p>

            <div
              key={`assignees-${errors.assigneeIds ? shakeTrigger : 'ok'}`}
              className={`grid grid-cols-2 gap-2 rounded-xl border p-2.5 sm:grid-cols-3 ${
                errors.assigneeIds
                  ? 'animate-shake border-red-500 bg-red-50/40 ring-2 ring-red-100 dark:bg-red-950/30 dark:ring-red-900/50'
                  : 'border-zinc-200 bg-zinc-50/60 dark:border-white/10 dark:bg-white/[0.03]'
              }`}
            >
              {assignableProfiles.map((prof) => {
                const selected = assigneeIds.includes(prof.id);
                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => toggleAssignee(prof.id)}
                    aria-pressed={selected}
                    className={`flex min-h-[42px] items-center gap-2 rounded-full border px-2.5 py-1.5 text-left text-xs font-semibold transition-colors ${
                      selected
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-white/12 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:border-white/25'
                    }`}
                  >
                    <ProfileAvatar profile={prof} size="xs" />
                    <span className="flex-1 truncate">{prof.name}</span>
                    {selected && (
                      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
            {errors.assigneeIds && (
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                {errors.assigneeIds}
              </p>
            )}

            {/* Split Mode: Equal vs Custom */}
            {assigneeIds.length >= 2 && (
              <div className="mt-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Divisão entre responsáveis
                  </span>
                  <div className="inline-flex rounded-full border border-zinc-200 bg-white p-0.5 dark:border-white/12 dark:bg-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => handleSwitchSplitMode('equal')}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        splitMode === 'equal'
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      Igual
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchSplitMode('custom')}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        splitMode === 'custom'
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      Personalizada
                    </button>
                  </div>
                </div>

                {splitMode === 'equal' ? (
                  hasValidAmount && (
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      Cada membro fica com{' '}
                      <strong className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                        {formatBRL(perAssignee)}
                      </strong>
                      .
                    </p>
                  )
                ) : (
                  <div className="mt-3 space-y-2">
                    {assigneeIds.map((id) => {
                      const prof = assignableProfiles.find((p) => p.id === id);
                      if (!prof) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <ProfileAvatar profile={prof} size="xs" />
                            <span className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">
                              {prof.name}
                            </span>
                          </div>
                          <div className="flex w-32 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 dark:border-white/12 dark:bg-white/[0.05]">
                            <span className="font-mono text-[11px] text-zinc-400">
                              R$
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label={`Valor para ${prof.name}`}
                              value={assigneeShares[id] ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAssigneeShares((prev) => ({
                                  ...prev,
                                  [id]: val,
                                }));
                                clearError('assigneeShares');
                              }}
                              placeholder="0,00"
                              className="w-full bg-transparent text-right font-mono text-xs tabular-nums text-zinc-900 outline-none dark:text-zinc-100"
                            />
                          </div>
                        </div>
                      );
                    })}

                    {hasValidAmount && (
                      <div className="flex items-center justify-between border-t border-zinc-200/70 pt-2 text-[11px] dark:border-white/10">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          Soma: {formatBRL(customShareSum)} de{' '}
                          {formatBRL(parsedAmount)}
                        </span>
                        <span
                          className={`font-semibold tabular-nums ${
                            Math.abs(customShareDelta) <= 0.02
                              ? 'text-zinc-700 dark:text-zinc-200'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {Math.abs(customShareDelta) <= 0.02
                            ? 'Fechado'
                            : customShareDelta > 0
                            ? `Falta ${formatBRL(customShareDelta)}`
                            : `Excede ${formatBRL(Math.abs(customShareDelta))}`}
                        </span>
                      </div>
                    )}

                    {errors.assigneeShares && (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">
                        {errors.assigneeShares}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mark as Paid Immediately Toggle (New Expense Only) */}
          {!isEditing && (
            <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2
                    className={`h-4 w-4 ${
                      paidImmediately
                        ? 'text-zinc-900 dark:text-white'
                        : 'text-zinc-400'
                    }`}
                    aria-hidden="true"
                  />
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Já foi pago na criação
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {distributeInstallments || (repeatMonthly && parsedInstallments === 1)
                        ? 'Marca a primeira parcela/mês como quitada.'
                        : 'Registra o pagamento automaticamente ao salvar.'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={paidImmediately}
                  onChange={(e) => {
                    setPaidImmediately(e.target.checked);
                    clearError('initialPaid');
                  }}
                  className="h-4 w-4 rounded border-zinc-300 accent-red-600"
                />
              </label>

              {paidImmediately && (
                <div className="mt-3 space-y-2 border-t border-zinc-200/70 pt-3 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaidPartialMode(false);
                        setInitialPaidRaw('');
                        clearError('initialPaid');
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        !paidPartialMode
                          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                          : 'border-zinc-200 bg-white text-zinc-600 dark:border-white/12 dark:bg-white/[0.04] dark:text-zinc-300'
                      }`}
                    >
                      Valor integral
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaidPartialMode(true)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        paidPartialMode
                          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                          : 'border-zinc-200 bg-white text-zinc-600 dark:border-white/12 dark:bg-white/[0.04] dark:text-zinc-300'
                      }`}
                    >
                      Entrada parcial
                    </button>
                  </div>

                  {paidPartialMode && (
                    <div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={initialPaidRaw}
                        onChange={(e) => {
                          setInitialPaidRaw(e.target.value);
                          clearError('initialPaid');
                        }}
                        placeholder="Valor já pago (ex: 100,00)"
                        aria-label="Valor pago inicialmente"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs tabular-nums text-zinc-900 outline-none focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:text-white"
                      />
                      {errors.initialPaid && (
                        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                          {errors.initialPaid}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label
              htmlFor="expense-notes"
              className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Observações (opcional)
            </label>
            <textarea
              id="expense-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes adicionais, chave Pix ou número da nota..."
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-white/40"
            />
          </div>

          {/* Live Summary Preview Bar */}
          {hasValidAmount && (
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-zinc-900 dark:text-white">
                  Resumo: {formatBRL(parsedAmount)}
                </span>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span>
                    {!isEditing && repeatMonthly && parsedInstallments === 1
                      ? `Repetir ${repeatMonths} meses`
                      : parsedInstallments === 1
                      ? 'À vista'
                      : `${parsedInstallments}x de ${formatBRL(perInstallment)}`}
                  </span>
                  {assigneeIds.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {splitMode === 'custom'
                          ? `Divisão personalizada (${assigneeIds.length})`
                          : `${formatBRL(perAssignee)} / pessoa`}
                      </span>
                    </>
                  )}
                  {!isEditing && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {paidImmediately ? 'Com pagamento inicial' : 'Em aberto'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-zinc-100 pt-4 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/12 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[42px] rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-red-600/20 transition-colors hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            >
              {editingExpense
                ? 'Salvar alterações'
                : distributeInstallments && parsedInstallments > 1
                ? `Lançar ${parsedInstallments} parcelas`
                : repeatMonthly && parsedInstallments === 1
                ? `Lançar ${repeatMonths} meses`
                : 'Salvar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
