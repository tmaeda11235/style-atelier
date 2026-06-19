import { cva } from "class-variance-authority"

export const rarityBadgeVariants = cva(
  "px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter shadow-sm",
  {
    variants: {
      tier: {
        Common: "bg-slate-400 text-slate-900",
        Rare: "bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]",
        Epic: "bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.8)] shadow-purple-500/50",
        Legendary:
          "bg-yellow-500 text-white shadow-[0_0_20px_rgba(234,179,8,0.7)] animate-pulse"
      }
    },
    defaultVariants: {
      tier: "Common"
    }
  }
)
