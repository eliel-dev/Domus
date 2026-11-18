import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Diamond,
} from 'lucide-react';
import { Expense } from '../types/finance';
import { formatBRL, formatDateBR } from '../utils/finance';
import {
  buildExpenseTimeline,
  TimelineMilestone,
  TimelineMilestoneStatus,
} from '../utils/timeline';

export type TimelineScaleMode = 'value' | 'chrono';

interface ExpenseTimelineProps {
  expense: Expense;
  canModify?: boolean;
  actionLabel?: string;
  onQuickPay?: () => void;
  highlightedPaymentId?: string | null;
  onSelectPayment?: (paymentId: string | null) => void;
}

function clampEdge(pct: number): number {
  return Math.min(97, Math.max(3, pct));
}

function getLabelAnchorStyle(
  pct: number,
  vertical: Record<string, string>
): React.CSSProperties {
  if (pct <= 10) {
    return { left: '0%', transform: 'translateX(0)', ...vertical };
  }
  if (pct >= 90) {
    return { right: '0%', transform: 'translateX(0)', ...vertical };
  }
  return { left: `${pct}%`, transform: 'translateX(-50%)', ...vertical };
}

function getStatusLabel(milestone: TimelineMilestone): string {
  if (milestone.kind === 'partial_payment') return 'Marco parcial';
  if (milestone.kind === 'full_payment') return 'Quitação total';
  switch (milestone.status) {
    case 'paid':
      return 'Vencimento quitado';
    case 'partial':
      return 'Parcialmente coberto';
    case 'overdue':
      return 'Em atraso';
    case 'pending':
    default:
      return 'Vencimento em aberto';
  }
}

function getStatusBadgeClasses(status: TimelineMilestoneStatus, kind: TimelineMilestone['kind']): string {
  if (kind === 'partial_payment' || status === 'partial') {
    return 'border-zinc-300 bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-100 text-zinc-900 dark:border-zinc-300/60 dark:from-zinc-300/25 dark:via-zinc-200/20 dark:to-zinc-400/25 dark:text-zinc-100';
  }
  if (status === 'paid') {
    return 'border-zinc-300 bg-zinc-900 text-white dark:border-white/25 dark:bg-white dark:text-zinc-950';
  }
  if (status === 'overdue') {
    return 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-300';
  }
  return 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/35 dark:bg-amber-950/40 dark:text-amber-300';
}

export const ExpenseTimeline: React.FC<ExpenseTimelineProps> = ({
  expense,
  canModify = false,
  actionLabel = 'Registrar pagamento',
  onQuickPay,
  highlightedPaymentId = null,
  onSelectPayment,
}) => {
  const model = useMemo(() => buildExpenseTimeline(expense), [expense]);
  const [scaleMode, setScaleMode] = useState<TimelineScaleMode>('value');

  const defaultSelectedId = useMemo(() => {
    if (model.paymentMilestones.length > 0) {
      return model.paymentMilestones[model.paymentMilestones.length - 1].id;
    }
    if (model.dueMilestones.length > 0) {
      const nextPending = model.dueMilestones.find((m) => m.status !== 'paid');
      return (nextPending || model.dueMilestones[0]).id;
    }
    return null;
  }, [model]);

  const [selectedId, setSelectedId] = useState<string | null>(defaultSelectedId);
  const [entered, setEntered] = useState(false);
  const [entranceDone, setEntranceDone] = useState(false);

  useEffect(() => {
    setEntered(false);
    setEntranceDone(false);
    let raf1 = 0;
    let raf2 = 0;
    let doneTimer = 0;
    const totalSteps = Math.min(
      10,
      Math.max(model.paymentMilestones.length, model.dueMilestones.length, model.milestones.length)
    );
    const totalEntranceMs = 220 + totalSteps * 110 + 320;

    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setEntered(true);
        doneTimer = window.setTimeout(() => {
          setEntranceDone(true);
        }, totalEntranceMs);
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(doneTimer);
    };
  }, [expense.id, scaleMode, model.paymentMilestones.length, model.dueMilestones.length, model.milestones.length]);

  useEffect(() => {
    if (highlightedPaymentId) {
      const targetId = `pay_${highlightedPaymentId}`;
      if (model.milestones.some((m) => m.id === targetId)) {
        setSelectedId(targetId);
        return;
      }
    }
    setSelectedId((prev) =>
      prev && model.milestones.some((m) => m.id === prev)
        ? prev
        : defaultSelectedId
    );
  }, [highlightedPaymentId, model.milestones, defaultSelectedId]);

  const orderedMilestones = useMemo(() => {
    if (scaleMode === 'chrono') return model.milestones;
    return [...model.paymentMilestones, ...model.dueMilestones];
  }, [scaleMode, model.milestones, model.paymentMilestones, model.dueMilestones]);

  const selectedMilestone = useMemo(
    () =>
      orderedMilestones.find((m) => m.id === selectedId) ||
      orderedMilestones[0] ||
      null,
    [orderedMilestones, selectedId]
  );

  const selectedIndex = selectedMilestone
    ? orderedMilestones.findIndex((m) => m.id === selectedMilestone.id)
    : -1;

  const handleSelectMilestone = (milestone: TimelineMilestone) => {
    setSelectedId(milestone.id);
    if (onSelectPayment) {
      if (milestone.id.startsWith('pay_') && !milestone.id.startsWith('pay_legacy_')) {
        onSelectPayment(milestone.id.slice(4));
      } else {
        onSelectPayment(null);
      }
    }
  };

  const handleStep = (delta: -1 | 1) => {
    if (orderedMilestones.length === 0) return;
    const base = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIdx =
      (base + delta + orderedMilestones.length) % orderedMilestones.length;
    handleSelectMilestone(orderedMilestones[nextIdx]);
  };

  // Precompute subtle lane staggering so close nodes never collide visually
  const paymentLanes = useMemo(() => {
    const lanes = new Map<string, 0 | 1>();
    let lastPct = -100;
    let currentLane: 0 | 1 = 0;
    model.paymentMilestones.forEach((m) => {
      if (Math.abs(m.scalePercent - lastPct) < 26) {
        currentLane = currentLane === 0 ? 1 : 0;
      } else {
        currentLane = 0;
      }
      lanes.set(m.id, currentLane);
      lastPct = m.scalePercent;
    });
    return lanes;
  }, [model.paymentMilestones]);

  const dueLanes = useMemo(() => {
    const lanes = new Map<string, 0 | 1>();
    let lastPct = -100;
    let currentLane: 0 | 1 = 0;
    model.dueMilestones.forEach((m) => {
      if (Math.abs(m.scalePercent - lastPct) < 28) {
        currentLane = currentLane === 0 ? 1 : 0;
      } else {
        currentLane = 0;
      }
      lanes.set(m.id, currentLane);
      lastPct = m.scalePercent;
    });
    return lanes;
  }, [model.dueMilestones]);

  const needsHorizontalScroll =
    scaleMode === 'value'
      ? model.dueMilestones.length > 6
      : model.milestones.length > 5;

  const trackMinWidthStyle = needsHorizontalScroll
    ? {
        minWidth: `${
          scaleMode === 'value'
            ? model.dueMilestones.length * 88
            : model.milestones.length * 108
        }px`,
      }
    : undefined;

  return (
    <section
      aria-label="Linha do tempo de pagamentos e vencimentos"
      className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5"
    >
      {/* Header & Scale Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Linha do tempo financeira
            </h3>
            <span className="font-mono text-xs font-semibold tabular-nums text-zinc-500 dark:text-zinc-300">
              {Math.round(model.progressPercent)}%
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {model.partialPaymentCount > 0
              ? `${model.partialPaymentCount} ${
                  model.partialPaymentCount === 1
                    ? 'marco parcial em prata'
                    : 'marcos parciais em prata'
                } · `
              : ''}
            {model.dueMilestones.length}{' '}
            {model.dueMilestones.length === 1 ? 'vencimento' : 'vencimentos'}
            {model.nextDueDate
              ? ` · Próximo em ${formatDateBR(model.nextDueDate)}`
              : ' · Totalmente quitado'}
          </p>
        </div>

        <div
          className="inline-flex self-start rounded-full border border-zinc-200 bg-white p-0.5 dark:border-white/12 dark:bg-white/[0.04]"
          role="group"
          aria-label="Modo da escala da linha do tempo"
        >
          <button
            type="button"
            onClick={() => setScaleMode('value')}
            aria-pressed={scaleMode === 'value'}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
              scaleMode === 'value'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            Escala de valor
          </button>
          <button
            type="button"
            onClick={() => setScaleMode('chrono')}
            aria-pressed={scaleMode === 'chrono'}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
              scaleMode === 'chrono'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            Cronológica
          </button>
        </div>
      </div>

      {/* Horizontal Interactive Progress Scale */}
      <div
        className="mt-4 overflow-x-auto pb-2"
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            handleStep(-1);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            handleStep(1);
          }
        }}
      >
        {scaleMode === 'value' ? (
          <div
            style={trackMinWidthStyle}
            className={`px-1 ${
              !needsHorizontalScroll &&
              (model.paymentMilestones.length >= 2 || model.dueMilestones.length >= 3)
                ? 'min-w-[440px] sm:min-w-full'
                : ''
            }`}
          >
            {/* Scale Extremity Labels */}
            <div className="mb-1 flex items-center justify-between font-mono text-[10px] font-medium tabular-nums text-zinc-400 dark:text-zinc-500">
              <span>R$ 0,00</span>
              <span>{formatBRL(model.totalAmount)}</span>
            </div>

            {/* Top Lane: Payment History Milestones (Partial Milestones in Metallic Silver) */}
            <div className="relative h-16">
              {model.paymentMilestones.length === 0 ? (
                <div className="flex h-full items-end pb-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                  Nenhum pagamento parcial ou integral registrado até o momento.
                </div>
              ) : (
                model.paymentMilestones.map((m, idx) => {
                  const selected = selectedMilestone?.id === m.id;
                  const isPartial = m.kind === 'partial_payment';
                  const lane = paymentLanes.get(m.id) ?? 0;
                  const enterDelay = `${160 + Math.min(idx, 8) * 110}ms`;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectMilestone(m)}
                      aria-pressed={selected}
                      aria-label={`${m.title} em ${formatDateBR(m.date)}, ${formatBRL(
                        m.amount
                      )}, acumulado ${formatBRL(m.cumulativePaid)}`}
                      style={{
                        ...getLabelAnchorStyle(m.scalePercent, {
                          bottom: lane === 1 ? '32px' : '4px',
                        }),
                        transitionDelay: entered && !entranceDone ? enterDelay : '0ms',
                      }}
                      className={`group absolute flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:scale-100 motion-reduce:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 whitespace-nowrap ${
                        entered
                          ? 'opacity-100 translate-y-0 scale-100'
                          : 'opacity-0 translate-y-1.5 scale-90'
                      } ${
                        isPartial
                          ? selected
                            ? 'z-20 border-zinc-400 bg-gradient-to-b from-[#FFFFFF] via-[#E4E7EC] to-[#C2C8D2] text-zinc-950 shadow-[0_0_0_3px_rgba(212,212,216,0.35)] dark:border-zinc-200 dark:from-[#F4F5F7] dark:via-[#D4D8E0] dark:to-[#A6AEBA] dark:text-zinc-950'
                            : 'z-10 border-zinc-300 bg-gradient-to-b from-[#F4F5F7] to-[#D4D8E0] text-zinc-800 hover:border-zinc-400 dark:border-zinc-300/65 dark:from-zinc-200/25 dark:to-zinc-400/20 dark:text-zinc-100 dark:hover:border-zinc-200'
                          : selected
                          ? 'z-20 border-zinc-900 bg-zinc-900 text-white shadow-md dark:border-white dark:bg-white dark:text-zinc-950'
                          : 'z-10 border-zinc-300 bg-zinc-800 text-white hover:bg-zinc-900 dark:border-white/40 dark:bg-zinc-100 dark:text-zinc-950'
                      }`}
                    >
                      {isPartial ? (
                        <Diamond
                          className="h-2.5 w-2.5 shrink-0 fill-current"
                          aria-hidden="true"
                        />
                      ) : (
                        <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                      )}
                      <span className="font-mono tabular-nums">
                        {formatBRL(m.amount)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Central Horizontal Progress Track */}
            <div className="relative flex h-6 items-center">
              {/* Background Rail */}
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-zinc-200/90 dark:bg-white/10">
                {/* Subtle Quarter Grid Ticks */}
                {[25, 50, 75].map((tick) => (
                  <span
                    key={tick}
                    style={{ left: `${tick}%` }}
                    className="pointer-events-none absolute top-0 bottom-0 w-px bg-zinc-300/70 dark:bg-white/10"
                    aria-hidden="true"
                  />
                ))}

                {/* Active Silver Progress Fill */}
                <div
                  className={`h-full origin-left rounded-full bg-gradient-to-r from-zinc-500 via-zinc-400 to-zinc-300 transition-transform duration-500 ease-out motion-reduce:transition-none motion-reduce:scale-x-100 dark:from-zinc-500 dark:via-zinc-300 dark:to-zinc-100 ${
                    entered ? 'scale-x-100' : 'scale-x-0'
                  }`}
                  style={{ width: `${model.progressPercent}%` }}
                />
              </div>

              {/* Payment Milestone Anchor Nodes on Rail (Sequential Silver Fade + Scale Expand) */}
              {model.paymentMilestones.map((m, idx) => {
                const selected = selectedMilestone?.id === m.id;
                const isPartial = m.kind === 'partial_payment';
                const xPct = clampEdge(m.scalePercent);
                const enterDelay = `${120 + Math.min(idx, 8) * 110}ms`;
                return (
                  <button
                    key={`node_${m.id}`}
                    type="button"
                    onClick={() => handleSelectMilestone(m)}
                    aria-label={`Selecionar ${m.title}`}
                    style={{
                      left: `${xPct}%`,
                      transitionDelay: entered && !entranceDone ? enterDelay : '0ms',
                    }}
                    className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 ${
                      !entered
                        ? 'z-10 opacity-0 scale-0'
                        : selected
                        ? 'z-20 opacity-100 scale-125'
                        : 'z-10 opacity-100 scale-100 hover:scale-115'
                    } ${
                      isPartial
                        ? 'h-4 w-4 border-2 border-white bg-gradient-to-br from-[#F9FAFB] via-[#D1D5DB] to-[#9CA3AF] shadow-[0_0_0_2px_rgba(161,161,170,0.5)] dark:border-[#12141A] dark:from-[#FFFFFF] dark:via-[#D4D4D8] dark:to-[#71717A] dark:shadow-[0_0_0_2px_rgba(228,228,231,0.55)]'
                        : 'h-4 w-4 border-2 border-white bg-zinc-900 shadow-sm dark:border-[#12141A] dark:bg-white'
                    }`}
                  />
                );
              })}

              {/* Due-date Tick Anchors on Rail */}
              {model.dueMilestones.map((m, idx) => {
                const xPct = clampEdge(m.scalePercent);
                const selected = selectedMilestone?.id === m.id;
                const enterDelay = `${80 + Math.min(idx, 10) * 70}ms`;
                return (
                  <button
                    key={`due_dot_${m.id}`}
                    type="button"
                    onClick={() => handleSelectMilestone(m)}
                    aria-label={`Vencimento ${m.title} em ${formatDateBR(m.date)}`}
                    style={{
                      left: `${xPct}%`,
                      transitionDelay: entered && !entranceDone ? enterDelay : '0ms',
                    }}
                    className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:scale-100 ${
                      !entered
                        ? 'z-0 opacity-0 scale-0'
                        : selected
                        ? 'z-20 opacity-100 scale-125'
                        : 'z-0 opacity-100 scale-100 hover:scale-110'
                    } ${
                      m.status === 'paid'
                        ? 'h-2.5 w-2.5 rounded-full bg-zinc-800 ring-2 ring-white dark:bg-zinc-100 dark:ring-[#12141A]'
                        : m.status === 'partial'
                        ? 'h-3 w-3 rounded-full border-2 border-zinc-400 bg-zinc-200 dark:border-zinc-200 dark:bg-zinc-600'
                        : m.status === 'overdue'
                        ? 'h-3 w-3 rounded-full border-2 border-red-500 bg-red-100 dark:border-red-400 dark:bg-red-950'
                        : 'h-3 w-3 rounded-full border-2 border-amber-500 bg-white dark:border-amber-400 dark:bg-[#12141A]'
                    }`}
                  />
                );
              })}
            </div>

            {/* Bottom Lane: Due Dates along the Value Scale */}
            <div className="relative h-16">
              {model.dueMilestones.map((m, idx) => {
                const selected = selectedMilestone?.id === m.id;
                const lane = dueLanes.get(m.id) ?? 0;
                const enterDelay = `${110 + Math.min(idx, 10) * 70}ms`;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMilestone(m)}
                    aria-pressed={selected}
                    aria-label={`${m.title}: ${formatDateBR(m.date)}, valor ${formatBRL(
                      m.amount
                    )}, ${getStatusLabel(m)}`}
                    style={{
                      ...getLabelAnchorStyle(m.scalePercent, {
                        top: lane === 1 ? '32px' : '4px',
                      }),
                      transitionDelay: entered && !entranceDone ? enterDelay : '0ms',
                    }}
                    className={`absolute inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:scale-100 motion-reduce:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 whitespace-nowrap ${
                      entered
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 -translate-y-1 scale-95'
                    } ${
                      selected
                        ? getStatusBadgeClasses(m.status, m.kind) + ' z-20 ring-2 ring-zinc-400/40'
                        : m.status === 'partial'
                        ? 'z-10 border-zinc-300 bg-zinc-100/90 text-zinc-700 hover:border-zinc-400 dark:border-zinc-400/40 dark:bg-zinc-300/10 dark:text-zinc-200'
                        : m.status === 'paid'
                        ? 'z-10 border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 dark:border-white/15 dark:bg-white/[0.06] dark:text-zinc-300'
                        : m.status === 'overdue'
                        ? 'z-10 border-red-300 bg-red-50/90 text-red-700 hover:border-red-400 dark:border-red-500/35 dark:bg-red-950/40 dark:text-red-300'
                        : 'z-10 border-amber-300/80 bg-amber-50/70 text-amber-800 hover:border-amber-400 dark:border-amber-500/30 dark:bg-amber-950/25 dark:text-amber-300'
                    }`}
                  >
                    <CalendarClock className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                    <span className="font-mono tabular-nums">{m.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Chronological Time-Ordered Horizontal Scale */
          <div style={trackMinWidthStyle} className="px-2 py-2">
            <div className="relative flex items-start justify-between gap-3">
              {/* Horizontal connector line behind event stops */}
              <div
                className={`pointer-events-none absolute left-6 right-6 top-4 h-0.5 origin-left bg-zinc-200 transition-transform duration-500 ease-out motion-reduce:transition-none motion-reduce:scale-x-100 dark:bg-white/12 ${
                  entered ? 'scale-x-100' : 'scale-x-0'
                }`}
                aria-hidden="true"
              />

              {model.milestones.map((m, idx) => {
                const selected = selectedMilestone?.id === m.id;
                const isPartial = m.kind === 'partial_payment' || m.status === 'partial';
                const isPayment =
                  m.kind === 'partial_payment' || m.kind === 'full_payment';
                const enterDelay = `${90 + Math.min(idx, 10) * 85}ms`;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMilestone(m)}
                    aria-pressed={selected}
                    className="group relative z-10 flex min-w-[92px] flex-1 flex-col items-center text-center focus-visible:outline-none"
                  >
                    <span
                      style={{ transitionDelay: entered && !entranceDone ? enterDelay : '0ms' }}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:scale-100 group-focus-visible:ring-2 group-focus-visible:ring-red-500 ${
                        !entered
                          ? 'opacity-0 scale-0'
                          : selected
                          ? 'opacity-100 scale-115'
                          : 'opacity-100 scale-100 group-hover:scale-105'
                      } ${
                        m.kind === 'partial_payment'
                          ? 'border-white bg-gradient-to-br from-[#F9FAFB] via-[#D1D5DB] to-[#9CA3AF] text-zinc-950 shadow-[0_0_0_2px_rgba(161,161,170,0.45)] dark:border-[#12141A] dark:from-[#FFFFFF] dark:via-[#D4D4D8] dark:to-[#71717A]'
                          : m.status === 'paid'
                          ? 'border-white bg-zinc-900 text-white dark:border-[#12141A] dark:bg-white dark:text-zinc-950'
                          : isPartial
                          ? 'border-zinc-400 bg-zinc-200 text-zinc-900 dark:border-zinc-300 dark:bg-zinc-700 dark:text-zinc-100'
                          : m.status === 'overdue'
                          ? 'border-red-500 bg-red-100 text-red-700 dark:border-red-400 dark:bg-red-950 dark:text-red-300'
                          : 'border-amber-500 bg-white text-amber-700 dark:border-amber-400 dark:bg-[#12141A] dark:text-amber-300'
                      }`}
                    >
                      {m.kind === 'partial_payment' ? (
                        <Diamond className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      ) : m.status === 'paid' ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : m.status === 'overdue' ? (
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </span>

                    <span
                      style={{ transitionDelay: entered && !entranceDone ? enterDelay : '0ms' }}
                      className={`mt-2 font-mono text-[11px] font-semibold tabular-nums text-zinc-700 transition-opacity duration-300 ease-out motion-reduce:transition-none motion-reduce:opacity-100 dark:text-zinc-200 ${
                        entered ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      {formatDateBR(m.date)}
                    </span>
                    <span
                      style={{ transitionDelay: entered && !entranceDone ? enterDelay : '0ms' }}
                      className={`mt-0.5 text-[11px] font-medium leading-tight transition-opacity duration-300 ease-out motion-reduce:transition-none motion-reduce:opacity-100 ${
                        entered ? 'opacity-100' : 'opacity-0'
                      } ${
                        isPayment
                          ? 'text-zinc-900 dark:text-white'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {m.title}
                    </span>
                    <span
                      style={{ transitionDelay: entered && !entranceDone ? enterDelay : '0ms' }}
                      className={`mt-0.5 font-mono text-[11px] tabular-nums text-zinc-500 transition-opacity duration-300 ease-out motion-reduce:transition-none motion-reduce:opacity-100 dark:text-zinc-400 ${
                        entered ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      {formatBRL(m.amount)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-zinc-200/70 pt-3 text-[11px] text-zinc-500 dark:border-white/10 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border border-zinc-400 bg-gradient-to-br from-[#F4F5F7] to-[#9CA3AF] dark:border-zinc-200"
            aria-hidden="true"
          />
          <span>Marco parcial (prata)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-900 dark:bg-white"
            aria-hidden="true"
          />
          <span>Quitado</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border-2 border-amber-500 bg-transparent dark:border-amber-400"
            aria-hidden="true"
          />
          <span>Vencimento em aberto</span>
        </span>
        {model.overdueCount > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border-2 border-red-500 bg-transparent dark:border-red-400"
              aria-hidden="true"
            />
            <span>Em atraso</span>
          </span>
        )}
      </div>

      {/* Interactive Milestone Inspector Panel */}
      {selectedMilestone && (
        <div
          className="mt-3 rounded-xl border border-zinc-200/90 bg-white p-3.5 dark:border-white/10 dark:bg-[#12141A]/90"
          aria-live="polite"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 font-semibold ${
                    selectedMilestone.kind === 'partial_payment' ||
                    selectedMilestone.status === 'partial'
                      ? 'text-zinc-700 dark:text-zinc-200'
                      : selectedMilestone.status === 'paid'
                      ? 'text-zinc-900 dark:text-white'
                      : selectedMilestone.status === 'overdue'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {selectedMilestone.kind === 'partial_payment' ||
                  selectedMilestone.status === 'partial' ? (
                    <Diamond
                      className="h-3 w-3 shrink-0 fill-zinc-400 text-zinc-500 dark:fill-zinc-300 dark:text-zinc-200"
                      aria-hidden="true"
                    />
                  ) : selectedMilestone.status === 'paid' ? (
                    <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  ) : selectedMilestone.status === 'overdue' ? (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>{getStatusLabel(selectedMilestone)}</span>
                </span>
                <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
                  ·
                </span>
                <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                  {formatDateBR(selectedMilestone.date)}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedMilestone.title}
                </h4>
                <span className="font-mono text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                  {formatBRL(selectedMilestone.amount)}
                </span>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {selectedMilestone.kind === 'due_date' ? (
                  <>
                    {selectedMilestone.note}
                    {selectedMilestone.remainingAfter > 0
                      ? ` · Falta ${formatBRL(selectedMilestone.remainingAfter)} até este marco`
                      : ''}
                  </>
                ) : (
                  <>
                    Acumulado quitado:{' '}
                    <strong className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatBRL(selectedMilestone.cumulativePaid)}
                    </strong>{' '}
                    ({Math.round(selectedMilestone.scalePercent)}%)
                    {selectedMilestone.remainingAfter > 0
                      ? ` · Saldo restante: ${formatBRL(selectedMilestone.remainingAfter)}`
                      : ' · Despesa totalmente quitada'}
                    {selectedMilestone.note ? ` · ${selectedMilestone.note}` : ''}
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {orderedMilestones.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStep(-1)}
                    aria-label="Marco anterior"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/12 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStep(1)}
                    aria-label="Próximo marco"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/12 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              {canModify &&
                model.pendingAmount > 0 &&
                onQuickPay &&
                selectedMilestone.status !== 'paid' && (
                  <button
                    type="button"
                    onClick={onQuickPay}
                    className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 whitespace-nowrap"
                  >
                    <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{actionLabel}</span>
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
