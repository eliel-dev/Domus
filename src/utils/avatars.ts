import { ProfileRole, UserProfile } from '../types/finance';

export interface AvatarCatalogItem {
  id: string;
  displayName: string;
  imageUrl: string;
  bgColor: string;
}

export const AVATAR_CATALOG: AvatarCatalogItem[] = [
  {
    id: 'casa',
    displayName: 'Casa',
    imageUrl: '/src/assets/images/avatar_casa_1794810321243.jpg',
    bgColor: '#27272A',
  },
  {
    id: 'ana',
    displayName: 'Ana',
    imageUrl: '/src/assets/images/avatar_ana_1794810321763.jpg',
    bgColor: '#2563EB',
  },
  {
    id: 'carlos',
    displayName: 'Carlos',
    imageUrl: '/src/assets/images/avatar_carlos_1794810321689.jpg',
    bgColor: '#4F46E5',
  },
  {
    id: 'sofia',
    displayName: 'Sofia',
    imageUrl: '/src/assets/images/avatar_sofia_1794810322550.jpg',
    bgColor: '#D97706',
  },
  {
    id: 'lucas',
    displayName: 'Lucas',
    imageUrl: '/src/assets/images/avatar_lucas_1794810321324.jpg',
    bgColor: '#DC2626',
  },
  {
    id: 'clara',
    displayName: 'Clara',
    imageUrl: '/src/assets/images/avatar_clara_1794810322636.jpg',
    bgColor: '#7C3AED',
  },
];

export function resolveAvatarForProfile(profile: UserProfile): AvatarCatalogItem {
  if (profile.avatarId) {
    const byId = AVATAR_CATALOG.find((item) => item.id === profile.avatarId);
    if (byId) return byId;
  }

  if (profile.role === ProfileRole.CASA || profile.id === 'user_casa') {
    return AVATAR_CATALOG[0];
  }
  if (profile.id === 'user_ana') return AVATAR_CATALOG[1];
  if (profile.id === 'user_carlos') return AVATAR_CATALOG[2];
  if (profile.id === 'user_sofia') return AVATAR_CATALOG[3];

  const byColor = AVATAR_CATALOG.find(
    (item) => item.bgColor.toLowerCase() === profile.avatarColor.toLowerCase()
  );
  if (byColor) return byColor;

  // Deterministic fallback among character avatars
  let hash = 0;
  for (let i = 0; i < profile.name.length; i++) {
    hash = (hash * 31 + profile.name.charCodeAt(i)) | 0;
  }
  const pool = AVATAR_CATALOG.slice(1);
  return pool[Math.abs(hash) % pool.length];
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) {
    return `rgba(220, 38, 38, ${alpha})`;
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) {
    return `rgba(220, 38, 38, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
