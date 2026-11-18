import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Receipt,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Expense, ProfileRole, UserProfile } from '../types/finance';
import { AVATAR_CATALOG, resolveAvatarForProfile } from '../utils/avatars';
import { AvatarPicker, ProfileAvatar } from './ProfileAvatar';

interface ManagePeopleViewProps {
  currentUser: UserProfile;
  profiles: UserProfile[];
  expenses: Expense[];
  onCreateProfile: (
    name: string,
    password: string,
    avatarColor: string,
    avatarId?: string
  ) => { ok: true } | { ok: false; error: string };
  onUpdateProfile: (
    targetId: string,
    name: string,
    password: string,
    avatarId?: string,
    avatarColor?: string
  ) => { ok: true } | { ok: false; error: string };
  onDeleteProfile: (
    targetId: string
  ) => { ok: true } | { ok: false; error: string };
}

export const ManagePeopleView: React.FC<ManagePeopleViewProps> = ({
  currentUser,
  profiles,
  expenses,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
}) => {
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newAvatarId, setNewAvatarId] = useState(AVATAR_CATALOG[4].id);
  const [newColor, setNewColor] = useState(AVATAR_CATALOG[4].bgColor);
  const [createError, setCreateError] = useState('');
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editAvatarId, setEditAvatarId] = useState<string>('');
  const [editAvatarColor, setEditAvatarColor] = useState<string>('');
  const [editError, setEditError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setOpenMenuId(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenuId]);

  if (currentUser.role !== ProfileRole.CASA) {
    return (
      <div className="animate-enter rounded-2xl border border-zinc-200/80 bg-white p-8 text-center dark:border-white/10 dark:bg-[#12141A]/85 dark:backdrop-blur-md">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Acesso restrito
        </p>
      </div>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onCreateProfile(newName, newPassword, newColor, newAvatarId);
    if (!res.ok) {
      setCreateError(res.error);
      setShakeTrigger((n) => n + 1);
      return;
    }
    setNewName('');
    setNewPassword('');
    setCreateError('');
  };

  const openEdit = (prof: UserProfile) => {
    setEditingProfile(prof);
    setEditName(prof.name);
    setEditPassword(prof.password);
    const resolved = resolveAvatarForProfile(prof);
    setEditAvatarId(resolved.id);
    setEditAvatarColor(resolved.bgColor);
    setEditError('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    const res = onUpdateProfile(
      editingProfile.id,
      editName,
      editPassword,
      editAvatarId,
      editAvatarColor
    );
    if (!res.ok) {
      setEditError(res.error);
      setShakeTrigger((n) => n + 1);
      return;
    }
    setEditingProfile(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    onDeleteProfile(deleteTarget.id);
    setDeleteTarget(null);
  };

  const countRelatedExpenses = (profileId: string) => {
    const created = expenses.filter((e) => e.creatorId === profileId).length;
    const assigned = expenses.filter(
      (e) => e.creatorId !== profileId && e.assigneeIds.includes(profileId)
    ).length;
    return { created, assigned };
  };

  return (
    <div className="animate-enter space-y-6">
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 dark:border-white/10 dark:bg-[#12141A]/85 dark:backdrop-blur-md">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
            Novo membro
          </h2>
        </div>

        <form
          onSubmit={handleCreate}
          noValidate
          className="mt-4 space-y-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
            <div className="sm:col-span-6">
              <label
                htmlFor="new-member-name"
                className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Nome *
              </label>
              <input
                id="new-member-name"
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (createError) setCreateError('');
                }}
                placeholder="Lucas, Maria..."
                key={`create-err-${createError ? shakeTrigger : 'ok'}`}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-zinc-900 outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
                  createError
                    ? 'animate-shake border-red-500 bg-red-50/40 ring-2 ring-red-100 dark:bg-red-950/30 dark:ring-red-900/50'
                    : 'border-zinc-200 bg-white focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:focus:border-white/40'
                }`}
              />
            </div>

            <div className="sm:col-span-4">
              <label
                htmlFor="new-member-password"
                className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Senha
              </label>
              <input
                id="new-member-password"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Opcional"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-white/40"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 whitespace-nowrap"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                <span>Criar</span>
              </button>
            </div>
          </div>

          <div className="max-w-xs">
            <span className="mb-2 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Avatar
            </span>
            <AvatarPicker
              selectedAvatarId={newAvatarId}
              onSelect={(item) => {
                setNewAvatarId(item.id);
                setNewColor(item.bgColor);
              }}
            />
          </div>
        </form>
        {createError && (
          <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
            {createError}
          </p>
        )}
      </div>

      <div
        ref={menuContainerRef}
        className="rounded-2xl border border-zinc-200/80 bg-white dark:border-white/10 dark:bg-[#12141A]/85 dark:backdrop-blur-md"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-white/10">
          <h3 className="inline-flex items-center gap-2 font-display text-base font-bold text-zinc-900 dark:text-zinc-100">
            <Users className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
            <span>Membros</span>
          </h3>
          <span className="font-mono text-xs font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
            {profiles.length}
          </span>
        </div>

        <div className="divide-y divide-zinc-100 px-5 dark:divide-white/[0.06]">
          {profiles.map((prof) => {
            const isCasa = prof.role === ProfileRole.CASA;
            const related = countRelatedExpenses(prof.id);
            const menuOpen = openMenuId === prof.id;
            return (
              <div
                key={prof.id}
                className="flex items-center justify-between gap-3 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ProfileAvatar profile={prof} size="md" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {prof.name}
                      </span>
                      {isCasa && (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300"
                          title="Perfil administrador protegido"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <KeyRound className="h-3 w-3" aria-hidden="true" />
                        {prof.password ? prof.password : 'Livre'}
                      </span>
                      <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">
                        ·
                      </span>
                      <span
                        className="inline-flex items-center gap-1 font-mono tabular-nums"
                        title={`${related.created} criadas, ${related.assigned} atribuídas`}
                      >
                        <Receipt className="h-3 w-3" aria-hidden="true" />
                        {related.created} / {related.assigned}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuId((cur) => (cur === prof.id ? null : prof.id))
                    }
                    aria-label={`Ações para ${prof.name}`}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </button>

                  {menuOpen && (
                    <div
                      role="menu"
                      aria-label={`Menu do membro ${prof.name}`}
                      className="animate-menu absolute right-0 top-full z-30 mt-1 w-44 origin-top-right rounded-2xl border border-zinc-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/12 dark:bg-[#171A21]/95"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpenMenuId(null);
                          openEdit(prof);
                        }}
                        className="flex min-h-[38px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
                      >
                        <Pencil className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                        <span>Editar</span>
                      </button>
                      {!isCasa && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpenMenuId(null);
                            setDeleteTarget(prof);
                          }}
                          className="flex min-h-[38px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Excluir</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Edição de Perfil */}
      {editingProfile && (
        <div
          className="animate-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
        >
          <div className="animate-modal w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white/95 p-5 shadow-2xl backdrop-blur-xl dark:border-white/12 dark:bg-[#12141A]/95">
            <div className="mb-4 flex items-center justify-between">
              <h3
                id="edit-profile-title"
                className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100"
              >
                {editingProfile.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                aria-label="Fechar edição de perfil"
                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} noValidate className="space-y-4">
              <div>
                <span className="mb-2 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Avatar
                </span>
                <AvatarPicker
                  selectedAvatarId={editAvatarId}
                  onSelect={(item) => {
                    setEditAvatarId(item.id);
                    setEditAvatarColor(item.bgColor);
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-profile-name"
                  className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Nome *
                </label>
                <input
                  id="edit-profile-name"
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    if (editError) setEditError('');
                  }}
                  key={`edit-err-${editError ? shakeTrigger : 'ok'}`}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-zinc-900 outline-none dark:text-zinc-100 ${
                    editError
                      ? 'animate-shake border-red-500 bg-red-50/40 ring-2 ring-red-100 dark:bg-red-950/30 dark:ring-red-900/50'
                      : 'border-zinc-200 bg-white focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:focus:border-white/40'
                  }`}
                />
                {editError && (
                  <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                    {editError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="edit-profile-password"
                  className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Senha
                </label>
                <input
                  id="edit-profile-password"
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Deixe vazio para sem senha"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-white/12 dark:bg-white/[0.05] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-white/40"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="min-h-[42px] rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/12 dark:text-zinc-200 dark:hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmação com Aviso de Exclusão em Cascata */}
      {deleteTarget && (
        <div
          className="animate-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cascade-delete-title"
        >
          <div className="animate-modal w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/12 dark:bg-[#12141A]/95">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3
                  id="cascade-delete-title"
                  className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100"
                >
                  Excluir {deleteTarget.name}?
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                  Remove gastos criados, categorias e vínculos compartilhados deste perfil.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-[42px] rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-[#181B20] dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="min-h-[42px] rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Excluir perfil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
