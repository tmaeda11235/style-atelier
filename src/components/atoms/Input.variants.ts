import { cva } from "class-variance-authority"

export const inputVariants = cva(
  "px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-400",
  {
    variants: {
      width: {
        full: "w-full",
        auto: "w-auto"
      }
    },
    defaultVariants: {
      width: "full"
    }
  }
)
