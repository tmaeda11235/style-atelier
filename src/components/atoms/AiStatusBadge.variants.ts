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

export const aiStatusBadgeTooltipVariants = cva(
  "absolute hidden group-hover:block group-focus-within:block bg-slate-900 dark:bg-slate-950 text-white text-[10px] font-normal rounded-lg p-2.5 shadow-xl w-56 z-[9999] pointer-events-none leading-relaxed transition-all animate-in fade-in duration-150 bottom-full left-1/2 -translate-x-1/2 mb-2 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-900 dark:after:border-t-slate-950"
)
