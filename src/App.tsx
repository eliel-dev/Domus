import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderKanban,
  HelpCircle,
  Home,
  Moon,
  PieChart,
  Plus,
  Receipt,
  Search,
  Sun,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  AppState,
  Expense,
  ExpenseFormInput,
  PeriodScope,
  ProfileRole,
  UserProfile,
} from './types/finance';
import { DomusBrand } from './components/DomusBrand';
import {
  acceptPaymentIndicationInState,
  addExpenseToState,
  canAccessAdminFeatures,
  cancelPaymentIndicationInState,
  cascadeDeleteProfile,
  compensateBilateralBalanceInState,
  computeBilateralBalances,
  computeMemberStatsForCasa,
  computeSummaryMetrics,
  createPaymentIndicationInState,
  deleteExpenseFromState,
  filterExpensesByMonth,
  formatBRL,
  formatDateBR,
  getHomeSectionsForUser,
  getMonthLabelPT,
  getPendingIndications,
  getVisibleExpensesForUser,
  isExpensePaid,
  registerPaymentInState,
  rejectPaymentIndicationInState,
  roundCents,
  shiftYearMonth,
  updateExpenseInState,
} from './utils/finance';
import {
  createProfileInState,
  deleteCategoryFromState,
  loadAppState,
  saveAppState,
  saveCategoryInState,
  updateProfileInState,
} from './utils/storage';
import { ExpenseRow } from './components/ExpenseRow';
import { ExpenseDetailModal } from './components/ExpenseDetailModal';
import { ExpenseFormModal } from './components/ExpenseFormModal';
import { PaymentModal, PaymentModalMode } from './components/PaymentModal';
import { PersonBalanceModal } from './components/PersonBalanceModal';
import { UserDetailModal } from './components/UserDetailModal';
import { ProfileSwitcherModal } from './components/ProfileSwitcherModal';
import { ProfileAvatar } from './components/ProfileAvatar';
import { ManagePeopleView } from './components/ManagePeopleView';
import { CategoriesView } from './components/CategoriesView';
import { ReportsView } from './components/ReportsView';
import { TutorialOverlay, TutorialStep } from './components/TutorialOverlay';

type ActiveTab = 'home' | 'reports' | 'categories' | 'people';
type StatusFilter = 'all' | 'pending' | 'paid';
type ThemeMode = 'light' | 'dark';
type HomeSectionTab = 'people' | 'members' | 'all' | 'i-owe' | 'mine' | 'owed-to-me';

const THEME_STORAGE_KEY = 'casaconta_theme_v1';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });
  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');
  const [periodScope, setPeriodScope] = useState<PeriodScope>('month');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Modals
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [duplicatingExpense, setDuplicatingExpense] = useState<Expense | null>(null);
  const [detailExpenseId, setDetailExpenseId] = useState<string | null>(null);
  const [paymentModalState, setPaymentModalState] = useState<{
    expenseId: string;
    mode: PaymentModalMode;
  } | null>(null);
  const [panelRejectTarget, setPanelRejectTarget] = useState<{
    expenseId: string;
    indicationId: string;
  } | null>(null);
  const [panelRejectReason, setPanelRejectReason] = useState('');
  const [approvalFeedbackError, setApprovalFeedbackError] = useState('');
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [detailPersonId, setDetailPersonId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'switch' | 'edit-own'>('switch');
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const currentUser = useMemo<UserProfile>(() => {
    return (
      appState.profiles.find((p) => p.id === appState.activeUserId) ||
      appState.profiles[0]
    );
  }, [appState.profiles, appState.activeUserId]);

  const isCasa = canAccessAdminFeatures(currentUser);

  const [homeSection, setHomeSection] = useState<HomeSectionTab>(() =>
    isCasa ? 'members' : 'people'
  );

  // Reset sub-tab when switching between Casa and regular member
  useEffect(() => {
    setHomeSection(isCasa ? 'members' : 'people');
    setDetailPersonId(null);
  }, [isCasa, currentUser.id]);

  // Redirect regular user away from 'people' tab
  useEffect(() => {
    if (!isCasa && activeTab === 'people') {
      setActiveTab('home');
    }
  }, [isCasa, activeTab]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab]);

  const userCategories = useMemo(
    () => appState.categories.filter((c) => c.ownerId === currentUser.id),
    [appState.categories, currentUser.id]
  );

  const monthExpensesAll = useMemo(
    () => filterExpensesByMonth(appState.expenses, selectedMonth),
    [appState.expenses, selectedMonth]
  );

  const scopedExpensesAll = useMemo(
    () => (periodScope === 'all' ? appState.expenses : monthExpensesAll),
    [periodScope, appState.expenses, monthExpensesAll]
  );

  const visibleScopedExpenses = useMemo(
    () => getVisibleExpensesForUser(scopedExpensesAll, currentUser),
    [scopedExpensesAll, currentUser]
  );

  const filteredScopedExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visibleScopedExpenses
      .filter((exp) => {
        if (statusFilter === 'pending' && isExpensePaid(exp)) return false;
        if (statusFilter === 'paid' && !isExpensePaid(exp)) return false;
        if (q) {
          const matchTitle = exp.title.toLowerCase().includes(q);
          const matchNotes = (exp.notes || '').toLowerCase().includes(q);
          return matchTitle || matchNotes;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [visibleScopedExpenses, searchQuery, statusFilter]);

  const kpiSummary = useMemo(
    () => computeSummaryMetrics(visibleScopedExpenses),
    [visibleScopedExpenses]
  );

  const homeSections = useMemo(
    () => getHomeSectionsForUser(filteredScopedExpenses, currentUser),
    [filteredScopedExpenses, currentUser]
  );

  const bilateralBalances = useMemo(() => {
    if (isCasa) return [];
    return computeBilateralBalances(
      scopedExpensesAll,
      currentUser.id,
      appState.profiles
    );
  }, [isCasa, scopedExpensesAll, currentUser.id, appState.profiles]);

  const filteredBilateralBalances = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bilateralBalances.filter((b) => {
      if (statusFilter === 'pending' && b.iOwe <= 0 && b.theyOweMe <= 0) {
        return false;
      }
      if (
        statusFilter === 'paid' &&
        (b.iOwe > 0 || b.theyOweMe > 0 || b.expensesBetween.length === 0)
      ) {
        return false;
      }
      if (q) {
        const matchName = b.profile.name.toLowerCase().includes(q);
        const matchExp = b.expensesBetween.some(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            (e.notes || '').toLowerCase().includes(q)
        );
        return matchName || matchExp;
      }
      return true;
    });
  }, [bilateralBalances, searchQuery, statusFilter]);

  const bilateralTotals = useMemo(() => {
    let totalIOwe = 0;
    let totalTheyOweMe = 0;
    let totalCompensable = 0;
    for (const b of bilateralBalances) {
      totalIOwe = roundCents(totalIOwe + b.iOwe);
      totalTheyOweMe = roundCents(totalTheyOweMe + b.theyOweMe);
      totalCompensable = roundCents(totalCompensable + b.compensableAmount);
    }
    return {
      totalIOwe,
      totalTheyOweMe,
      netTotal: roundCents(totalTheyOweMe - totalIOwe),
      totalCompensable,
    };
  }, [bilateralBalances]);

  const detailPersonSummary = useMemo(
    () =>
      detailPersonId
        ? bilateralBalances.find((b) => b.profile.id === detailPersonId) || null
        : null,
    [detailPersonId, bilateralBalances]
  );

  const regularProfiles = useMemo(
    () => appState.profiles.filter((p) => p.role !== ProfileRole.CASA),
    [appState.profiles]
  );

  const detailExpense = useMemo(
    () => appState.expenses.find((e) => e.id === detailExpenseId) || null,
    [appState.expenses, detailExpenseId]
  );

  const detailSeriesExpenses = useMemo(() => {
    const seriesId = detailExpense?.installmentInfo?.seriesId;
    if (!seriesId) return [];
    return appState.expenses.filter(
      (e) => e.installmentInfo?.seriesId === seriesId
    );
  }, [appState.expenses, detailExpense]);

  const paymentExpense = useMemo(
    () =>
      paymentModalState
        ? appState.expenses.find((e) => e.id === paymentModalState.expenseId) || null
        : null,
    [appState.expenses, paymentModalState]
  );

  const paymentExpenseCreator = useMemo(() => {
    if (!paymentExpense) return undefined;
    return appState.profiles.find((p) => p.id === paymentExpense.creatorId)?.name;
  }, [appState.profiles, paymentExpense]);

  const pendingApprovals = useMemo(() => {
    const profileMap = new Map(appState.profiles.map((p) => [p.id, p]));
    const items: {
      expense: Expense;
      indication: NonNullable<Expense['paymentIndications']>[number];
      requester: UserProfile | undefined;
    }[] = [];

    for (const exp of appState.expenses) {
      if (exp.creatorId !== currentUser.id) continue;
      for (const ind of getPendingIndications(exp)) {
        items.push({
          expense: exp,
          indication: ind,
          requester: profileMap.get(ind.requesterId),
        });
      }
    }

    return items.sort((a, b) =>
      b.indication.createdAt.localeCompare(a.indication.createdAt)
    );
  }, [appState.expenses, appState.profiles, currentUser.id]);

  const detailUser = useMemo(
    () => appState.profiles.find((p) => p.id === detailUserId) || null,
    [appState.profiles, detailUserId]
  );

  const defaultExpenseDate = useMemo(() => {
    const today = new Date();
    const day = String(Math.min(28, today.getDate())).padStart(2, '0');
    return `${selectedMonth}-${day}`;
  }, [selectedMonth]);

  // Handlers
  const handleSaveExpense = (input: ExpenseFormInput, editingId?: string) => {
    if (editingId) {
      const res = updateExpenseInState(appState, currentUser.id, editingId, input);
      if (!res.ok) return { ok: false as const, errors: res.errors };
      setAppState(res.state);
      return { ok: true as const };
    }
    const res = addExpenseToState(appState, currentUser.id, input);
    if (!res.ok) return { ok: false as const, errors: res.errors };
    setAppState(res.state);
    return { ok: true as const };
  };

  const handleConfirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    const res = deleteExpenseFromState(
      appState,
      currentUser.id,
      expenseToDelete.id
    );
    if (res.ok) {
      setAppState(res.state);
    }
    setExpenseToDelete(null);
  };

  const handlePaymentModalSubmit = (
    expenseId: string,
    amountRaw: string,
    date: string,
    note?: string
  ) => {
    if (paymentModalState?.mode === 'indicate') {
      const res = createPaymentIndicationInState(
        appState,
        currentUser.id,
        expenseId,
        amountRaw,
        date,
        note
      );
      if (!res.ok) return { ok: false as const, error: res.error };
      setAppState(res.state);
      return { ok: true as const };
    }

    const res = registerPaymentInState(
      appState,
      currentUser.id,
      expenseId,
      amountRaw,
      date,
      note
    );
    if (!res.ok) return { ok: false as const, error: res.error };
    setAppState(res.state);
    return { ok: true as const };
  };

  const handleAcceptIndication = (expenseId: string, indicationId: string) => {
    const res = acceptPaymentIndicationInState(
      appState,
      currentUser.id,
      expenseId,
      indicationId
    );
    if (!res.ok) {
      setApprovalFeedbackError(res.error);
      return;
    }
    setApprovalFeedbackError('');
    setPanelRejectTarget(null);
    setPanelRejectReason('');
    setAppState(res.state);
  };

  const handleRejectIndication = (
    expenseId: string,
    indicationId: string,
    reason?: string
  ) => {
    const res = rejectPaymentIndicationInState(
      appState,
      currentUser.id,
      expenseId,
      indicationId,
      reason
    );
    if (!res.ok) {
      setApprovalFeedbackError(res.error);
      return;
    }
    setApprovalFeedbackError('');
    setPanelRejectTarget(null);
    setPanelRejectReason('');
    setAppState(res.state);
  };

  const handleCancelIndication = (expenseId: string, indicationId: string) => {
    const res = cancelPaymentIndicationInState(
      appState,
      currentUser.id,
      expenseId,
      indicationId
    );
    if (res.ok) {
      setAppState(res.state);
    }
  };

  const handleCompensatePerson = (otherProfileId: string) => {
    const res = compensateBilateralBalanceInState(
      appState,
      currentUser.id,
      otherProfileId,
      periodScope,
      selectedMonth
    );
    if (!res.ok) {
      return { ok: false as const, error: res.error };
    }
    setAppState(res.state);
    return { ok: true as const, compensatedAmount: res.compensatedAmount };
  };

  const handleSwitchUser = (userId: string) => {
    setAppState((prev) => ({ ...prev, activeUserId: userId }));
    setSessionUnlocked(true);
    setDetailUserId(null);
    setDetailPersonId(null);
    setSearchQuery('');
    setPanelRejectTarget(null);
    setPanelRejectReason('');
    setApprovalFeedbackError('');
  };

  const handleUpdateOwnProfile = (
    name: string,
    password: string,
    avatarId?: string,
    avatarColor?: string
  ) => {
    const res = updateProfileInState(
      appState,
      currentUser.id,
      currentUser.id,
      name,
      password,
      avatarId,
      avatarColor
    );
    if (!res.ok) return { ok: false as const, error: res.error };
    setAppState(res.state);
    return { ok: true as const };
  };

  const handleCreateProfile = (
    name: string,
    password: string,
    avatarColor: string,
    avatarId?: string
  ) => {
    const res = createProfileInState(
      appState,
      currentUser.id,
      name,
      password,
      avatarColor,
      avatarId
    );
    if (!res.ok) return { ok: false as const, error: res.error };
    setAppState(res.state);
    return { ok: true as const };
  };

  const handleUpdateProfileAdmin = (
    targetId: string,
    name: string,
    password: string,
    avatarId?: string,
    avatarColor?: string
  ) => {
    const res = updateProfileInState(
      appState,
      currentUser.id,
      targetId,
      name,
      password,
      avatarId,
      avatarColor
    );
    if (!res.ok) return { ok: false as const, error: res.error };
    setAppState(res.state);
    return { ok: true as const };
  };

  const handleDeleteProfileAdmin = (targetId: string) => {
    const res = cascadeDeleteProfile(appState, currentUser.id, targetId);
    if (!res.ok) return { ok: false as const, error: res.error };
    setAppState(res.state);
    return { ok: true as const };
  };

  const handleSaveCategory = (
    name: string,
    color: string,
    categoryId?: string
  ) => {
    const res = saveCategoryInState(
      appState,
      currentUser.id,
      name,
      color,
      categoryId
    );
    if (!res.ok) return { ok: false as const, error: res.error };
    setAppState(res.state);
    return { ok: true as const, category: res.category };
  };

  const handleDeleteCategory = (categoryId: string) => {
    const res = deleteCategoryFromState(appState, currentUser.id, categoryId);
    if (!res.ok) return { ok: false as const, error: res.error };
    setAppState(res.state);
    return { ok: true as const };
  };



  const handleCloseTutorial = (markDismissed: boolean) => {
    setTutorialOpen(false);
    if (markDismissed) {
      setAppState((prev) => ({
        ...prev,
        dismissedTutorials: {
          ...prev.dismissedTutorials,
          [currentUser.id]: true,
        },
      }));
    }
  };

  const tutorialSteps: TutorialStep[] = [
    {
      targetTourId: 'month-nav',
      title: 'Período: Mês atual ou Geral',
      description:
        'Alterne entre o mês de referência e o acumulado Geral de todos os meses para consultar seus saldos completos.',
    },
    {
      targetTourId: 'new-expense-btn',
      title: 'Lançar novo gasto',
      description:
        'Registre gastos com parcelas (1 a 60x), divisão personalizada e responsáveis a partir deste botão.',
    },
    {
      targetTourId: 'kpi-cards',
      title: 'Resumo financeiro',
      description:
        'Veja de relance o Total do período escolhido, o quanto já foi Quitado e o saldo Em aberto.',
    },
    {
      targetTourId: 'main-sections',
      title: isCasa ? 'Visões do painel' : 'Pessoas, saldos e compensação',
      description: isCasa
        ? 'Alterne entre Membros (com cota individual exata) e Todas as contas da casa e aprove indicações no topo.'
        : 'Na aba Pessoas você vê o saldo líquido com a Casa e cada morador, além de compensar dívidas mútuas com um clique.',
    },
    {
      targetTourId: 'profile-btn',
      title: 'Trocar de perfil ou senha',
      description:
        'Alterne rapidamente entre os membros da casa ou atualize seu nome e senha de acesso.',
    },
  ];

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  }[] = [
    { id: 'home', label: 'Painel', icon: Home },
    { id: 'reports', label: 'Relatórios', icon: PieChart },
    { id: 'categories', label: 'Categorias', icon: FolderKanban },
    ...(isCasa ? [{ id: 'people' as ActiveTab, label: 'Membros', icon: Users }] : []),
  ];

  const homeTabs: {
    id: HomeSectionTab;
    label: string;
    count: number;
  }[] = isCasa
    ? [
        { id: 'members', label: 'Membros', count: regularProfiles.length },
        { id: 'all', label: 'Todas', count: homeSections.allExpenses.length },
      ]
    : [
        { id: 'people', label: 'Pessoas', count: bilateralBalances.length },
        { id: 'mine', label: 'Minhas', count: homeSections.myExpenses.length },
        { id: 'owed-to-me', label: 'A Receber', count: homeSections.owedToMeExpenses.length },
      ];

  const activeExpensesList = useMemo(() => {
    switch (homeSection) {
      case 'all':
        return homeSections.allExpenses;
      case 'i-owe':
        return homeSections.iOweOthersExpenses;
      case 'owed-to-me':
        return homeSections.owedToMeExpenses;
      case 'mine':
      default:
        return homeSections.myExpenses;
    }
  }, [homeSection, homeSections]);

  const activePeriodEmptyLabel =
    periodScope === 'all' ? 'no geral' : `em ${getMonthLabelPT(selectedMonth)}`;

  const activeSectionMeta = useMemo(() => {
    switch (homeSection) {
      case 'all':
        return {
          title: 'Todas as contas',
          emptyText: `Sem lançamentos ${activePeriodEmptyLabel}.`,
        };
      case 'i-owe':
        return {
          title: 'A pagar',
          emptyText: `Sem pendências ${activePeriodEmptyLabel}.`,
        };
      case 'owed-to-me':
        return {
          title: 'A receber',
          emptyText: `Sem valores a receber ${activePeriodEmptyLabel}.`,
        };
      case 'mine':
      default:
        return {
          title: currentUser.name,
          emptyText: `Sem lançamentos ${activePeriodEmptyLabel}.`,
        };
    }
  }, [homeSection, currentUser.name, activePeriodEmptyLabel]);

  const recentUserTemplates = useMemo(
    () => appState.expenses.filter((e) => e.creatorId === currentUser.id),
    [appState.expenses, currentUser.id]
  );

  const openNewExpenseModal = () => {
    setEditingExpense(null);
    setDuplicatingExpense(null);
    setExpenseModalOpen(true);
  };

  const openDuplicateExpenseModal = (item: Expense) => {
    setEditingExpense(null);
    setDuplicatingExpense(item);
    setExpenseModalOpen(true);
  };

  if (!sessionUnlocked) {
    return (
      <ProfileSwitcherModal
        isOpen={true}
        canDismiss={false}
        initialTab="switch"
        theme={theme}
        onToggleTheme={toggleTheme}
        currentUser={currentUser}
        profiles={appState.profiles}
        onClose={() => setSessionUnlocked(true)}
        onSwitchUser={handleSwitchUser}
        onUpdateOwnProfile={handleUpdateOwnProfile}
        onOpenManagePeople={() => {
          setSessionUnlocked(true);
          if (isCasa) setActiveTab('people');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] pb-36 text-zinc-900 transition-colors dark:bg-[#08090C] dark:text-zinc-100 lg:pb-24">
      {/* Ambient Obsidian Glow (Dark Mode) */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 -z-0 hidden h-[420px] overflow-hidden dark:block"
        aria-hidden="true"
      >
        <div className="mx-auto h-full max-w-4xl rounded-full bg-red-600/[0.06] blur-[140px]" />
      </div>

      {/* Single Clean Top Bar (3-Zone Contract) */}
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#0C0E13]/85">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:h-16 sm:gap-8 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Wordmark + Icon */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="inline-flex items-center transition-opacity hover:opacity-80 whitespace-nowrap shrink-0"
          >
            <DomusBrand size="sm" />
          </button>

          {/* Zone 2: Desktop Navigation Links (Clean Typography, Zero Pills) */}
          <nav
            className="hidden items-center gap-7 lg:flex"
            aria-label="Navegação principal"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative inline-flex items-center gap-2 py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'font-semibold text-zinc-900 dark:text-white'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      active
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                    aria-hidden={true}
                  />
                  <span>{item.label}</span>
                  <span
                    className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-red-600 transition-all duration-200 dark:bg-red-500 ${
                      active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Profile Portal Trigger, Theme Toggle & Guide */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              data-tour="profile-btn"
              onClick={() => {
                setProfileModalTab('switch');
                setProfileModalOpen(true);
              }}
              aria-label={`Perfil ativo: ${currentUser.name}. Clique para trocar de perfil`}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/12 dark:bg-white/[0.06] dark:text-zinc-100 dark:hover:border-white/25 dark:hover:bg-white/10 sm:px-3"
            >
              <ProfileAvatar profile={currentUser} size="xs" />
              <span className="max-w-[96px] truncate">
                {currentUser.name}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'
              }
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/12 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('home');
                setTutorialOpen(true);
              }}
              aria-label="Abrir guia rápido"
              title="Guia rápido"
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/12 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {activeTab === 'home' && (
          <div className="animate-enter space-y-6">
            {/* Top Control Strip: Month Navigator + Scope Toggle + Search + Status */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div
                  data-tour="month-nav"
                  className={`inline-flex items-center justify-between gap-1 rounded-full border border-zinc-200/80 bg-white p-1 transition-opacity dark:border-white/10 dark:bg-[#12141A]/85 sm:justify-start ${
                    periodScope === 'all' ? 'opacity-55' : 'opacity-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodScope('month');
                      setSelectedMonth((m) => shiftYearMonth(m, -1));
                    }}
                    aria-label="Mês anterior"
                    className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodScope('month')}
                    className="min-w-[140px] px-1 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                    title="Filtrar pelo mês selecionado"
                  >
                    {getMonthLabelPT(selectedMonth)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodScope('month');
                      setSelectedMonth((m) => shiftYearMonth(m, 1));
                    }}
                    aria-label="Próximo mês"
                    className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div
                  role="group"
                  aria-label="Escopo do cálculo"
                  className="inline-flex items-center rounded-full border border-zinc-200/80 bg-white p-1 dark:border-white/10 dark:bg-[#12141A]/85"
                >
                  {(
                    [
                      { id: 'month', label: 'Mês atual' },
                      { id: 'all', label: 'Geral' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPeriodScope(opt.id)}
                      aria-pressed={periodScope === opt.id}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        periodScope === opt.id
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:w-48 sm:flex-none">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar..."
                    aria-label="Buscar gastos ou pessoas"
                    className="min-h-[40px] w-full rounded-full border border-zinc-200/80 bg-white pl-9 pr-3.5 text-xs text-zinc-900 outline-none transition-colors focus:border-zinc-500 dark:border-white/10 dark:bg-[#12141A]/85 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-white/40"
                  />
                </div>
                <div className="flex items-center rounded-full border border-zinc-200/80 bg-white p-1 dark:border-white/10 dark:bg-[#12141A]/85">
                  {(
                    [
                      { id: 'all', label: 'Todos' },
                      { id: 'pending', label: 'Abertos' },
                      { id: 'paid', label: 'Pagos' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                        statusFilter === f.id
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Unified 3-Metric Summary Strip */}
            <section
              data-tour="kpi-cards"
              aria-label={periodScope === 'all' ? 'Resumo geral' : 'Resumo do mês'}
              className="grid grid-cols-1 divide-y divide-zinc-200/80 rounded-2xl border border-zinc-200/80 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-[#12141A]/85 dark:backdrop-blur-md sm:grid-cols-3 sm:divide-x sm:divide-y-0"
            >
              <div className="p-5">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Total</span>
                  </span>
                  <span className="font-mono tabular-nums">{kpiSummary.count}</span>
                </div>
                <div className="mt-2 font-display text-2xl font-bold tabular-nums text-zinc-900 dark:text-white sm:text-3xl">
                  {formatBRL(kpiSummary.total)}
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Quitado</span>
                  </span>
                  <span className="font-mono tabular-nums">{kpiSummary.paidCount}</span>
                </div>
                <div className="mt-2 font-display text-2xl font-bold tabular-nums text-zinc-700 dark:text-zinc-200 sm:text-3xl">
                  {formatBRL(kpiSummary.paid)}
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Aberto</span>
                  </span>
                  <span className="font-mono tabular-nums">{kpiSummary.pendingCount}</span>
                </div>
                <div className="mt-2 font-display text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400 sm:text-3xl">
                  {formatBRL(kpiSummary.pending)}
                </div>
              </div>
            </section>

            {/* Pending Payment Indications Highlight Banner */}
            {pendingApprovals.length > 0 && (
              <section
                aria-label="Indicações de pagamento aguardando aceite"
                className="rounded-2xl border border-amber-300/60 bg-amber-50/45 p-4 dark:border-amber-500/25 dark:bg-amber-950/15 sm:p-5"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock
                      className="h-4 w-4 text-amber-700 dark:text-amber-400"
                      aria-hidden="true"
                    />
                    <h2 className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Indicações aguardando aceite
                    </h2>
                  </div>
                  <span className="font-mono text-xs font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                    {pendingApprovals.length}
                  </span>
                </div>

                {approvalFeedbackError && (
                  <p className="mb-3 text-xs font-medium text-red-600 dark:text-red-400">
                    {approvalFeedbackError}
                  </p>
                )}

                <ul className="divide-y divide-amber-200/70 rounded-xl border border-amber-200/70 bg-white/90 dark:divide-white/10 dark:border-white/10 dark:bg-[#12141A]/90">
                  {pendingApprovals.map(({ expense, indication, requester }) => {
                    const isRejecting =
                      panelRejectTarget?.expenseId === expense.id &&
                      panelRejectTarget?.indicationId === indication.id;
                    return (
                      <li key={indication.id} className="space-y-2.5 px-3.5 py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-2.5">
                            {requester && (
                              <ProfileAvatar profile={requester} size="xs" />
                            )}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                  {requester ? requester.name : 'Membro'}
                                </span>
                                <span
                                  aria-hidden="true"
                                  className="text-zinc-300 dark:text-zinc-600"
                                >
                                  ·
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setDetailExpenseId(expense.id)}
                                  className="truncate font-semibold text-zinc-700 underline-offset-2 hover:text-red-600 hover:underline dark:text-zinc-200 dark:hover:text-red-400"
                                >
                                  {expense.title}
                                </button>
                                <span
                                  aria-hidden="true"
                                  className="text-zinc-300 dark:text-zinc-600"
                                >
                                  ·
                                </span>
                                <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                                  {formatDateBR(indication.date)}
                                </span>
                              </div>
                              {indication.note && (
                                <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {indication.note}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2.5 sm:justify-end shrink-0">
                            <span className="font-mono text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                              {formatBRL(indication.amount)}
                            </span>

                            {!isRejecting && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAcceptIndication(expense.id, indication.id)
                                  }
                                  aria-label={`Aceitar indicação de ${
                                    requester ? requester.name : 'membro'
                                  } em ${expense.title}`}
                                  className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                >
                                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Aceitar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPanelRejectTarget({
                                      expenseId: expense.id,
                                      indicationId: indication.id,
                                    });
                                    setPanelRejectReason('');
                                  }}
                                  aria-label={`Recusar indicação de ${
                                    requester ? requester.name : 'membro'
                                  } em ${expense.title}`}
                                  className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-red-200 bg-red-50/70 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/60"
                                >
                                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Recusar</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {isRejecting && (
                          <div className="flex flex-col gap-2 border-t border-zinc-100 pt-2.5 dark:border-white/10 sm:flex-row sm:items-center">
                            <input
                              type="text"
                              value={panelRejectReason}
                              onChange={(e) => setPanelRejectReason(e.target.value)}
                              placeholder="Motivo da recusa (opcional)"
                              aria-label="Motivo da recusa"
                              className="h-9 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-900 outline-none focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:text-zinc-100"
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setPanelRejectTarget(null);
                                  setPanelRejectReason('');
                                }}
                                className="min-h-[34px] rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:border-white/12 dark:text-zinc-300 dark:hover:bg-white/10"
                              >
                                Voltar
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRejectIndication(
                                    expense.id,
                                    indication.id,
                                    panelRejectReason
                                  )
                                }
                                className="min-h-[34px] rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500"
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
              </section>
            )}

            {/* Section Tabs + Active View */}
            <div data-tour="main-sections" className="space-y-4">
              <div
                className="flex items-center gap-0.5 overflow-x-auto border-b border-zinc-200/80 pb-px dark:border-white/10 sm:gap-1.5"
                role="tablist"
                aria-label="Seções do painel"
              >
                {homeTabs.map((tab) => {
                  const active = homeSection === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setHomeSection(tab.id)}
                      className={`relative inline-flex min-h-[42px] items-center gap-1.5 px-2.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 sm:gap-2 sm:px-3.5 sm:text-sm ${
                        active
                          ? 'text-zinc-900 dark:text-white'
                          : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          active
                            ? 'text-zinc-900 dark:text-zinc-200'
                            : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      >
                        {tab.count}
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

              {homeSection === 'people' && !isCasa ? (
                <section
                  key={`people-${periodScope}-${selectedMonth}`}
                  aria-label="Saldos por pessoa e Casa"
                  className="animate-enter space-y-4"
                >
                  {/* Bilateral Totals Overview */}
                  <div className="grid grid-cols-1 divide-y divide-zinc-200/80 rounded-2xl border border-zinc-200/80 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-[#12141A]/85 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        <span>Você deve (Casa e membros)</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      </div>
                      <div className="mt-1 font-display text-xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                        {formatBRL(bilateralTotals.totalIOwe)}
                      </div>
                    </div>

                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        <span>Você tem a receber</span>
                        <ArrowDownLeft className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-300" aria-hidden="true" />
                      </div>
                      <div className="mt-1 font-display text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {formatBRL(bilateralTotals.totalTheyOweMe)}
                      </div>
                    </div>

                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        <span>Saldo líquido entre pessoas</span>
                        {bilateralTotals.totalCompensable > 0 && (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                            <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
                            {formatBRL(bilateralTotals.totalCompensable)}
                          </span>
                        )}
                      </div>
                      <div
                        className={`mt-1 font-display text-xl font-bold tabular-nums ${
                          bilateralTotals.netTotal < -0.005
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-zinc-900 dark:text-white'
                        }`}
                      >
                        {bilateralTotals.netTotal > 0.005
                          ? `+ ${formatBRL(bilateralTotals.netTotal)}`
                          : bilateralTotals.netTotal < -0.005
                          ? `- ${formatBRL(Math.abs(bilateralTotals.netTotal))}`
                          : formatBRL(0)}
                      </div>
                    </div>
                  </div>

                  {filteredBilateralBalances.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center dark:border-white/12 dark:bg-[#12141A]/85">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Nenhuma pessoa encontrada com os filtros atuais.
                      </p>
                      {(searchQuery.trim() || statusFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                          }}
                          className="min-h-[36px] rounded-full border border-zinc-200 px-4 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/12 dark:text-zinc-200 dark:hover:bg-white/10"
                        >
                          Limpar filtros
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredBilateralBalances.map((b) => {
                        const isCasaCard = b.profile.role === ProfileRole.CASA;
                        const netPositive = b.netAmount > 0.005;
                        const netNegative = b.netAmount < -0.005;
                        const netTiedWithOffset =
                          !netPositive && !netNegative && b.compensableAmount > 0;

                        const statusText = isCasaCard
                          ? b.iOwe > 0
                            ? 'Você deve para a Casa'
                            : 'Tudo em dia com a Casa'
                          : netPositive
                          ? `${b.profile.name} te deve`
                          : netNegative
                          ? `Você deve para ${b.profile.name}`
                          : netTiedWithOffset
                          ? 'Empatado · compensável'
                          : 'Tudo em dia';

                        return (
                          <button
                            key={b.profile.id}
                            type="button"
                            onClick={() => setDetailPersonId(b.profile.id)}
                            aria-label={`Abrir balanço com ${b.profile.name}: ${statusText}`}
                            className="group flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-white/10 dark:bg-[#12141A]/85 dark:backdrop-blur-md dark:hover:border-white/25"
                          >
                            <div className="flex w-full items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <ProfileAvatar profile={b.profile} size="md" />
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                    {b.profile.name}
                                  </div>
                                  <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                    {statusText}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight
                                className="h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-200"
                                aria-hidden="true"
                              />
                            </div>

                            {/* Primary Hero: Saldo final líquido */}
                            <div className="mt-4">
                              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                {isCasaCard ? 'Em aberto com a Casa' : 'Saldo líquido'}
                              </div>
                              <div
                                className={`mt-0.5 font-display text-2xl font-extrabold tabular-nums ${
                                  netNegative || netTiedWithOffset
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-zinc-900 dark:text-white'
                                }`}
                              >
                                {netPositive
                                  ? `+ ${formatBRL(b.netAmount)}`
                                  : netNegative
                                  ? `- ${formatBRL(Math.abs(b.netAmount))}`
                                  : formatBRL(0)}
                              </div>
                            </div>

                            {/* Mirrored Detail: Devo vs Recebo */}
                            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3 dark:border-white/10">
                              {isCasaCard ? (
                                <div className="flex items-center justify-between text-xs tabular-nums">
                                  <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    Quitado {formatBRL(b.paidByMeToThem)}
                                  </span>
                                  <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                                    {b.expensesBetween.length}{' '}
                                    {b.expensesBetween.length === 1 ? 'conta' : 'contas'}
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                                    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                                      Devo {formatBRL(b.iOwe)}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-zinc-700 dark:text-zinc-200">
                                      <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                                      Recebo {formatBRL(b.theyOweMe)}
                                    </span>
                                  </div>
                                  {b.compensableAmount > 0 && (
                                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                                      <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
                                      <span>
                                        Compensável {formatBRL(b.compensableAmount)}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              ) : homeSection === 'members' && isCasa ? (
                <section
                  key={`members-${periodScope}-${selectedMonth}`}
                  aria-label="Resumo por membro"
                  className="animate-enter space-y-3"
                >
                  {regularProfiles.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-xs text-zinc-500 dark:border-white/12 dark:bg-[#12141A]/85 dark:text-zinc-400">
                      Sem membros cadastrados.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {regularProfiles.map((member, idx) => {
                        const mSummary = computeMemberStatsForCasa(
                          scopedExpensesAll,
                          member.id
                        );
                        const pct =
                          mSummary.total > 0
                            ? Math.round((mSummary.paid / mSummary.total) * 100)
                            : 0;

                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => setDetailUserId(member.id)}
                            aria-label={`Ver detalhes de ${member.name}: ${formatBRL(mSummary.total)}`}
                            className="group flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-white/10 dark:bg-[#12141A]/85 dark:backdrop-blur-md dark:hover:border-white/25"
                          >
                            <div className="flex w-full items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <ProfileAvatar profile={member} size="md" />
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                    {member.name}
                                  </div>
                                  <div className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                                    <Receipt className="h-3 w-3" aria-hidden="true" />
                                    <span>{mSummary.count}</span>
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono text-xs font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">
                                {pct}%
                              </span>
                            </div>

                            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-white/10">
                              <div className="font-display text-base font-bold tabular-nums text-zinc-900 dark:text-white">
                                {formatBRL(mSummary.total)}
                              </div>
                              <div className="flex items-center gap-2.5 text-[11px] font-medium tabular-nums">
                                <span
                                  className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300"
                                  title="Quitado"
                                >
                                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                  {formatBRL(mSummary.paid)}
                                </span>
                                <span
                                  className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"
                                  title="Em aberto"
                                >
                                  <Clock className="h-3 w-3" aria-hidden="true" />
                                  {formatBRL(mSummary.pending)}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
                              <div
                                className="animate-bar-x h-full rounded-full bg-zinc-700 transition-transform duration-500 dark:bg-zinc-200"
                                style={{
                                  width: `${pct}%`,
                                  animationDelay: `${idx * 45}ms`,
                                }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              ) : (
                <section
                  key={`list-${homeSection}-${periodScope}-${selectedMonth}`}
                  className="animate-enter rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#12141A]/85 dark:backdrop-blur-md"
                >
                  <div className="mb-1 flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-white/10">
                    <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      {activeSectionMeta.title}
                    </p>
                    <span className="font-mono text-xs font-semibold tabular-nums text-zinc-400 dark:text-zinc-500">
                      {activeExpensesList.length}
                    </span>
                  </div>

                  {activeExpensesList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {activeSectionMeta.emptyText}
                      </p>
                      <button
                        type="button"
                        onClick={openNewExpenseModal}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/12 dark:bg-white/[0.06] dark:text-zinc-200 dark:hover:bg-white/10"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Novo gasto</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      {activeExpensesList.map((exp) => (
                        <ExpenseRow
                          key={exp.id}
                          expense={exp}
                          currentUser={currentUser}
                          profiles={appState.profiles}
                          categories={appState.categories}
                          shareForUserId={
                            homeSection === 'mine' ? currentUser.id : undefined
                          }
                          shareLabelPrefix={
                            homeSection === 'mine' ? 'Sua cota' : undefined
                          }
                          onPay={(item) =>
                            setPaymentModalState({ expenseId: item.id, mode: 'register' })
                          }
                          onIndicate={(item) =>
                            setPaymentModalState({ expenseId: item.id, mode: 'indicate' })
                          }
                          onEdit={(item) => {
                            setDuplicatingExpense(null);
                            setEditingExpense(item);
                            setExpenseModalOpen(true);
                          }}
                          onDuplicate={openDuplicateExpenseModal}
                          onInspect={(item) => setDetailExpenseId(item.id)}
                          onDelete={(item) => setExpenseToDelete(item)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <ReportsView
            currentUser={currentUser}
            selectedMonth={selectedMonth}
            onChangeMonth={(delta) =>
              setSelectedMonth((m) => shiftYearMonth(m, delta))
            }
            expenses={appState.expenses}
            categories={appState.categories}
            profiles={appState.profiles}
            appState={appState}
            onImportState={(imported) => setAppState(imported)}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesView
            currentUser={currentUser}
            categories={appState.categories}
            expenses={appState.expenses}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}

        {activeTab === 'people' && (
          <ManagePeopleView
            currentUser={currentUser}
            profiles={appState.profiles}
            expenses={appState.expenses}
            onCreateProfile={handleCreateProfile}
            onUpdateProfile={handleUpdateProfileAdmin}
            onDeleteProfile={handleDeleteProfileAdmin}
          />
        )}
      </main>

      {/* Floating Red New Expense Capsule */}
      <button
        type="button"
        data-tour="new-expense-btn"
        onClick={openNewExpenseModal}
        aria-label="Novo gasto"
        className="fixed bottom-20 right-4 z-30 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-xs font-bold tracking-tight text-white shadow-[0_14px_34px_-6px_rgba(220,38,38,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-500 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 lg:bottom-7 lg:right-7 sm:text-sm whitespace-nowrap"
      >
        <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
        <span>Novo gasto</span>
      </button>

      {/* Mobile Fixed Bottom Navigation Bar (<= 64px height) */}
      <nav
        aria-label="Navegação móvel"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200/80 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-[#0C0E13]/90 lg:hidden"
      >
        <div className="grid h-16 grid-cols-4 items-center">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
              activeTab === 'home'
                ? 'text-red-600 dark:text-red-400'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            <span>Painel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
              activeTab === 'reports'
                ? 'text-red-600 dark:text-red-400'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <PieChart className="h-5 w-5" aria-hidden="true" />
            <span>Relatórios</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
              activeTab === 'categories'
                ? 'text-red-600 dark:text-red-400'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <FolderKanban className="h-5 w-5" aria-hidden="true" />
            <span>Categorias</span>
          </button>

          {isCasa ? (
            <button
              type="button"
              onClick={() => setActiveTab('people')}
              className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                activeTab === 'people'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <Users className="h-5 w-5" aria-hidden="true" />
              <span>Membros</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setProfileModalTab('edit-own');
                setProfileModalOpen(true);
              }}
              className="flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400"
            >
              <UserCog className="h-5 w-5" aria-hidden="true" />
              <span>Meu Perfil</span>
            </button>
          )}
        </div>
      </nav>

      {/* Modals */}
      <ExpenseFormModal
        isOpen={expenseModalOpen}
        editingExpense={editingExpense}
        duplicatingExpense={duplicatingExpense}
        currentUser={currentUser}
        profiles={appState.profiles}
        userCategories={userCategories}
        recentTemplates={recentUserTemplates}
        defaultDate={defaultExpenseDate}
        onQuickCreateCategory={(name, color) => handleSaveCategory(name, color)}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpense(null);
          setDuplicatingExpense(null);
        }}
        onSubmit={handleSaveExpense}
      />

      <PaymentModal
        expense={paymentExpense}
        mode={paymentModalState?.mode}
        creatorName={paymentExpenseCreator}
        onClose={() => setPaymentModalState(null)}
        onRegisterPayment={handlePaymentModalSubmit}
      />

      <UserDetailModal
        targetUser={detailUser}
        currentUser={currentUser}
        selectedMonth={selectedMonth}
        periodScope={periodScope}
        expenses={scopedExpensesAll}
        profiles={appState.profiles}
        categories={appState.categories}
        onClose={() => setDetailUserId(null)}
        onPay={(item) =>
          setPaymentModalState({ expenseId: item.id, mode: 'register' })
        }
        onIndicate={(item) =>
          setPaymentModalState({ expenseId: item.id, mode: 'indicate' })
        }
        onEdit={(item) => {
          setDuplicatingExpense(null);
          setEditingExpense(item);
          setExpenseModalOpen(true);
        }}
        onDuplicate={openDuplicateExpenseModal}
        onInspect={(item) => setDetailExpenseId(item.id)}
        onDelete={(item) => setExpenseToDelete(item)}
      />

      <PersonBalanceModal
        summary={detailPersonSummary}
        currentUser={currentUser}
        selectedMonth={selectedMonth}
        periodScope={periodScope}
        profiles={appState.profiles}
        categories={appState.categories}
        onClose={() => setDetailPersonId(null)}
        onCompensate={handleCompensatePerson}
        onPay={(item) =>
          setPaymentModalState({ expenseId: item.id, mode: 'register' })
        }
        onIndicate={(item) =>
          setPaymentModalState({ expenseId: item.id, mode: 'indicate' })
        }
        onEdit={(item) => {
          setDuplicatingExpense(null);
          setEditingExpense(item);
          setExpenseModalOpen(true);
        }}
        onDuplicate={openDuplicateExpenseModal}
        onInspect={(item) => setDetailExpenseId(item.id)}
        onDelete={(item) => setExpenseToDelete(item)}
      />

      <ExpenseDetailModal
        expense={detailExpense}
        seriesExpenses={detailSeriesExpenses}
        currentUser={currentUser}
        profiles={appState.profiles}
        categories={appState.categories}
        onClose={() => setDetailExpenseId(null)}
        onSelectSeriesExpense={(item) => setDetailExpenseId(item.id)}
        onPay={(item) =>
          setPaymentModalState({ expenseId: item.id, mode: 'register' })
        }
        onIndicate={(item) =>
          setPaymentModalState({ expenseId: item.id, mode: 'indicate' })
        }
        onAcceptIndication={handleAcceptIndication}
        onRejectIndication={handleRejectIndication}
        onCancelIndication={handleCancelIndication}
        onEdit={(item) => {
          setDuplicatingExpense(null);
          setEditingExpense(item);
          setExpenseModalOpen(true);
        }}
        onDuplicate={openDuplicateExpenseModal}
        onDelete={(item) => setExpenseToDelete(item)}
      />

      <ProfileSwitcherModal
        isOpen={profileModalOpen}
        canDismiss={true}
        initialTab={profileModalTab}
        theme={theme}
        onToggleTheme={toggleTheme}
        currentUser={currentUser}
        profiles={appState.profiles}
        onClose={() => setProfileModalOpen(false)}
        onSwitchUser={handleSwitchUser}
        onUpdateOwnProfile={handleUpdateOwnProfile}
        onOpenManagePeople={() => {
          setProfileModalOpen(false);
          if (isCasa) setActiveTab('people');
        }}
      />

      {/* Delete Expense Confirmation Dialog */}
      {expenseToDelete && (
        <div
          className="animate-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-expense-title"
        >
          <div className="animate-modal w-full max-w-sm rounded-2xl border border-zinc-200/80 bg-white/95 p-5 shadow-2xl backdrop-blur-xl dark:border-white/12 dark:bg-[#12141A]/95">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3
                  id="delete-expense-title"
                  className="text-base font-bold text-zinc-900 dark:text-zinc-100"
                >
                  Excluir gasto
                </h3>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  Deseja realmente excluir{' '}
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {expenseToDelete.title}
                  </strong>
                  ?
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="min-h-[40px] rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/12 dark:text-zinc-200 dark:hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExpense}
                className="min-h-[40px] rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <TutorialOverlay
        isOpen={tutorialOpen}
        steps={tutorialSteps}
        onClose={handleCloseTutorial}
      />
    </div>
  );
}
