import { cva } from "class-variance-authority"

export const aiStatusBadgeVariants = cva(
  "flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-all duration-200 cursor-help",
  {
    variants: {
      statusType: {
        ready:
          "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400",
        downloading:
          "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-400",
        fallbackWebGpu:
          "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 animate-pulse",
        fallbackModel:
          "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
      }
    },
    defaultVariants: {
      statusType: "fallbackModel"
    }
  }
)
