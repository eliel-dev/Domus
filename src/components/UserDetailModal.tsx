import React from 'react';
import { X } from 'lucide-react';
import { Category, Expense, PeriodScope, UserProfile } from '../types/finance';
import {
  computeMemberStatsForCasa,
  formatBRL,
  getMonthLabelPT,
} from '../utils/finance';
import { ExpenseRow } from './ExpenseRow';
import { ProfileAvatar } from './ProfileAvatar';

interface UserDetailModalProps {
  targetUser: UserProfile | null;
  currentUser: UserProfile;
  selectedMonth: string;
  periodScope?: PeriodScope;
  expenses: Expense[];
  profiles: UserProfile[];
  categories: Category[];
  onClose: () => void;
  onPay: (expense: Expense) => void;
  onIndicate?: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onDuplicate?: (expense: Expense) => void;
  onInspect?: (expense: Expense) => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  targetUser,
  currentUser,
  selectedMonth,
  periodScope = 'month',
  expenses,
  profiles,
  categories,
  onClose,
  onPay,
  onIndicate,
  onEdit,
  onDelete,
  onDuplicate,
  onInspect,
}) => {
  if (!targetUser) return null;

  const userExpenses = expenses
    .filter((e) => e.assigneeIds.includes(targetUser.id))
    .sort((a, b) => b.date.localeCompare(a.date));
  const summary = computeMemberStatsForCasa(expenses, targetUser.id);
  const pct =
    summary.total > 0 ? Math.round((summary.paid / summary.total) * 100) : 0;
  const periodLabel =
    periodScope === 'all' ? 'Geral · Todos os meses' : getMonthLabelPT(selectedMonth);

  return (
    <div
      className="animate-backdrop fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-detail-title"
    >
      <div className="animate-modal max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-zinc-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/12 dark:bg-[#12141A]/95 sm:max-w-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white/95 px-5 py-4 backdrop-blur-md dark:border-white/10 dark:bg-[#12141A]/95">
          <div className="flex items-center gap-3">
            <ProfileAvatar profile={targetUser} size="md" />
            <div>
              <h2
                id="user-detail-title"
                className="text-lg font-bold text-zinc-900 dark:text-zinc-100"
              >
                Cotas de {targetUser.name}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {periodLabel} · {userExpenses.length}{' '}
                {userExpenses.length === 1 ? 'lançamento' : 'lançamentos'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Fechar detalhes de ${targetUser.name}`}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Total atribuído
                </div>
                <div className="mt-1 font-display text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100 sm:text-lg">
                  {formatBRL(summary.total)}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Quitado
                </div>
                <div className="mt-1 font-display text-base font-bold tabular-nums text-zinc-700 dark:text-zinc-200 sm:text-lg">
                  {formatBRL(summary.paid)}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Em aberto
                </div>
                <div className="mt-1 font-display text-base font-bold tabular-nums text-amber-700 dark:text-amber-400 sm:text-lg">
                  {formatBRL(summary.pending)}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                <span>Quitação</span>
                <span className="font-mono font-semibold tabular-nums">{pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
                <div
                  className="animate-bar-x h-full rounded-full bg-zinc-700 transition-transform duration-500 dark:bg-zinc-200"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {periodScope === 'all' ? 'Todos os lançamentos' : 'Lançamentos do mês'}
            </h3>
            {userExpenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                Nenhum gasto atribuído a {targetUser.name}{' '}
                {periodScope === 'all' ? 'até o momento.' : `em ${getMonthLabelPT(selectedMonth)}.`}
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-white/[0.03]">
                {userExpenses.map((exp) => (
                  <ExpenseRow
                    key={exp.id}
                    expense={exp}
                    currentUser={currentUser}
                    profiles={profiles}
                    categories={categories}
                    shareForUserId={targetUser.id}
                    shareLabelPrefix={`Cota ${targetUser.name}`}
                    onPay={onPay}
                    onIndicate={onIndicate}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onInspect={onInspect}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

