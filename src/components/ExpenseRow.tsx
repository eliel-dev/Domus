import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Eye,
  Layers,
  Lock,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react';
import { Category, Expense, UserProfile } from '../types/finance';
import {
  canIndicatePayment,
  canModifyExpense,
  formatBRL,
  formatDateBR,
  getAvailableToIndicateAmount,
  getMemberShareForExpense,
  getPendingAmount,
  getPendingIndications,
  isExpensePaid,
} from '../utils/finance';
import { ProfileAvatar } from './ProfileAvatar';

interface ExpenseRowProps {
  expense: Expense;
  currentUser: UserProfile;
  profiles: UserProfile[];
  categories: Category[];
  shareForUserId?: string;
  shareLabelPrefix?: string;
  onPay: (expense: Expense) => void;
  onIndicate?: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onDuplicate?: (expense: Expense) => void;
  onInspect?: (expense: Expense) => void;
}

export const ExpenseRow: React.FC<ExpenseRowProps> = ({
  expense,
  currentUser,
  profiles,
  categories,
  shareForUserId,
  shareLabelPrefix,
  onPay,
  onIndicate,
  onEdit,
  onDelete,
  onDuplicate,
  onInspect,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canEdit = canModifyExpense(expense, currentUser);
  const canIndicate = canIndicatePayment(expense, currentUser);
  const pending = getPendingAmount(expense);
  const paid = isExpensePaid(expense);
  const pendingIndications = getPendingIndications(expense);
  const availableToIndicate = getAvailableToIndicateAmount(expense);
  const myPendingIndications = pendingIndications.filter(
    (ind) => ind.requesterId === currentUser.id
  );
  const progressPct =
    expense.amount > 0
      ? Math.min(100, Math.round((expense.paidAmount / expense.amount) * 100))
      : 0;

  const creator = profiles.find((p) => p.id === expense.creatorId);
  const assigneeProfiles = expense.assigneeIds
    .map((id) => profiles.find((p) => p.id === id))
    .filter((p): p is UserProfile => Boolean(p));
  const category = categories.find((c) => c.id === expense.categoryId);
  const individualShare =
    shareForUserId && expense.assigneeIds.length > 1
      ? getMemberShareForExpense(expense, shareForUserId)
      : null;

  const fullDateBR = formatDateBR(expense.date);
  const shortDate = fullDateBR.slice(0, 5);

  const installmentCompact = expense.installmentInfo
    ? `${expense.installmentInfo.current}/${expense.installmentInfo.total}`
    : expense.installments > 1
    ? `${expense.installments}x`
    : null;

  const assigneeTooltip = expense.assigneeShares
    ? assigneeProfiles
        .map((p) => {
          const share = expense.assigneeShares?.[p.id];
          return share !== undefined ? `${p.name}: ${formatBRL(share)}` : p.name;
        })
        .join(' · ')
    : assigneeProfiles.map((p) => p.name).join(', ');

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <article className="group flex flex-col gap-3 border-b border-zinc-100 py-3.5 transition-colors last:border-b-0 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-1.5">
          {onInspect ? (
            <button
              type="button"
              onClick={() => onInspect(expense)}
              aria-label={`Ver detalhes e linha do tempo de ${expense.title}`}
              className="group/title inline-flex max-w-full items-center gap-1 text-left text-sm font-semibold text-zinc-900 transition-colors hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:text-zinc-100 dark:hover:text-red-400 sm:text-[15px]"
            >
              <span className="truncate">{expense.title}</span>
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 text-zinc-300 transition-transform duration-150 group-hover/title:translate-x-0.5 group-hover/title:text-red-500 dark:text-zinc-600"
                aria-hidden="true"
              />
            </button>
          ) : (
            <h4 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:text-[15px]">
              {expense.title}
            </h4>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span
            className="inline-flex items-center gap-1 font-mono tabular-nums"
            title={fullDateBR}
          >
            <Calendar className="h-3 w-3 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
            {shortDate}
          </span>

          {installmentCompact && (
            <span
              className="inline-flex items-center gap-1 font-mono tabular-nums"
              title={
                expense.installmentInfo
                  ? `Parcela ${expense.installmentInfo.current} de ${expense.installmentInfo.total}`
                  : `${expense.installments}x de ${formatBRL(
                      expense.amount / expense.installments
                    )}`
              }
            >
              <Layers className="h-3 w-3 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
              {installmentCompact}
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: category?.color || '#71717A' }}
              aria-hidden="true"
            />
            {category ? category.name : 'Geral'}
          </span>

          {assigneeProfiles.length > 0 && (
            <span
              className="inline-flex items-center gap-1.5"
              title={`Responsáveis: ${assigneeTooltip}${
                creator ? ` · Criado por ${creator.name}` : ''
              }`}
            >
              <span className="inline-flex items-center -space-x-1.5">
                {assigneeProfiles.slice(0, 3).map((person) => (
                  <span
                    key={person.id}
                    className="rounded-full ring-2 ring-white dark:ring-[#12141A]"
                  >
                    <ProfileAvatar profile={person} size="xs" />
                  </span>
                ))}
                {assigneeProfiles.length > 3 && (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-700 ring-2 ring-white dark:bg-zinc-800 dark:text-zinc-200 dark:ring-[#12141A]">
                    +{assigneeProfiles.length - 3}
                  </span>
                )}
              </span>
              <span className="max-w-[160px] truncate text-zinc-600 dark:text-zinc-300">
                {assigneeProfiles.map((p) => p.name).join(', ')}
              </span>
            </span>
          )}

          {individualShare && (
            <span
              className={`inline-flex items-center gap-1 font-mono tabular-nums font-medium ${
                individualShare.pendingShare <= 0
                  ? 'text-zinc-600 dark:text-zinc-300'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
              title={`Cota total: ${formatBRL(individualShare.totalShare)} · Quitado: ${formatBRL(individualShare.paidShare)} · Em aberto: ${formatBRL(individualShare.pendingShare)}`}
            >
              <span>
                {shareLabelPrefix || 'Cota'}: {formatBRL(individualShare.totalShare)}
                {individualShare.pendingShare <= 0
                  ? ' · quitada'
                  : individualShare.paidShare > 0
                  ? ` · abre ${formatBRL(individualShare.pendingShare)}`
                  : ''}
              </span>
            </span>
          )}

          {pendingIndications.length > 0 && (canEdit || myPendingIndications.length > 0) && (
            <span
              className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400"
              title={
                canEdit
                  ? 'Há indicação de pagamento aguardando sua análise'
                  : 'Indicação enviada aguardando aceite'
              }
            >
              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>
                {canEdit
                  ? `${pendingIndications.length} ${
                      pendingIndications.length === 1 ? 'indicação' : 'indicações'
                    }`
                  : 'Em análise'}
              </span>
            </span>
          )}
        </div>

        {expense.notes && (
          <p className="inline-flex max-w-full items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <MessageSquareText className="h-3 w-3 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
            <span className="truncate">{expense.notes}</span>
          </p>
        )}

        {expense.paidAmount > 0 && !paid && (
          <div className="flex items-center gap-2.5 pt-0.5">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
              <div
                className="animate-bar-x h-full rounded-full bg-zinc-700 transition-transform duration-500 dark:bg-zinc-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="font-mono text-[11px] font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
              {progressPct}%
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="text-left sm:text-right">
          <div className="font-display text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100 sm:text-base">
            {formatBRL(expense.amount)}
          </div>
          {paid ? (
            <div className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-300" aria-hidden="true" />
              <span>Quitado</span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-amber-700 dark:text-amber-400"
              title={`Falta ${formatBRL(pending)}`}
            >
              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{formatBRL(pending)}</span>
            </div>
          )}
        </div>

        {canEdit ? (
          <div className="flex items-center gap-1.5">
            {!paid && (
              <button
                type="button"
                onClick={() => onPay(expense)}
                aria-label={`Registrar pagamento para ${expense.title}`}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-zinc-300/90 bg-zinc-100/90 px-3.5 py-1.5 text-xs font-semibold text-zinc-800 transition-all duration-150 hover:-translate-y-0.5 hover:bg-zinc-200/80 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-white/15 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15 whitespace-nowrap shrink-0"
              >
                <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Pagar</span>
              </button>
            )}

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label={`Mais ações para ${expense.title}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  aria-label={`Ações de ${expense.title}`}
                  className="animate-menu absolute right-0 top-full z-30 mt-1 w-44 origin-top-right rounded-2xl border border-zinc-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/12 dark:bg-[#171A21]/95"
                >
                  {onInspect && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onInspect(expense);
                      }}
                      className="flex min-h-[38px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
                    >
                      <Eye className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                      <span>Detalhes</span>
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(expense);
                    }}
                    className="flex min-h-[38px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                    <span>Editar</span>
                  </button>
                  {onDuplicate && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onDuplicate(expense);
                      }}
                      className="flex min-h-[38px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                      <span>Duplicar</span>
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(expense);
                    }}
                    className="flex min-h-[38px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Excluir</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : canIndicate ? (
          <div className="flex items-center gap-1.5">
            {!paid && availableToIndicate > 0 && onIndicate ? (
              <button
                type="button"
                onClick={() => onIndicate(expense)}
                aria-label={`Indicar pagamento para ${expense.title}`}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-zinc-300/90 bg-zinc-100/90 px-3.5 py-1.5 text-xs font-semibold text-zinc-800 transition-all duration-150 hover:-translate-y-0.5 hover:bg-zinc-200/80 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-white/15 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15 whitespace-nowrap shrink-0"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Indicar</span>
              </button>
            ) : !paid && myPendingIndications.length > 0 && onInspect ? (
              <button
                type="button"
                onClick={() => onInspect(expense)}
                aria-label={`Acompanhar indicação de ${expense.title}`}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-50/70 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100/80 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50 whitespace-nowrap shrink-0"
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Aguardando</span>
              </button>
            ) : null}

            {onInspect && (
              <button
                type="button"
                onClick={() => onInspect(expense)}
                aria-label={`Ver detalhes de ${expense.title}`}
                title="Detalhes"
                className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition-all duration-150 hover:-translate-y-0.5 hover:bg-zinc-50 dark:border-white/12 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/10"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {onInspect && (
              <button
                type="button"
                onClick={() => onInspect(expense)}
                aria-label={`Ver detalhes de ${expense.title}`}
                title="Detalhes"
                className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition-all duration-150 hover:-translate-y-0.5 hover:bg-zinc-50 dark:border-white/12 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/10"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <span
              className="inline-flex h-8 w-8 items-center justify-center text-zinc-400 dark:text-zinc-500"
              title={`Somente leitura · Criado por ${creator ? creator.name : 'outro membro'}`}
              aria-label="Somente leitura"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
        )}
      </div>
    </article>
  );
};
