import {
  AppState,
  Category,
  ProfileRole,
  UserProfile,
} from '../types/finance';
import { canAccessAdminFeatures } from './finance';

export const STORAGE_KEY = 'casaconta_app_state_v1';

export const CATEGORY_COLORS = [
  '#DC2626',
  '#3B82F6',
  '#6366F1',
  '#D97706',
  '#8B5CF6',
  '#EC4899',
  '#A1A1AA',
  '#52525B',
];

export const AVATAR_COLORS = [
  '#27272A',
  '#3B82F6',
  '#6366F1',
  '#D97706',
  '#DC2626',
  '#9333EA',
];

export function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function createSeedState(): AppState {
  const ym = '2026-11';
  const prevYm = '2026-10';

  const profiles: UserProfile[] = [
    {
      id: 'user_casa',
      name: 'Casa',
      role: ProfileRole.CASA,
      password: '',
      avatarColor: '#27272A',
      avatarId: 'casa',
      createdAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'user_ana',
      name: 'Ana',
      role: ProfileRole.REGULAR,
      password: '123',
      avatarColor: '#2563EB',
      avatarId: 'ana',
      createdAt: '2026-01-02T10:00:00.000Z',
    },
    {
      id: 'user_carlos',
      name: 'Carlos',
      role: ProfileRole.REGULAR,
      password: '123',
      avatarColor: '#4F46E5',
      avatarId: 'carlos',
      createdAt: '2026-01-03T10:00:00.000Z',
    },
    {
      id: 'user_sofia',
      name: 'Sofia',
      role: ProfileRole.REGULAR,
      password: '123',
      avatarColor: '#D97706',
      avatarId: 'sofia',
      createdAt: '2026-01-04T10:00:00.000Z',
    },
  ];

  const categories: Category[] = [
    { id: 'cat_casa_moradia', ownerId: 'user_casa', name: 'Moradia e Contas', color: '#3B82F6' },
    { id: 'cat_casa_mercado', ownerId: 'user_casa', name: 'Supermercado', color: '#D97706' },
    { id: 'cat_casa_saude', ownerId: 'user_casa', name: 'Saúde e Farmácia', color: '#DC2626' },
    { id: 'cat_casa_internet', ownerId: 'user_casa', name: 'Internet e Streaming', color: '#8B5CF6' },
    { id: 'cat_ana_pessoal', ownerId: 'user_ana', name: 'Compras Pessoais', color: '#3B82F6' },
    { id: 'cat_ana_transporte', ownerId: 'user_ana', name: 'Transporte', color: '#D97706' },
    { id: 'cat_carlos_mercado', ownerId: 'user_carlos', name: 'Feira e Padaria', color: '#6366F1' },
    { id: 'cat_sofia_estudos', ownerId: 'user_sofia', name: 'Estudos e Livros', color: '#EC4899' },
  ];

  const expenses = [
    {
      id: 'exp_seed_1',
      title: 'Conta de Energia Elétrica',
      amount: 380.0,
      paidAmount: 380.0,
      payments: [
        {
          id: 'pay_seed_1',
          amount: 380.0,
          date: `${ym}-05`,
          note: 'Pix quitado',
        },
      ],
      date: `${ym}-05`,
      installments: 1,
      categoryId: 'cat_casa_moradia',
      creatorId: 'user_casa',
      assigneeIds: ['user_ana', 'user_carlos'],
      notes: 'Divisão mensal da conta de luz',
      createdAt: '2026-11-05T12:00:00.000Z',
    },
    {
      id: 'exp_seed_2',
      title: 'Compras do Mês — Atacadão',
      amount: 960.0,
      paidAmount: 400.0,
      payments: [
        {
          id: 'pay_seed_2',
          amount: 400.0,
          date: `${ym}-08`,
          note: 'Primeira parcela paga',
        },
      ],
      date: `${ym}-08`,
      installments: 3,
      categoryId: 'cat_casa_mercado',
      creatorId: 'user_casa',
      assigneeIds: ['user_ana', 'user_carlos', 'user_sofia'],
      notes: 'Abastecimento geral da casa',
      createdAt: '2026-11-08T15:30:00.000Z',
    },
    {
      id: 'exp_seed_3',
      title: 'Internet Fibra 600MB',
      amount: 139.9,
      paidAmount: 0,
      payments: [],
      paymentIndications: [
        {
          id: 'ind_seed_1',
          requesterId: 'user_sofia',
          amount: 139.9,
          date: `${ym}-13`,
          note: 'Pix enviado pela Sofia',
          status: 'pending' as const,
          createdAt: '2026-11-13T10:30:00.000Z',
        },
      ],
      date: `${ym}-12`,
      installments: 1,
      categoryId: 'cat_casa_internet',
      creatorId: 'user_casa',
      assigneeIds: ['user_sofia'],
      createdAt: '2026-11-12T09:15:00.000Z',
    },
    {
      id: 'exp_seed_4',
      title: 'Farmácia — Vitaminas e Remédios',
      amount: 215.5,
      paidAmount: 100.0,
      payments: [
        {
          id: 'pay_seed_3',
          amount: 100.0,
          date: `${ym}-10`,
          note: 'Adiantamento',
        },
      ],
      date: `${ym}-10`,
      installments: 2,
      categoryId: 'cat_casa_saude',
      creatorId: 'user_casa',
      assigneeIds: ['user_ana'],
      createdAt: '2026-11-10T18:20:00.000Z',
    },
    {
      id: 'exp_seed_5',
      title: 'Aplicativo de Transporte (Aeroporto)',
      amount: 120.0,
      paidAmount: 0,
      payments: [],
      date: `${ym}-14`,
      installments: 1,
      categoryId: 'cat_ana_transporte',
      creatorId: 'user_ana',
      assigneeIds: ['user_carlos'],
      notes: 'Carlos pediu para rachar corrida',
      createdAt: '2026-11-14T11:00:00.000Z',
    },
    {
      id: 'exp_seed_6',
      title: 'Curso de Inglês Online',
      amount: 290.0,
      paidAmount: 290.0,
      payments: [
        {
          id: 'pay_seed_4',
          amount: 290.0,
          date: `${ym}-03`,
        },
      ],
      date: `${ym}-03`,
      installments: 1,
      categoryId: 'cat_ana_pessoal',
      creatorId: 'user_ana',
      assigneeIds: ['user_ana'],
      createdAt: '2026-11-03T14:00:00.000Z',
    },
    {
      id: 'exp_seed_7',
      title: 'Condomínio Residencial',
      amount: 640.0,
      paidAmount: 640.0,
      payments: [
        {
          id: 'pay_seed_5',
          amount: 640.0,
          date: `${prevYm}-05`,
        },
      ],
      date: `${prevYm}-05`,
      installments: 1,
      categoryId: 'cat_casa_moradia',
      creatorId: 'user_casa',
      assigneeIds: ['user_ana', 'user_carlos'],
      createdAt: '2026-10-05T10:00:00.000Z',
    },
  ];

  return {
    profiles,
    categories,
    expenses,
    activeUserId: 'user_casa',
    dismissedTutorials: {},
    dismissedNotices: {},
  };
}

export function loadAppState(): AppState {
  if (typeof window === 'undefined') {
    return createSeedState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || !Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
      const seed = createSeedState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const normalizedExpenses = Array.isArray(parsed.expenses)
      ? parsed.expenses.map((exp) => {
          const { code: _legacyCode, ...rest } = exp as typeof exp & { code?: string };
          return {
            ...rest,
            paymentIndications: Array.isArray(rest.paymentIndications)
              ? rest.paymentIndications
              : [],
          };
        })
      : [];
    return {
      profiles: parsed.profiles,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      expenses: normalizedExpenses,
      activeUserId: parsed.activeUserId || parsed.profiles[0].id,
      dismissedTutorials: parsed.dismissedTutorials || {},
      dismissedNotices: parsed.dismissedNotices || {},
    };
  } catch {
    return createSeedState();
  }
}

export function saveAppState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function createProfileInState(
  state: AppState,
  actorId: string,
  name: string,
  password: string,
  avatarColor: string,
  avatarId?: string
): { ok: true; state: AppState; profile: UserProfile } | { ok: false; error: string } {
  const actor = state.profiles.find((p) => p.id === actorId);
  if (!actor || !canAccessAdminFeatures(actor)) {
    return { ok: false, error: 'Apenas o perfil Casa pode criar novos perfis.' };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: 'Informe um nome para o perfil.' };
  }

  const duplicate = state.profiles.some(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    return { ok: false, error: 'Já existe um perfil com este nome.' };
  }

  const newId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const profile: UserProfile = {
    id: newId,
    name: trimmed,
    role: ProfileRole.REGULAR,
    password: password.trim(),
    avatarColor: avatarColor || AVATAR_COLORS[state.profiles.length % AVATAR_COLORS.length],
    ...(avatarId ? { avatarId } : {}),
    createdAt: new Date().toISOString(),
  };

  // Categoria inicial padrão para o novo usuário
  const defaultCategory: Category = {
    id: `cat_${newId}_geral`,
    ownerId: newId,
    name: 'Geral',
    color: '#2563EB',
  };

  return {
    ok: true,
    profile,
    state: {
      ...state,
      profiles: [...state.profiles, profile],
      categories: [...state.categories, defaultCategory],
    },
  };
}

export function updateProfileInState(
  state: AppState,
  actorId: string,
  targetId: string,
  name: string,
  password: string,
  avatarId?: string,
  avatarColor?: string
): { ok: true; state: AppState } | { ok: false; error: string } {
  const actor = state.profiles.find((p) => p.id === actorId);
  const target = state.profiles.find((p) => p.id === targetId);
  if (!actor || !target) {
    return { ok: false, error: 'Perfil não encontrado.' };
  }

  // Regulares só editam a si mesmos; Casa edita qualquer um
  if (!canAccessAdminFeatures(actor) && actor.id !== target.id) {
    return { ok: false, error: 'Você só pode editar o seu próprio perfil.' };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: 'O nome não pode ficar em branco.' };
  }

  const duplicate = state.profiles.some(
    (p) => p.id !== targetId && p.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    return { ok: false, error: 'Já existe outro perfil com este nome.' };
  }

  return {
    ok: true,
    state: {
      ...state,
      profiles: state.profiles.map((p) =>
        p.id === targetId
          ? {
              ...p,
              name: trimmed,
              password: password.trim(),
              ...(avatarId !== undefined ? { avatarId } : {}),
              ...(avatarColor !== undefined ? { avatarColor } : {}),
            }
          : p
      ),
    },
  };
}

export function saveCategoryInState(
  state: AppState,
  ownerId: string,
  name: string,
  color: string,
  categoryId?: string
): { ok: true; state: AppState; category: Category } | { ok: false; error: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: 'Informe um nome para a categoria.' };
  }

  const userCategories = state.categories.filter((c) => c.ownerId === ownerId);
  const duplicate = userCategories.some(
    (c) => c.id !== categoryId && c.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    return { ok: false, error: 'Você já possui uma categoria com este nome.' };
  }

  if (categoryId) {
    const existing = state.categories.find((c) => c.id === categoryId);
    if (!existing || existing.ownerId !== ownerId) {
      return { ok: false, error: 'Você só pode editar suas próprias categorias.' };
    }
    const updatedCat: Category = { ...existing, name: trimmed, color };
    return {
      ok: true,
      category: updatedCat,
      state: {
        ...state,
        categories: state.categories.map((c) =>
          c.id === categoryId ? updatedCat : c
        ),
      },
    };
  }

  const newCat: Category = {
    id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ownerId,
    name: trimmed,
    color: color || CATEGORY_COLORS[0],
  };

  return {
    ok: true,
    category: newCat,
    state: {
      ...state,
      categories: [...state.categories, newCat],
    },
  };
}

export function deleteCategoryFromState(
  state: AppState,
  ownerId: string,
  categoryId: string
): { ok: true; state: AppState } | { ok: false; error: string } {
  const target = state.categories.find((c) => c.id === categoryId);
  if (!target || target.ownerId !== ownerId) {
    return { ok: false, error: 'Você só pode excluir suas próprias categorias.' };
  }

  return {
    ok: true,
    state: {
      ...state,
      categories: state.categories.filter((c) => c.id !== categoryId),
      expenses: state.expenses.map((e) =>
        e.categoryId === categoryId ? { ...e, categoryId: '' } : e
      ),
    },
  };
}
