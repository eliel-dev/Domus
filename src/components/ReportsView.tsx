import React, { useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Download,
  PieChart,
  Tag,
  Upload,
  Users,
  Wallet,
} from 'lucide-react';
import { AppState, Category, Expense, UserProfile } from '../types/finance';
import {
  computeUserReports,
  formatBRL,
  getMonthLabelPT,
} from '../utils/finance';
import { ProfileAvatar } from './ProfileAvatar';

interface ReportsViewProps {
  currentUser: UserProfile;
  selectedMonth: string;
  onChangeMonth: (delta: number) => void;
  expenses: Expense[];
  categories: Category[];
  profiles: UserProfile[];
  appState: AppState;
  onImportState: (nextState: AppState) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentUser,
  selectedMonth,
  onChangeMonth,
  expenses,
  categories,
  profiles,
  appState,
  onImportState,
}) => {
  const [scope, setScope] = useState<'month' | 'all'>('month');
  const [importMessage, setImportMessage] = useState('');

  const report = computeUserReports(
    expenses,
    categories,
    profiles,
    currentUser.id,
    scope === 'month' ? selectedMonth : undefined
  );

  const maxMonthlyTotal = Math.max(
    1,
    ...report.byMonth.map((m) => m.total)
  );

  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(appState, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        if (
          parsed &&
          Array.isArray(parsed.profiles) &&
          Array.isArray(parsed.expenses)
        ) {
          onImportState(parsed);
          setImportMessage('Backup restaurado.');
        } else {
          setImportMessage('Arquivo inválido.');
        }
      } catch {
        setImportMessage('Erro ao ler JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="animate-enter space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <PieChart className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Relatórios · {currentUser.name}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {scope === 'month' && (
            <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 dark:border-white/10 dark:bg-[#12141A]/85">
              <button
                type="button"
                onClick={() => onChangeMonth(-1)}
                aria-label="Mês anterior nos relatórios"
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onChangeMonth(1)}
                aria-label="Próximo mês nos relatórios"
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="flex items-center rounded-full border border-zinc-200/80 bg-white p-1 dark:border-white/10 dark:bg-[#12141A]/85">
            <button
              type="button"
              onClick={() => setScope('month')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                scope === 'month'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {getMonthLabelPT(selectedMonth)}
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                scope === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              Geral
            </button>
          </div>
        </div>
      </div>

      {/* Resumo Unificado do Escopo */}
      <div className="grid grid-cols-1 divide-y divide-zinc-200/80 rounded-2xl border border-zinc-200/80 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-[#12141A]/85 dark:backdrop-blur-md sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Total</span>
            </span>
            <span className="font-mono tabular-nums">{report.overallSummary.count}</span>
          </div>
          <div className="mt-1.5 font-display text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatBRL(report.overallSummary.total)}
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Quitado</span>
            </span>
            <span className="font-mono tabular-nums">{report.overallSummary.paidCount}</span>
          </div>
          <div className="mt-1.5 font-display text-2xl font-bold tabular-nums text-zinc-700 dark:text-zinc-200">
            {formatBRL(report.overallSummary.paid)}
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Aberto</span>
            </span>
            <span className="font-mono tabular-nums">{report.overallSummary.pendingCount}</span>
          </div>
          <div className="mt-1.5 font-display text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
            {formatBRL(report.overallSummary.pending)}
          </div>
        </div>
      </div>

      {/* Evolução Mensal */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 dark:border-white/10 dark:bg-[#12141A]/85 dark:backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <h3 className="inline-flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            <BarChart3 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
            <span>Mensal</span>
          </h3>
          {report.byMonth.length > 0 && (
            <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-zinc-700 dark:bg-zinc-200" />
                Quitado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500/80 dark:bg-amber-500/75" />
                Aberto
              </span>
            </div>
          )}
        </div>

        {report.byMonth.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Sem lançamentos no histórico.
          </p>
        ) : (
          <div className="mt-4 space-y-3" key={`monthly-${scope}-${selectedMonth}`}>
            {report.byMonth.map((row, idx) => {
              const widthPct = Math.max(
                4,
                Math.round((row.total / maxMonthlyTotal) * 100)
              );
              const paidPct =
                row.total > 0 ? Math.round((row.paid / row.total) * 100) : 0;
              return (
                <div key={row.month} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {row.label}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatBRL(row.total)}{' '}
                      <span className="text-zinc-400 dark:text-zinc-500">
                        · {row.count}
                      </span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
                    <div
                      className="animate-bar-x relative h-full overflow-hidden rounded-full bg-amber-500/80 dark:bg-amber-500/75"
                      style={{
                        width: `${widthPct}%`,
                        animationDelay: `${idx * 45}ms`,
                      }}
                    >
                      <div
                        className="h-full bg-zinc-700 transition-all duration-500 dark:bg-zinc-200"
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Por Categoria */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 dark:border-white/10 dark:bg-[#12141A]/85 dark:backdrop-blur-md">
          <h3 className="inline-flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            <Tag className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
            <span>Categorias</span>
          </h3>
          {report.byCategory.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Sem dados neste período.
            </p>
          ) : (
            <div className="mt-4 space-y-3" key={`cats-${scope}-${selectedMonth}`}>
              {report.byCategory.map((cat, idx) => (
                <div key={cat.categoryId || cat.categoryName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-2 font-semibold text-zinc-800 dark:text-zinc-200">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.categoryName}
                    </span>
                    <span className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatBRL(cat.total)}{' '}
                      <span className="text-zinc-500 dark:text-zinc-400">
                        · {cat.percentage}%
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="animate-bar-x h-full rounded-full"
                      style={{
                        width: `${Math.max(3, cat.percentage)}%`,
                        backgroundColor: cat.color,
                        animationDelay: `${idx * 40}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Por Membro */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 dark:border-white/10 dark:bg-[#12141A]/85 dark:backdrop-blur-md">
          <h3 className="inline-flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            <Users className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
            <span>Membros</span>
          </h3>
          {report.byProfile.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Sem dados neste período.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="pb-2 font-semibold">Membro</th>
                    <th className="pb-2 text-right font-semibold">Total</th>
                    <th className="pb-2 text-right font-semibold">Quitado</th>
                    <th className="pb-2 text-right font-semibold">Aberto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {report.byProfile.map((row) => {
                    const prof = profiles.find((p) => p.id === row.profileId);
                    return (
                      <tr key={row.profileId}>
                        <td className="py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
                          <span className="inline-flex items-center gap-2">
                            {prof ? (
                              <ProfileAvatar profile={prof} size="xs" />
                            ) : (
                              <span
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                style={{ backgroundColor: row.avatarColor }}
                              >
                                {row.profileName.charAt(0).toUpperCase()}
                              </span>
                            )}
                            {row.profileName}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                          {formatBRL(row.total)}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-zinc-700 dark:text-zinc-200">
                          {formatBRL(row.paid)}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400">
                          {formatBRL(row.pending)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Backup em JSON */}
      <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#12141A]/85 dark:backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Database className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Backup JSON
          </h3>
          {importMessage && (
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              · {importMessage}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/12 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Exportar</span>
          </button>
          <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/12 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/10">
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Importar</span>
            <input
              type="file"
              accept="application/json"
              onChange={handleImportBackup}
              className="sr-only"
            />
          </label>
        </div>
      </section>
    </div>
  );
};
