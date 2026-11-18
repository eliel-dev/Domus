import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';
import {
  BilateralBalanceSummary,
  Category,
  Expense,
  PeriodScope,
  ProfileRole,
  UserProfile,
} from '../types/finance';
import { formatBRL, getMonthLabelPT } from '../utils/finance';
import { ExpenseRow } from './ExpenseRow';
import { ProfileAvatar } from './ProfileAvatar';

type DirectionFilter = 'all' | 'i-owe' | 'they-owe';

interface PersonBalanceModalProps {
  summary: BilateralBalanceSummary | null;
  currentUser: UserProfile;
  selectedMonth: string;
  periodScope: PeriodScope;
  profiles: UserProfile[];
  categories: Category[];
  onClose: () => void;
  onCompensate: (
    otherProfileId: string
  ) => { ok: true; compensatedAmount: number } | { ok: false; error: string };
  onPay: (expense: Expense) => void;
  onIndicate: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onDuplicate?: (expense: Expense) => void;
  onInspect: (expense: Expense) => void;
}

export const PersonBalanceModal: React.FC<PersonBalanceModalProps> = ({
  summary,
  currentUser,
  selectedMonth,
  periodScope,
  profiles,
  categories,
  onClose,
  onCompensate,
  onPay,
  onIndicate,
  onEdit,
  onDelete,
  onDuplicate,
  onInspect,
}) => {
  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [confirmingCompensate, setConfirmingCompensate] = useState(false);
  const [compensateFeedback, setCompensateFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const profileId = summary?.profile.id || null;

  useEffect(() => {
    setDirection('all');
    setConfirmingCompensate(false);
    setCompensateFeedback(null);
  }, [profileId, periodScope]);

  if (!summary) return null;

  const other = summary.profile;
  const isCasaTarget = other.role === ProfileRole.CASA;
  const periodLabel =
    periodScope === 'all'
      ? 'Geral · Todos os meses'
      : getMonthLabelPT(selectedMonth);

  const visibleExpenses =
    direction === 'i-owe'
      ? summary.expensesIOwe
      : direction === 'they-owe'
      ? summary.expensesTheyOweMe
      : summary.expensesBetween;

  const netPositive = summary.netAmount > 0.005;
  const netNegative = summary.netAmount < -0.005;
  const netZeroWithOffset = !netPositive && !netNegative && summary.compensableAmount > 0;

  const handleConfirmCompensation = () => {
    const res = onCompensate(other.id);
    setConfirmingCompensate(false);
    if (!res.ok) {
      setCompensateFeedback({ type: 'error', message: res.error });
      return;
    }
    setCompensateFeedback({
      type: 'success',
      message: `Compensação de ${formatBRL(res.compensatedAmount)} concluída nos dois lados.`,
    });
  };

  return (
    <div
      className="animate-backdrop fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="person-balance-title"
    >
      <div className="animate-modal max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-zinc-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/12 dark:bg-[#12141A]/95 sm:max-w-2xl sm:rounded-2xl">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white/95 px-5 py-4 backdrop-blur-md dark:border-white/10 dark:bg-[#12141A]/95">
          <div className="flex min-w-0 items-center gap-3">
            <ProfileAvatar profile={other} size="md" />
            <div className="min-w-0">
              <h2
                id="person-balance-title"
                className="truncate text-lg font-bold text-zinc-900 dark:text-zinc-100"
              >
                {currentUser.name} ↔ {other.name}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {periodLabel} · {summary.expensesBetween.length}{' '}
                {summary.expensesBetween.length === 1 ? 'conta' : 'contas'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Fechar balanço com ${other.name}`}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Primary Net Balance & Mirrored Breakdown */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50/70 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="border-b border-zinc-200/70 p-4 dark:border-white/10 sm:p-5">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <span>Saldo final líquido</span>
                <span className="inline-flex items-center gap-1">
                  {netPositive ? (
                    <>
                      <ArrowDownLeft className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" aria-hidden="true" />
                      <span className="text-zinc-700 dark:text-zinc-200">
                        {other.name} te deve
                      </span>
                    </>
                  ) : netNegative ? (
                    <>
                      <ArrowUpRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      <span className="text-amber-700 dark:text-amber-400">
                        Você deve para {other.name}
                      </span>
                    </>
                  ) : netZeroWithOffset ? (
                    <>
                      <ArrowLeftRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      <span className="text-amber-700 dark:text-amber-400">
                        Empatado · compensável
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-300" aria-hidden="true" />
                      <span>Tudo em dia</span>
                    </>
                  )}
                </span>
              </div>

              <div
                className={`mt-1.5 font-display text-3xl font-extrabold tabular-nums ${
                  netNegative || netZeroWithOffset
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-zinc-900 dark:text-white'
                }`}
              >
                {netPositive
                  ? `+ ${formatBRL(summary.netAmount)}`
                  : netNegative
                  ? `- ${formatBRL(Math.abs(summary.netAmount))}`
                  : formatBRL(0)}
              </div>
            </div>

            {isCasaTarget ? (
              <div className="grid grid-cols-2 divide-x divide-zinc-200/70 dark:divide-white/10">
                <div className="p-4">
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Em aberto com a Casa
                  </div>
                  <div className="mt-1 font-display text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
                    {formatBRL(summary.iOwe)}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                    {summary.openCountIOwe}{' '}
                    {summary.openCountIOwe === 1 ? 'pendência' : 'pendências'}
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Já quitado
                  </div>
                  <div className="mt-1 font-display text-lg font-bold tabular-nums text-zinc-800 dark:text-zinc-200">
                    {formatBRL(summary.paidByMeToThem)}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                    Total {formatBRL(summary.totalHistoricalIOwe)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 divide-y divide-zinc-200/70 dark:divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="p-4">
                  <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <span>Você deve para {other.name}</span>
                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  </div>
                  <div className="mt-1 font-display text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
                    {formatBRL(summary.iOwe)}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                    {summary.openCountIOwe} em aberto · Quitado{' '}
                    {formatBRL(summary.paidByMeToThem)}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <span>{other.name} deve para você</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-300" aria-hidden="true" />
                  </div>
                  <div className="mt-1 font-display text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatBRL(summary.theyOweMe)}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                    {summary.openCountTheyOweMe} em aberto · Quitado{' '}
                    {formatBRL(summary.paidByThemToMe)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Compensation Feedback Banner */}
          {compensateFeedback && (
            <div
              className={`rounded-xl border px-4 py-3 text-xs font-medium ${
                compensateFeedback.type === 'error'
                  ? 'border-red-300/70 bg-red-50/70 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
                  : 'border-zinc-300/80 bg-zinc-100/80 text-zinc-800 dark:border-white/15 dark:bg-white/[0.06] dark:text-zinc-100'
              }`}
            >
              {compensateFeedback.message}
            </div>
          )}

          {/* Mutual Debt Offset / Compensation Action */}
          {!isCasaTarget && summary.compensableAmount > 0 && (
            <div className="rounded-2xl border border-amber-300/60 bg-amber-50/45 p-4 dark:border-amber-500/25 dark:bg-amber-950/15">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    <ArrowLeftRight
                      className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400"
                      aria-hidden="true"
                    />
                    <span>
                      Compensar {formatBRL(summary.compensableAmount)} entre vocês
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    Quita automaticamente {formatBRL(summary.compensableAmount)} dos
                    dois lados ({currentUser.name} e {other.name}).{' '}
                    {Math.abs(summary.netAmount) < 0.01
                      ? 'O saldo entre vocês fica zerado (R$ 0,00).'
                      : summary.netAmount > 0
                      ? `${other.name} passa a te dever ${formatBRL(summary.netAmount)}.`
                      : `Você passa a dever apenas ${formatBRL(Math.abs(summary.netAmount))}.`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {confirmingCompensate ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmingCompensate(false)}
                        className="min-h-[38px] rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/12 dark:bg-white/[0.06] dark:text-zinc-200 dark:hover:bg-white/10"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmCompensation}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Confirmar compensação</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setCompensateFeedback(null);
                        setConfirmingCompensate(true);
                      }}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500 whitespace-nowrap"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Compensar {formatBRL(summary.compensableAmount)}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Directional Expense List */}
          <div className="space-y-3">
            {!isCasaTarget && (
              <div
                className="flex items-center gap-1 border-b border-zinc-200/80 pb-px dark:border-white/10"
                role="tablist"
                aria-label="Filtrar direção das contas"
              >
                {(
                  [
                    {
                      id: 'all',
                      label: 'Todas',
                      count: summary.expensesBetween.length,
                    },
                    {
                      id: 'i-owe',
                      label: 'Você deve',
                      count: summary.expensesIOwe.length,
                    },
                    {
                      id: 'they-owe',
                      label: `${other.name} deve`,
                      count: summary.expensesTheyOweMe.length,
                    },
                  ] as const
                ).map((t) => {
                  const active = direction === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setDirection(t.id)}
                      className={`relative inline-flex min-h-[38px] items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        active
                          ? 'text-zinc-900 dark:text-white'
                          : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      <span>{t.label}</span>
                      <span className="font-mono text-[11px] tabular-nums opacity-75">
                        {t.count}
                      </span>
                      <span
                        className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-red-600 transition-all duration-200 dark:bg-red-500 ${
                          active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {visibleExpenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 py-10 text-center text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                Nenhuma conta entre você e {other.name} neste recorte.
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-white/[0.03]">
                {visibleExpenses.map((exp) => {
                  const isMyDebt =
                    exp.creatorId === other.id &&
                    exp.assigneeIds.includes(currentUser.id);
                  return (
                    <ExpenseRow
                      key={exp.id}
                      expense={exp}
                      currentUser={currentUser}
                      profiles={profiles}
                      categories={categories}
                      shareForUserId={isMyDebt ? currentUser.id : other.id}
                      shareLabelPrefix={isMyDebt ? 'Sua cota' : `Cota ${other.name}`}
                      onPay={onPay}
                      onIndicate={onIndicate}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onDuplicate={onDuplicate}
                      onInspect={onInspect}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
