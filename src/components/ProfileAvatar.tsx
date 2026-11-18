import React, { useState } from 'react';
import { Lock, Pencil } from 'lucide-react';
import { UserProfile } from '../types/finance';
import {
  AVATAR_CATALOG,
  AvatarCatalogItem,
  hexToRgba,
  resolveAvatarForProfile,
} from '../utils/avatars';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'nuvio';

interface ProfileAvatarProps {
  profile: UserProfile;
  size?: AvatarSize;
  showHalo?: boolean;
  badge?: 'lock' | 'edit' | null;
  isActive?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<
  AvatarSize,
  { outer: string; inner: string; text: string }
> = {
  xs: { outer: 'h-6 w-6', inner: 'h-6 w-6', text: 'text-[11px]' },
  sm: { outer: 'h-9 w-9', inner: 'h-9 w-9', text: 'text-xs' },
  md: { outer: 'h-10 w-10', inner: 'h-10 w-10', text: 'text-sm' },
  lg: { outer: 'h-14 w-14', inner: 'h-12 w-12', text: 'text-lg' },
  nuvio: {
    outer: 'h-[110px] w-[110px]',
    inner: 'h-[100px] w-[100px]',
    text: 'text-3xl',
  },
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  profile,
  size = 'md',
  showHalo = false,
  badge = null,
  isActive = false,
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const avatar = resolveAvatarForProfile(profile);
  const bgColor = avatar.bgColor || profile.avatarColor;
  const dims = SIZE_CLASSES[size];

  const haloBackground =
    showHalo || size === 'nuvio' ? hexToRgba(bgColor, isActive ? 0.34 : 0.2) : 'transparent';

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${dims.outer} ${className}`}
      style={{ backgroundColor: haloBackground }}
    >
      <span
        className={`relative inline-flex items-center justify-center overflow-hidden rounded-full font-bold text-white shadow-sm ${dims.inner} ${
          isActive && size === 'nuvio'
            ? 'ring-2 ring-zinc-900 dark:ring-white'
            : ''
        }`}
        style={{ backgroundColor: bgColor }}
      >
        {!imgFailed ? (
          <img
            src={avatar.imageUrl}
            alt={profile.name}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full scale-[1.09] object-cover select-none"
          />
        ) : (
          <span className={dims.text} aria-hidden="true">
            {profile.name.charAt(0).toUpperCase()}
          </span>
        )}
      </span>

      {badge === 'edit' && (
        <span
          className="absolute bottom-0 right-0 flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-[#F4F5F8] bg-zinc-900 text-white shadow-md dark:border-[#050608] dark:bg-white dark:text-zinc-950"
          aria-hidden="true"
        >
          <Pencil className="h-4 w-4" />
        </span>
      )}

      {badge === 'lock' && (
        <span
          className="absolute bottom-0 right-0 flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-[#F4F5F8] bg-white text-zinc-700 shadow-sm dark:border-[#050608] dark:bg-[#1B1D24] dark:text-zinc-200"
          title="Protegido por senha"
        >
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}
    </span>
  );
};

interface AvatarPickerProps {
  selectedAvatarId?: string;
  onSelect: (avatar: AvatarCatalogItem) => void;
  items?: AvatarCatalogItem[];
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  selectedAvatarId,
  onSelect,
  items = AVATAR_CATALOG,
}) => {
  return (
    <div
      className="grid grid-cols-6 gap-2.5 sm:gap-3"
      role="radiogroup"
      aria-label="Escolher avatar do perfil"
    >
      {items.map((item) => {
        const isSelected = item.id === selectedAvatarId;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Avatar ${item.displayName}`}
            onClick={() => onSelect(item)}
            className={`group relative aspect-square w-full overflow-hidden rounded-full transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 ${
              isSelected
                ? 'scale-105 ring-[3px] ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-[#12141A]'
                : 'border border-zinc-200 opacity-85 hover:scale-105 hover:opacity-100 dark:border-white/15'
            }`}
            style={{ backgroundColor: item.bgColor }}
          >
            <img
              src={item.imageUrl}
              alt={item.displayName}
              referrerPolicy="no-referrer"
              className="h-full w-full scale-[1.09] object-cover"
            />
          </button>
        );
      })}
    </div>
  );
};
