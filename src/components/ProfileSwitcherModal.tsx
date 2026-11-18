import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  Check,
  Eye,
  EyeOff,
  Lock,
  Moon,
  Plus,
  Sun,
  UserCog,
  X,
} from 'lucide-react';
import { ProfileRole, UserProfile } from '../types/finance';
import { hexToRgba, resolveAvatarForProfile } from '../utils/avatars';
import { AvatarPicker, ProfileAvatar } from './ProfileAvatar';
import { DomusBrand } from './DomusBrand';

interface ProfileSwitcherModalProps {
  isOpen: boolean;
  canDismiss?: boolean;
  initialTab?: 'switch' | 'edit-own';
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  currentUser: UserProfile;
  profiles: UserProfile[];
  onClose: () => void;
  onSwitchUser: (userId: string) => void;
  onUpdateOwnProfile: (
    name: string,
    password: string,
    avatarId?: string,
    avatarColor?: string
  ) => { ok: true } | { ok: false; error: string };
  onOpenManagePeople?: (targetProfileId?: string) => void;
}

export const ProfileSwitcherModal: React.FC<ProfileSwitcherModalProps> = ({
  isOpen,
  canDismiss = true,
  initialTab = 'switch',
  theme,
  onToggleTheme,
  currentUser,
  profiles,
  onClose,
  onSwitchUser,
  onUpdateOwnProfile,
  onOpenManagePeople,
}) => {
  const [tab, setTab] = useState<'switch' | 'edit-own'>(initialTab);
  const [selectedTarget, setSelectedTarget] = useState<UserProfile | null>(null);
  const [hoveredProfileId, setHoveredProfileId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [pinInput, setPinInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pinError, setPinError] = useState('');
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const [ownName, setOwnName] = useState(currentUser.name);
  const [ownPassword, setOwnPassword] = useState(currentUser.password);
  const [ownAvatarId, setOwnAvatarId] = useState<string>(
    () => resolveAvatarForProfile(currentUser).id
  );
  const [ownAvatarColor, setOwnAvatarColor] = useState<string>(
    () => resolveAvatarForProfile(currentUser).bgColor
  );
  const [ownError, setOwnError] = useState('');
  const [ownSaved, setOwnSaved] = useState(false);

  const isCasa = currentUser.role === ProfileRole.CASA;

  useEffect(() => {
    if (!isOpen) return;
    setTab(initialTab);
    setSelectedTarget(null);
    setHoveredProfileId(null);
    setIsEditMode(false);
    setPinInput('');
    setShowPassword(false);
    setPinError('');
    setOwnName(currentUser.name);
    setOwnPassword(currentUser.password);
    const resolved = resolveAvatarForProfile(currentUser);
    setOwnAvatarId(resolved.id);
    setOwnAvatarColor(resolved.bgColor);
    setOwnError('');
    setOwnSaved(false);
  }, [isOpen, initialTab, currentUser]);

  useEffect(() => {
    if (!isOpen || !canDismiss) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, canDismiss, onClose]);

  if (!isOpen) return null;

  const meshProfile =
    profiles.find((p) => p.id === hoveredProfileId) ||
    currentUser ||
    profiles[0];
  const meshHex = meshProfile
    ? resolveAvatarForProfile(meshProfile).bgColor
    : '#DC2626';

  const handleSelectProfile = (prof: UserProfile) => {
    if (isEditMode) {
      if (prof.id === currentUser.id) {
        setIsEditMode(false);
        setTab('edit-own');
        return;
      }
      if (isCasa && onOpenManagePeople) {
        onOpenManagePeople(prof.id);
        onClose();
        return;
      }
    }

    if (!prof.password) {
      onSwitchUser(prof.id);
      onClose();
      return;
    }

    setSelectedTarget(prof);
    setPinInput('');
    setShowPassword(false);
    setPinError('');
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget) return;
    if (pinInput.trim() !== selectedTarget.password) {
      setPinError('Senha incorreta. Tente novamente.');
      setShakeTrigger((n) => n + 1);
      return;
    }
    onSwitchUser(selectedTarget.id);
    onClose();
  };

  const handleSaveOwn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownName.trim()) {
      setOwnError('O nome não pode ficar em branco.');
      setShakeTrigger((n) => n + 1);
      return;
    }
    const res = onUpdateOwnProfile(
      ownName,
      ownPassword,
      ownAvatarId,
      ownAvatarColor
    );
    if (!res.ok) {
      setOwnError(res.error);
      setShakeTrigger((n) => n + 1);
      return;
    }
    setOwnError('');
    setOwnSaved(true);
    setTimeout(() => setOwnSaved(false), 2200);
  };

  // Scene B: NuvioMobile AuthScreen Split-Pane Layout for Password-Protected Profile
  if (tab === 'switch' && selectedTarget) {
    return (
      <div
        className="animate-backdrop fixed inset-0 z-50 overflow-y-auto bg-[#F4F5F8] text-zinc-900 dark:bg-black dark:text-[#F5F7F8]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nuvio-auth-title"
      >
        {/* Nuvio Auth Diagonal Atmospheric Gradient Backdrop */}
        <div
          className="pointer-events-none fixed inset-0 hidden dark:block"
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(122deg, #21113B 0%, #1A0E2F 22%, #130A23 36%, #0A060F 48%, #050408 60%, #000000 72%)',
          }}
        />
        <div
          className="pointer-events-none fixed inset-0 dark:hidden"
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(122deg, #EAE8F3 0%, #F1F2F6 32%, #F6F7FA 65%, #FFFFFF 100%)',
          }}
        />

        {/* Top Utility Controls (Floating Over Auth Layout) */}
        <div className="fixed right-5 top-5 z-20 flex items-center gap-2 sm:right-8 sm:top-6">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={
              theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'
            }
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full border border-zinc-200/90 bg-white/80 text-zinc-700 backdrop-blur-md transition-colors hover:bg-white hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {canDismiss && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Voltar ao painel"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-zinc-200/90 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 backdrop-blur-md transition-colors hover:bg-white hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Fechar</span>
            </button>
          )}
        </div>

        {/* Desktop 2-Zone Split (AuthLargeLayout) + Mobile Centered Stack (AuthMobileLayout) */}
        <div className="relative z-10 min-h-screen lg:grid lg:grid-cols-[1fr_460px] xl:grid-cols-[1fr_520px]">
          {/* Left Showcase Zone (Desktop >= 1024px) */}
          <div className="relative hidden flex-col justify-center px-14 xl:px-24 lg:flex">
            <button
              type="button"
              onClick={() => setSelectedTarget(null)}
              className="absolute left-14 top-7 inline-flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white/80 px-3.5 py-2 text-xs font-semibold text-zinc-700 backdrop-blur-md transition-colors hover:bg-white hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-[#969CA3] dark:hover:bg-white/10 dark:hover:text-[#F5F7F8] xl:left-24"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Todos os perfis</span>
            </button>

            <DomusBrand size="xl" />

            <div className="mt-10 flex items-center gap-5">
              <ProfileAvatar
                profile={selectedTarget}
                size="nuvio"
                showHalo
              />
              <div>
                <div className="font-display text-2xl font-bold text-zinc-900 dark:text-[#F5F7F8]">
                  {selectedTarget.name}
                </div>
                <div className="mt-0.5 text-sm text-zinc-500 dark:text-[#969CA3]">
                  {selectedTarget.role === ProfileRole.CASA
                    ? 'Administrador · Casa'
                    : 'Membro da casa'}
                </div>
              </div>
            </div>

            <h2
              className="mt-10 max-w-md font-display text-[38px] leading-[1.12] font-semibold tracking-tight text-zinc-900 dark:text-[#F5F7F8]"
              style={{ textWrap: 'balance' }}
            >
              Controle compartilhado, sem atritos.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-600 dark:text-[#969CA3]">
              Entre no perfil selecionado para acompanhar parcelas, lançamentos
              do mês e pagamentos em aberto.
            </p>
          </div>

          {/* Right Frosted Side Pane (Desktop) / Centered Mobile Stack */}
          <div className="flex min-h-screen flex-col justify-center px-7 py-14 sm:px-12 lg:border-l lg:border-zinc-200/80 lg:bg-white/60 lg:backdrop-blur-xl dark:lg:border-white/[0.07] dark:lg:bg-white/[0.022]">
            <div className="animate-enter mx-auto w-full max-w-[348px]">
              {/* Mobile Top Lockup */}
              <div className="mb-10 flex flex-col items-center text-center lg:hidden">
                <button
                  type="button"
                  onClick={() => setSelectedTarget(null)}
                  className="mb-8 inline-flex items-center gap-1.5 self-start text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900 dark:text-[#969CA3] dark:hover:text-[#F5F7F8]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Todos os perfis</span>
                </button>

                <DomusBrand size="md" />

                <div className="mt-7">
                  <ProfileAvatar
                    profile={selectedTarget}
                    size="nuvio"
                    showHalo
                  />
                </div>
                <div className="mt-3 text-base font-semibold text-zinc-900 dark:text-[#F5F7F8]">
                  {selectedTarget.name}
                </div>
              </div>

              {/* AuthHeading */}
              <div>
                <h1
                  id="nuvio-auth-title"
                  className="font-display text-[28px] font-semibold leading-[1.1] tracking-tight text-zinc-900 dark:text-[#F5F7F8] sm:text-[30px]"
                >
                  Bem-vindo de volta
                </h1>
                <p className="mt-2 text-[15px] leading-snug text-zinc-600 dark:text-[#969CA3]">
                  Digite a senha de {selectedTarget.name} para entrar.
                </p>
              </div>

              {/* AuthForm */}
              <form
                onSubmit={handleUnlockSubmit}
                noValidate
                className="mt-7"
              >
                <label htmlFor="nuvio-profile-password" className="sr-only">
                  Senha do perfil
                </label>
                <div
                  key={`pin-${pinError ? shakeTrigger : 'ok'}`}
                  className={`flex h-[56px] w-full items-center gap-3 rounded-[14px] border px-4 transition-colors ${
                    pinError
                      ? 'animate-shake border-red-500 bg-red-50/60 dark:bg-red-950/30'
                      : 'border-zinc-200/90 bg-white/85 focus-within:border-zinc-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:focus-within:border-white/30'
                  }`}
                >
                  <Lock
                    className="h-[19px] w-[19px] shrink-0 text-zinc-400 dark:text-[#6E7178]"
                    aria-hidden="true"
                  />
                  <input
                    id="nuvio-profile-password"
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      if (pinError) setPinError('');
                    }}
                    placeholder="Senha"
                    className="h-full w-full bg-transparent text-base text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-[#F5F7F8] dark:placeholder:text-[#6E7178]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-zinc-700 dark:text-[#969CA3] dark:hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-[19px] w-[19px]" aria-hidden="true" />
                    ) : (
                      <Eye className="h-[19px] w-[19px]" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {pinError && (
                  <p className="mt-3 text-[13px] font-medium text-red-600 dark:text-red-400">
                    {pinError}
                  </p>
                )}

                {/* Nuvio AuthPrimaryButton */}
                <button
                  type="submit"
                  className="mt-6 flex h-[54px] w-full items-center justify-center rounded-2xl bg-zinc-900 text-base font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:bg-[#F5F5F5] dark:text-[#111111] dark:hover:bg-white"
                >
                  Entrar
                </button>

                {/* Nuvio AuthDivider */}
                <div className="my-7 flex items-center gap-4">
                  <span
                    className="h-px flex-1 bg-zinc-200 dark:bg-white/[0.10]"
                    aria-hidden="true"
                  />
                  <span className="text-[13px] text-zinc-400 dark:text-[#6E7178]">
                    ou
                  </span>
                  <span
                    className="h-px flex-1 bg-zinc-200 dark:bg-white/[0.10]"
                    aria-hidden="true"
                  />
                </div>

                {/* Nuvio AuthSecondaryButton */}
                <button
                  type="button"
                  onClick={() => setSelectedTarget(null)}
                  className="flex h-[54px] w-full items-center justify-center rounded-2xl border border-zinc-200 bg-white/75 text-[15px] font-medium text-zinc-800 transition-colors hover:bg-white dark:border-white/[0.09] dark:bg-white/[0.05] dark:text-[#F5F7F8] dark:hover:bg-white/[0.09]"
                >
                  Escolher outro perfil
                </button>

                <p className="mt-3.5 text-center text-[13px] text-zinc-500 dark:text-[#6E7178]">
                  Senha padrão inicial dos membros: 123
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Scene A: NuvioMobile ProfileSelectionScreen + Own Profile Edit Stage
  return (
    <div
      className="animate-backdrop fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#F4F5F8] text-zinc-900 dark:bg-black dark:text-[#F5F7F8]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nuvio-profile-title"
    >
      {/* Nuvio ProfileMeshBackground */}
      <div
        className="pointer-events-none fixed inset-0 hidden transition-opacity duration-500 dark:block"
        aria-hidden="true"
        style={{
          backgroundImage: `
            radial-gradient(circle at -8% -2%, ${hexToRgba(meshHex, 0.34)} 0%, ${hexToRgba(meshHex, 0.14)} 38%, transparent 70%),
            radial-gradient(circle at 16% 18%, ${hexToRgba(meshHex, 0.18)} 0%, transparent 46%),
            radial-gradient(circle at 90% 12%, rgba(220, 38, 38, 0.14) 0%, transparent 42%),
            radial-gradient(circle at 28% 40%, rgba(255, 255, 255, 0.05) 0%, transparent 34%)
          `,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 dark:hidden"
        aria-hidden="true"
        style={{
          backgroundImage: `
            radial-gradient(circle at -8% -2%, ${hexToRgba(meshHex, 0.12)} 0%, transparent 58%),
            radial-gradient(circle at 90% 12%, rgba(220, 38, 38, 0.06) 0%, transparent 45%)
          `,
        }}
      />

      {/* Top Portal Controls */}
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex items-center gap-2">
          {canDismiss && tab === 'edit-own' && (
            <button
              type="button"
              onClick={() => setTab('switch')}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-zinc-200/90 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 backdrop-blur-md transition-colors hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/10"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Perfis</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canDismiss && (
            <div className="hidden items-center rounded-full border border-zinc-200/90 bg-white/80 p-1 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.05] sm:flex">
              <button
                type="button"
                onClick={() => {
                  setTab('switch');
                  setSelectedTarget(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === 'switch'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Perfis</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('edit-own');
                  setSelectedTarget(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === 'edit-own'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Meu perfil</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={
              theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'
            }
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full border border-zinc-200/90 bg-white/80 text-zinc-600 backdrop-blur-md transition-colors hover:bg-white hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {canDismiss && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Voltar ao painel"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-zinc-200/90 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 backdrop-blur-md transition-colors hover:bg-white hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Fechar</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Centered Nuvio Stage */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 pb-14 pt-2 sm:px-8">
        {canDismiss && (
          <div className="mb-7 flex items-center rounded-full border border-zinc-200/90 bg-white/80 p-1 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.05] sm:hidden">
            <button
              type="button"
              onClick={() => {
                setTab('switch');
                setSelectedTarget(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === 'switch'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Perfis</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('edit-own');
                setSelectedTarget(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === 'edit-own'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Meu perfil</span>
            </button>
          </div>
        )}

        {tab === 'switch' ? (
          <div className="animate-enter flex w-full flex-col items-center text-center">
            {/* Domus MemberBrandWordmark */}
            <DomusBrand size="lg" />

            <h1
              id="nuvio-profile-title"
              className="mt-2.5 font-display text-base font-medium tracking-tight text-zinc-500 dark:text-[#969CA3] sm:text-lg"
              style={{ textWrap: 'balance' }}
            >
              Quem está usando?
            </h1>

            {/* Nuvio Borderless Circular Avatar Grid / Row */}
            <div className="mt-9 grid max-w-[330px] grid-cols-2 justify-items-center gap-5 sm:mt-10 sm:flex sm:max-w-4xl sm:flex-wrap sm:justify-center sm:gap-5">
              {profiles.map((prof) => {
                const isActive = prof.id === currentUser.id;
                const isAdmin = prof.role === ProfileRole.CASA;
                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => handleSelectProfile(prof)}
                    onMouseEnter={() => setHoveredProfileId(prof.id)}
                    onFocus={() => setHoveredProfileId(prof.id)}
                    onMouseLeave={() => setHoveredProfileId(null)}
                    className="group flex w-[144px] flex-col items-center rounded-[20px] p-2 text-center transition-transform duration-150 hover:scale-[1.03] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 sm:w-[150px]"
                  >
                    <ProfileAvatar
                      profile={prof}
                      size="nuvio"
                      showHalo
                      isActive={isActive}
                      badge={
                        isEditMode ? 'edit' : prof.password ? 'lock' : null
                      }
                    />

                    <span className="mt-3 w-full truncate text-base font-semibold text-zinc-900 dark:text-[#F5F7F8]">
                      {prof.name}
                    </span>

                    <span className="mt-0.5 text-xs text-zinc-500 dark:text-[#969CA3]">
                      {isAdmin
                        ? 'Administrador'
                        : isActive
                        ? 'Perfil atual'
                        : 'Membro'}
                    </span>
                  </button>
                );
              })}

              {isEditMode && isCasa && onOpenManagePeople && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenManagePeople();
                    onClose();
                  }}
                  className="group flex w-[144px] flex-col items-center rounded-[20px] p-2 text-center transition-transform duration-150 hover:scale-[1.03] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 sm:w-[150px]"
                >
                  <span className="flex h-[110px] w-[110px] items-center justify-center">
                    <span className="flex h-[100px] w-[100px] items-center justify-center rounded-full border border-dashed border-zinc-400/70 bg-zinc-200/70 text-zinc-600 transition-colors group-hover:border-zinc-700 group-hover:text-zinc-900 dark:border-white/25 dark:bg-white/[0.06] dark:text-zinc-300 dark:group-hover:border-white/50 dark:group-hover:text-white">
                      <Plus className="h-9 w-9 stroke-[1.75]" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="mt-3 w-full truncate text-base font-semibold text-zinc-600 dark:text-[#969CA3]">
                    Adicionar
                  </span>
                  <span className="mt-0.5 text-xs text-zinc-400 dark:text-[#6E7178]">
                    Novo membro
                  </span>
                </button>
              )}
            </div>

            {/* Nuvio Outlined "Gerenciar perfis" Pill Toggle */}
            <button
              type="button"
              onClick={() => setIsEditMode((v) => !v)}
              className={`mt-9 inline-flex min-h-[42px] items-center justify-center rounded-full border px-6 py-2 text-sm font-semibold transition-all sm:mt-11 ${
                isEditMode
                  ? 'border-red-500/40 bg-red-500/15 text-red-700 dark:border-red-400/40 dark:bg-red-500/15 dark:text-red-300'
                  : 'border-zinc-300/90 text-zinc-600 hover:border-zinc-500 hover:text-zinc-900 dark:border-white/25 dark:text-[#969CA3] dark:hover:border-white/50 dark:hover:text-white'
              }`}
            >
              {isEditMode ? 'Concluir' : 'Gerenciar perfis'}
            </button>

            {isEditMode && (
              <p className="mt-3 text-xs text-zinc-500 dark:text-[#6E7178]">
                {isCasa
                  ? 'Toque em um perfil para editar nome, senha ou avatar.'
                  : 'Toque no seu perfil para editar nome, senha e avatar.'}
              </p>
            )}
          </div>
        ) : (
          /* Own Profile Edit Form with Nuvio AvatarPicker */
          <div className="animate-modal w-full max-w-md rounded-3xl border border-zinc-200/90 bg-white/90 p-7 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#12141A]/90">
            <div className="mb-6 flex items-center gap-4">
              <ProfileAvatar
                profile={{
                  ...currentUser,
                  avatarId: ownAvatarId,
                  avatarColor: ownAvatarColor,
                }}
                size="lg"
                showHalo
              />
              <div>
                <h1
                  id="nuvio-profile-title"
                  className="font-display text-xl font-bold text-zinc-900 dark:text-white"
                >
                  Meu perfil
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Escolha seu avatar, nome de exibição e senha.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveOwn} noValidate className="space-y-5">
              <div>
                <span className="mb-2 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Avatar
                </span>
                <AvatarPicker
                  selectedAvatarId={ownAvatarId}
                  onSelect={(item) => {
                    setOwnAvatarId(item.id);
                    setOwnAvatarColor(item.bgColor);
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="own-name"
                  className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Seu nome *
                </label>
                <input
                  id="own-name"
                  type="text"
                  value={ownName}
                  onChange={(e) => {
                    setOwnName(e.target.value);
                    if (ownError) setOwnError('');
                  }}
                  key={`own-${ownError ? shakeTrigger : 'ok'}`}
                  className={`w-full rounded-[14px] border px-3.5 py-3 text-sm text-zinc-900 outline-none dark:text-white ${
                    ownError
                      ? 'animate-shake border-red-500 bg-red-50/50 ring-2 ring-red-500/20 dark:bg-red-950/30'
                      : 'border-zinc-200 bg-zinc-50/80 focus:border-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-white/35'
                  }`}
                />
                {ownError && (
                  <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                    {ownError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="own-password"
                  className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Sua senha (opcional)
                </label>
                <input
                  id="own-password"
                  type="text"
                  value={ownPassword}
                  onChange={(e) => setOwnPassword(e.target.value)}
                  placeholder="Em branco para acesso direto"
                  className="w-full rounded-[14px] border border-zinc-200 bg-zinc-50/80 px-3.5 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/35"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  {ownSaved && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Alterações salvas
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  className="min-h-[44px] rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-[#F5F5F5] dark:text-[#111111] dark:hover:bg-white"
                >
                  Salvar alterações
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
