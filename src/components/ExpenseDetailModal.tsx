import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Diamond,
  Layers,
  Lock,
  MessageSquareText,
  Pencil,
  Send,
  Trash2,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { Category, Expense, UserProfile } from '../types/finance';
import {
  canIndicatePayment,
  canModifyExpense,
  formatBRL,
  formatDateBR,
  getAvailableToIndicateAmount,
  getPendingAmount,
  getPendingIndications,
  isExpensePaid,
  roundCents,
  splitAmountEvenly,
} from '../utils/finance';
import { ExpenseTimeline } from './ExpenseTimeline';
import { ProfileAvatar } from './ProfileAvatar';

interface ExpenseDetailModalProps {
  expense: Expense | null;
  seriesExpenses?: Expense[];
  currentUser: UserProfile;
  profiles: UserProfile[];
  categories: Category[];
  onClose: () => void;
  onSelectSeriesExpense?: (expense: Expense) => void;
  onPay: (expense: Expense) => void;
  onIndicate?: (expense: Expense) => void;
  onAcceptIndication?: (expenseId: string, indicationId: string) => void;
  onRejectIndication?: (
    expenseId: string,
    indicationId: string,
    reason?: string
  ) => void;
  onCancelIndication?: (expenseId: string, indicationId: string) => void;
  onEdit: (expense: Expense) => void;
  onDuplicate: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  expense,
  seriesExpenses = [],
  currentUser,
  profiles,
  categories,
  onClose,
  onSelectSeriesExpense,
  onPay,
  onIndicate,
  onAcceptIndication,
  onRejectIndication,
  onCancelIndication,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const [highlightedPaymentId, setHighlightedPaymentId] = useState<string | null>(
    null
  );
  const [rejectingIndicationId, setRejectingIndicationId] = useState<string | null>(
    null
  );
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    setHighlightedPaymentId(null);
    setRejectingIndicationId(null);
    setRejectReason('');
  }, [expense?.id]);

  useEffect(() => {
    if (!expense) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expense, onClose]);

  const sortedPayments = useMemo(() => {
    if (!expense) return [];
    let running = 0;
    return [...(expense.payments || [])]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => {
        running = Math.min(expense.amount, roundCents(running + p.amount));
        const isPartial = roundCents(expense.amount - running) > 0.009;
        return {
          ...p,
          cumulativeAfter: running,
          isPartial,
        };
      });
  }, [expense]);

  if (!expense) return null;

  const canModify = canModifyExpense(expense, currentUser);
  const canIndicate = canIndicatePayment(expense, currentUser);
  const pending = getPendingAmount(expense);
  const paid = isExpensePaid(expense);
  const pendingIndications = getPendingIndications(expense);
  const availableToIndicate = getAvailableToIndicateAmount(expense);
  const creator = profiles.find((p) => p.id === expense.creatorId);
  const category = categories.find((c) => c.id === expense.categoryId);

  const visibleIndications = (expense.paymentIndications || [])
    .filter((ind) =>
      canModify
        ? ind.status === 'pending' || ind.status === 'rejected'
        : ind.requesterId === currentUser.id
    )
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });

  const equalShares = splitAmountEvenly(
    expense.amount,
    Math.max(1, expense.assigneeIds.length)
  );
  const assigneeRows = expense.assigneeIds
    .map((id, idx) => {
      const profile = profiles.find((p) => p.id === id);
      if (!profile) return null;
      const share =
        expense.assigneeShares && expense.assigneeShares[id] !== undefined
          ? expense.assigneeShares[id]
          : equalShares[idx] ?? 0;
      return { profile, share };
    })
    .filter((item): item is { profile: UserProfile; share: number } => Boolean(item));

  const sortedSeries =
    seriesExpenses.length > 1
      ? [...seriesExpenses].sort(
          (a, b) =>
            (a.installmentInfo?.current ?? 0) - (b.installmentInfo?.current ?? 0) ||
            a.date.localeCompare(b.date)
        )
      : [];

  return (
    <div
      className="animate-backdrop fixed inset-0 z-[45] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-detail-title"
    >
      <div className="animate-modal max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-zinc-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/12 dark:bg-[#12141A]/95 sm:max-w-2xl sm:rounded-2xl">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-zinc-100 bg-white/95 px-5 py-4 backdrop-blur-md dark:border-white/10 dark:bg-[#12141A]/95">
          <div className="min-w-0 space-y-1">
            <h2
              id="expense-detail-title"
              className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100"
            >
              {expense.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{formatDateBR(expense.date)}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: category?.color || '#71717A' }}
                  aria-hidden="true"
                />
                {category ? category.name : 'Sem categoria'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Por {creator ? creator.name : 'Removido'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do gasto"
            className="flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* 3-Column Financial Summary Strip */}
          <div className="grid grid-cols-3 divide-x divide-zinc-200/80 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 py-3.5 text-center dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="px-2">
              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                <Wallet className="h-3 w-3" aria-hidden="true" />
                <span>Total</span>
              </div>
              <div className="mt-1 font-display text-base font-bold tabular-nums text-zinc-900 dark:text-white sm:text-lg">
                {formatBRL(expense.amount)}
              </div>
            </div>
            <div className="px-2">
              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                <span>Quitado</span>
              </div>
              <div className="mt-1 font-display text-base font-bold tabular-nums text-zinc-700 dark:text-zinc-200 sm:text-lg">
                {formatBRL(expense.paidAmount)}
              </div>
            </div>
            <div className="px-2">
              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span>Aberto</span>
              </div>
              <div
                className={`mt-1 font-display text-base font-bold tabular-nums sm:text-lg ${
                  paid
                    ? 'text-zinc-500 dark:text-zinc-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {paid ? 'Quitado' : formatBRL(pending)}
              </div>
            </div>
          </div>

          {/* Interactive Visual Timeline Component */}
          <ExpenseTimeline
            expense={expense}
            canModify={canModify || (canIndicate && availableToIndicate > 0 && Boolean(onIndicate))}
            actionLabel={canModify ? 'Registrar pagamento' : 'Indicar pagamento'}
            onQuickPay={() => (canModify ? onPay(expense) : onIndicate?.(expense))}
            highlightedPaymentId={highlightedPaymentId}
            onSelectPayment={setHighlightedPaymentId}
          />

          {/* Payment Indications & Approvals */}
          {(visibleIndications.length > 0 || (canIndicate && !paid)) && (
            <div className="space-y-2.5 border-t border-zinc-100 pt-4 dark:border-white/10">
              <div className="flex items-center justify-between gap-2">
                <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    Indicações de pagamento · {pendingIndications.length} pendente
                    {pendingIndications.length === 1 ? '' : 's'}
                  </span>
                </h3>
                {canIndicate && !paid && availableToIndicate > 0 && onIndicate && (
                  <button
                    type="button"
                    onClick={() => onIndicate(expense)}
                    className="text-xs font-semibold text-zinc-700 hover:underline dark:text-zinc-200"
                  >
                    + Indicar
                  </button>
                )}
              </div>

              {visibleIndications.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Você ainda não enviou indicações de pagamento para esta conta.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.02]">
                  {visibleIndications.map((ind) => {
                    const requester = profiles.find((p) => p.id === ind.requesterId);
                    const isRejecting = rejectingIndicationId === ind.id;
                    return (
                      <li key={ind.id} className="space-y-2.5 px-3.5 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            {requester && (
                              <ProfileAvatar profile={requester} size="xs" />
                            )}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                <span>{requester ? requester.name : 'Membro'}</span>
                                <span
                                  aria-hidden="true"
                                  className="text-zinc-300 dark:text-zinc-600"
                                >
                                  ·
                                </span>
                                <span className="font-mono font-normal tabular-nums text-zinc-500 dark:text-zinc-400">
                                  {formatDateBR(ind.date)}
                                </span>
                                <span
                                  aria-hidden="true"
                                  className="text-zinc-300 dark:text-zinc-600"
                                >
                                  ·
                                </span>
                                {ind.status === 'pending' ? (
                                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                                    <Clock className="h-3 w-3" aria-hidden="true" />
                                    <span>Aguardando aceite</span>
                                  </span>
                                ) : ind.status === 'rejected' ? (
                                  <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                                    <XCircle className="h-3 w-3" aria-hidden="true" />
                                    <span>Recusado</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                    <span>Aceito</span>
                                  </span>
                                )}
                              </div>
                              {ind.note && (
                                <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {ind.note}
                                </p>
                              )}
                              {ind.status === 'rejected' && ind.rejectionReason && (
                                <p className="text-[11px] text-red-600 dark:text-red-400">
                                  Motivo: {ind.rejectionReason}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-xs font-bold tabular-nums text-zinc-900 dark:text-white">
                              {formatBRL(ind.amount)}
                            </span>

                            {canModify && ind.status === 'pending' && !isRejecting && (
                              <div className="flex items-center gap-1.5">
                                {onAcceptIndication && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onAcceptIndication(expense.id, ind.id)
                                    }
                                    className="inline-flex min-h-[34px] items-center gap-1 rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                  >
                                    <Check className="h-3 w-3" aria-hidden="true" />
                                    <span>Aceitar</span>
                                  </button>
                                )}
                                {onRejectIndication && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingIndicationId(ind.id);
                                      setRejectReason('');
                                    }}
                                    className="inline-flex min-h-[34px] items-center gap-1 rounded-full border border-red-200 bg-red-50/70 px-3 py-1 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/60"
                                  >
                                    <X className="h-3 w-3" aria-hidden="true" />
                                    <span>Recusar</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {!canModify &&
                              ind.requesterId === currentUser.id &&
                              ind.status === 'pending' &&
                              onCancelIndication && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onCancelIndication(expense.id, ind.id)
                                  }
                                  className="inline-flex min-h-[34px] items-center rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/12 dark:text-zinc-300 dark:hover:bg-white/10"
                                >
                                  Cancelar
                                </button>
                              )}
                          </div>
                        </div>

                        {canModify && isRejecting && onRejectIndication && (
                          <div className="flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-2.5 dark:border-white/10 dark:bg-white/[0.03] sm:flex-row sm:items-center">
                            <input
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Motivo da recusa (opcional)"
                              aria-label="Motivo da recusa"
                              className="h-9 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 outline-none focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:text-zinc-100"
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingIndicationId(null);
                                  setRejectReason('');
                                }}
                                className="min-h-[34px] rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100 dark:border-white/12 dark:text-zinc-300 dark:hover:bg-white/10"
                              >
                                Voltar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onRejectIndication(
                                    expense.id,
                                    ind.id,
                                    rejectReason
                                  );
                                  setRejectingIndicationId(null);
                                  setRejectReason('');
                                }}
                                className="min-h-[34px] rounded-full bg-red-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-red-500"
                              >
                                Confirmar recusa
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Distributed / Recurring Series Navigator */}
          {sortedSeries.length > 1 && onSelectSeriesExpense && (
            <div className="space-y-2 border-t border-zinc-100 pt-4 dark:border-white/10">
              <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Série · {sortedSeries.length}</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {sortedSeries.map((item) => {
                  const isCurrent = item.id === expense.id;
                  const itemPaid = isExpensePaid(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectSeriesExpense(item)}
                      aria-current={isCurrent ? 'true' : undefined}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isCurrent
                          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-white/12 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-white/25'
                      }`}
                    >
                      <span className="font-mono">
                        {item.installmentInfo?.current ?? '?'}/
                        {item.installmentInfo?.total ?? sortedSeries.length}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {formatDateBR(item.date).slice(0, 5)}
                      </span>
                      {itemPaid && (
                        <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment History Ledger */}
          <div className="space-y-2 border-t border-zinc-100 pt-4 dark:border-white/10">
            <div className="flex items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Histórico · {sortedPayments.length}</span>
              </h3>
              {canModify && !paid && (
                <button
                  type="button"
                  onClick={() => onPay(expense)}
                  className="text-xs font-semibold text-zinc-700 hover:underline dark:text-zinc-200"
                >
                  + Pagar
                </button>
              )}
            </div>

            {sortedPayments.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Sem pagamentos registrados.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.02]">
                {sortedPayments.map((p, idx) => {
                  const active = highlightedPaymentId === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setHighlightedPaymentId(active ? null : p.id)
                        }
                        className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors ${
                          active
                            ? 'bg-zinc-100/90 dark:bg-white/[0.07]'
                            : 'hover:bg-zinc-50 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {p.isPartial ? (
                              <Diamond
                                className="h-3 w-3 shrink-0 fill-zinc-400 text-zinc-500 dark:fill-zinc-300 dark:text-zinc-200"
                                aria-hidden="true"
                              />
                            ) : (
                              <CheckCircle2
                                className="h-3.5 w-3.5 shrink-0 text-zinc-700 dark:text-zinc-200"
                                aria-hidden="true"
                              />
                            )}
                            <span>
                              {p.isPartial
                                ? `Pagamento parcial #${idx + 1}`
                                : 'Quitação final'}
                            </span>
                            <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
                              ·
                            </span>
                            <span className="font-mono font-normal tabular-nums text-zinc-500 dark:text-zinc-400">
                              {formatDateBR(p.date)}
                            </span>
                          </div>
                          {p.note && (
                            <p className="truncate pl-5 text-[11px] text-zinc-500 dark:text-zinc-400">
                              {p.note}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-mono text-xs font-bold tabular-nums text-zinc-900 dark:text-white">
                            {formatBRL(p.amount)}
                          </div>
                          <div className="font-mono text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
                            Acum. {formatBRL(p.cumulativeAfter)}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Assignees & Division */}
          <div className="space-y-2 border-t border-zinc-100 pt-4 dark:border-white/10">
            <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                Responsáveis · {assigneeRows.length}
                {expense.assigneeShares ? ' · Personalizada' : ''}
              </span>
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {assigneeRows.map(({ profile, share }) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <ProfileAvatar profile={profile} size="xs" />
                    <span className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {profile.name}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold tabular-nums text-zinc-900 dark:text-white">
                    {formatBRL(share)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {expense.notes && (
            <div className="space-y-1 border-t border-zinc-100 pt-4 dark:border-white/10">
              <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Observações</span>
              </h3>
              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                {expense.notes}
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4 dark:border-white/10">
            {canModify ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEdit(expense);
                    }}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/12 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/10"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDuplicate(expense);
                    }}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/12 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/10"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Duplicar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDelete(expense);
                    }}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-red-200 bg-red-50/70 px-3.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/60"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Excluir</span>
                  </button>
                </div>

                {!paid && (
                  <button
                    type="button"
                    onClick={() => onPay(expense)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-red-600/20 transition-colors hover:bg-red-500"
                  >
                    <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Registrar pagamento</span>
                  </button>
                )}
              </>
            ) : canIndicate ? (
              <>
                <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    Indicações abatem o saldo somente após aceite de{' '}
                    {creator ? creator.name : 'quem criou'}.
                  </span>
                </div>
                {!paid && availableToIndicate > 0 && onIndicate && (
                  <button
                    type="button"
                    onClick={() => onIndicate(expense)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-red-600/20 transition-colors hover:bg-red-500"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Indicar pagamento</span>
                  </button>
                )}
              </>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Somente leitura — apenas o criador pode alterar ou registrar pagamentos.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
