import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Send, X } from 'lucide-react';
import { Expense } from '../types/finance';
import {
  formatBRL,
  formatDateBR,
  getAvailableToIndicateAmount,
  getPendingAmount,
  getPendingIndicatedTotal,
  validatePaymentIndicationInput,
  validatePaymentInput,
} from '../utils/finance';

export type PaymentModalMode = 'register' | 'indicate';

interface PaymentModalProps {
  expense: Expense | null;
  mode?: PaymentModalMode;
  creatorName?: string;
  onClose: () => void;
  onRegisterPayment: (
    expenseId: string,
    amountRaw: string,
    date: string,
    note?: string
  ) => { ok: true } | { ok: false; error: string };
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  expense,
  mode = 'register',
  creatorName,
  onClose,
  onRegisterPayment,
}) => {
  const [amountRaw, setAmountRaw] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const isIndicate = mode === 'indicate';

  useEffect(() => {
    if (!expense) return;
    const defaultVal = isIndicate
      ? getAvailableToIndicateAmount(expense)
      : getPendingAmount(expense);
    setAmountRaw(defaultVal.toFixed(2).replace('.', ','));
    setDate(new Date().toISOString().slice(0, 10));
    setNote('');
    setError('');
  }, [expense, isIndicate]);

  if (!expense) return null;

  const pending = getPendingAmount(expense);
  const pendingIndicated = getPendingIndicatedTotal(expense);
  const availableToIndicate = getAvailableToIndicateAmount(expense);
  const maxSuggested = isIndicate ? availableToIndicate : pending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = isIndicate
      ? validatePaymentIndicationInput(expense, amountRaw)
      : validatePaymentInput(expense, amountRaw);
    if (!check.valid) {
      setError(check.error || 'Valor inválido.');
      setShakeTrigger((n) => n + 1);
      return;
    }

    const res = onRegisterPayment(expense.id, amountRaw, date, note);
    if (!res.ok) {
      setError(res.error);
      setShakeTrigger((n) => n + 1);
      return;
    }

    onClose();
  };

  return (
    <div
      className="animate-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="animate-modal max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-zinc-200/80 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/12 dark:bg-[#12141A]/95 sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <h2
              id="payment-modal-title"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-100"
            >
              {isIndicate ? 'Indicar pagamento' : 'Registrar pagamento'}
            </h2>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {expense.title} · {formatDateBR(expense.date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de pagamento"
            className="flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 divide-x divide-zinc-200 rounded-xl border border-zinc-200 bg-zinc-50/70 py-3 text-center dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.04]">
            <div>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Total
              </div>
              <div className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatBRL(expense.amount)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Quitado
              </div>
              <div className="text-sm font-bold tabular-nums text-zinc-700 dark:text-zinc-200">
                {formatBRL(expense.paidAmount)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Em aberto
              </div>
              <div className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">
                {formatBRL(pending)}
              </div>
            </div>
          </div>

          {isIndicate && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900 dark:border-amber-500/25 dark:bg-amber-950/25 dark:text-amber-200">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <div>
                <p>
                  O saldo só será abatido após{' '}
                  <strong className="font-semibold">{creatorName || 'o criador'}</strong>{' '}
                  aceitar sua indicação.
                </p>
                {pendingIndicated > 0 && (
                  <p className="mt-1 font-mono text-[11px] text-amber-700 dark:text-amber-300">
                    Já há {formatBRL(pendingIndicated)} em análise · Disponível:{' '}
                    {formatBRL(availableToIndicate)}
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="payment-amount"
                  className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Valor do pagamento (R$) *
                </label>
                {maxSuggested > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmountRaw(maxSuggested.toFixed(2).replace('.', ','));
                      setError('');
                    }}
                    className="text-xs font-semibold text-zinc-700 hover:underline dark:text-zinc-300"
                  >
                    {isIndicate ? 'Saldo livre' : 'Quitar tudo'} ({formatBRL(maxSuggested)})
                  </button>
                )}
              </div>
              <input
                id="payment-amount"
                type="text"
                inputMode="decimal"
                value={amountRaw}
                onChange={(e) => {
                  setAmountRaw(e.target.value);
                  if (error) setError('');
                }}
                key={`pay-err-${error ? shakeTrigger : 'ok'}`}
                className={`w-full rounded-xl border px-3.5 py-2.5 font-mono text-sm tabular-nums text-zinc-900 outline-none transition-colors dark:text-zinc-100 ${
                  error
                    ? 'animate-shake border-red-500 bg-red-50/40 ring-2 ring-red-100 dark:bg-red-950/30 dark:ring-red-900/50'
                    : 'border-zinc-200 bg-white focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:focus:border-white/40'
                }`}
              />
              {error && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="payment-date"
                  className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Data
                </label>
                <input
                  id="payment-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:text-zinc-100 dark:scheme-dark dark:focus:border-white/40"
                />
              </div>
              <div>
                <label
                  htmlFor="payment-note"
                  className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Observação
                </label>
                <input
                  id="payment-note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: Pix, comprovante"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-white/40"
                />
              </div>
            </div>

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
                disabled={isIndicate && availableToIndicate <= 0}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {isIndicate ? (
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{isIndicate ? 'Enviar indicação' : 'Confirmar'}</span>
              </button>
            </div>
          </form>

          {expense.payments.length > 0 && (
            <div className="border-t border-zinc-100 pt-3 dark:border-white/10">
              <h3 className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Pagamentos registrados
              </h3>
              <ul className="space-y-1.5">
                {expense.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300"
                  >
                    <span>
                      {formatDateBR(p.date)}
                      {p.note ? ` · ${p.note}` : ''}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                      {formatBRL(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
