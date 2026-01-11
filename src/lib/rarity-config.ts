export const RARITY_CONFIG = {
  Common: {
    name: 'Common',
    color: '#94a3b8', // slate-400
    bgClass: 'bg-slate-400',
    borderClass: 'border-slate-400',
    textClass: 'text-slate-900',
    glowClass: '',
  },
  Rare: {
    name: 'Rare',
    color: '#3b82f6', // blue-500
    bgClass: 'bg-blue-500',
    borderClass: 'border-blue-500',
    textClass: 'text-white',
    glowClass: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]',
  },
  Epic: {
    name: 'Epic',
    color: '#a855f7', // purple-500
    bgClass: 'bg-purple-500',
    borderClass: 'border-purple-500',
    textClass: 'text-white',
    glowClass: 'shadow-[0_0_15px_rgba(168,85,247,0.6)]',
  },
  Legendary: {
    name: 'Legendary',
    color: '#eab308', // yellow-500
    bgClass: 'bg-yellow-500',
    borderClass: 'border-yellow-500',
    textClass: 'text-white',
    glowClass: 'shadow-[0_0_20px_rgba(234,179,8,0.7)] animate-pulse',
  },
} as const;

export type RarityTier = keyof typeof RARITY_CONFIG;