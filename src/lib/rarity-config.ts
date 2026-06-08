export const RARITY_CONFIG = {
  Common: {
    name: "Common",
    color: "#94a3b8", // slate-400
    bgClass: "bg-slate-400",
    borderClass: "border-slate-400",
    textClass: "text-slate-900",
    glowClass: ""
  },
  Rare: {
    name: "Rare",
    color: "#3b82f6", // blue-500
    bgClass: "bg-blue-500",
    borderClass: "border-blue-500",
    textClass: "text-white",
    glowClass: "shadow-[0_0_10px_rgba(59,130,246,0.5)]"
  },
  Epic: {
    name: "Epic",
    color: "#a855f7", // purple-500
    bgClass: "bg-purple-500",
    borderClass: "border-purple-500",
    textClass: "text-white",
    glowClass: "shadow-[0_0_20px_rgba(168,85,247,0.8)] shadow-purple-500/50"
  },
  Legendary: {
    name: "Legendary",
    color: "#eab308", // yellow-500
    bgClass: "bg-yellow-500",
    borderClass: "border-yellow-500",
    textClass: "text-white",
    glowClass: "shadow-[0_0_20px_rgba(234,179,8,0.7)] animate-pulse"
  }
} as const

export const UPGRADE_THRESHOLDS: Record<
  Exclude<RarityTier, "Legendary">,
  number
> = {
  Common: 5, // 5 uses to reach Rare
  Rare: 15, // 15 uses to reach Epic
  Epic: 40 // 40 uses to reach Legendary
}

export type RarityTier = keyof typeof RARITY_CONFIG

export interface FallbackColorSet {
  dominantHex: string
  dominantName: string
  accentHex: string
  accentName: string
}

export const RARITY_FALLBACK_COLORS: Record<RarityTier, FallbackColorSet> = {
  Common: {
    dominantHex: "#64748b", // Slate 500
    dominantName: "Gray",
    accentHex: "#94a3b8", // Slate 400
    accentName: "Gray"
  },
  Rare: {
    dominantHex: "#0284c7", // Sky 600
    dominantName: "Blue",
    accentHex: "#38bdf8", // Sky 400
    accentName: "Cyan"
  },
  Epic: {
    dominantHex: "#7c3aed", // Violet 600
    dominantName: "Purple",
    accentHex: "#c084fc", // Purple 400
    accentName: "Purple"
  },
  Legendary: {
    dominantHex: "#d97706", // Amber 600
    dominantName: "Orange",
    accentHex: "#fbbf24", // Amber 400
    accentName: "Yellow"
  }
}
