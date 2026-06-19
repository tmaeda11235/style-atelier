import { cva } from "class-variance-authority"

export const inputVariants = cva(
  "transition-all duration-200 outline-none focus:outline-none disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:opacity-50 font-sans",
  {
    variants: {
      variant: {
        default:
          "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500",
        error:
          "bg-white dark:bg-slate-800 border border-red-500 dark:border-red-500 text-slate-900 dark:text-slate-100 rounded-md shadow-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 placeholder-red-300",
        unstyled:
          "bg-transparent border-0 outline-none p-0 focus:ring-0 shadow-none rounded-none"
      },
      size: {
        xs: "px-2 py-1 text-[10px] rounded",
        sm: "px-2.5 py-1.5 text-xs rounded-lg",
        md: "px-3 py-2 text-sm rounded-md",
        lg: "px-3.5 py-2.5 text-sm rounded-xl"
      },
      width: {
        full: "w-full",
        auto: "w-auto"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      width: "full"
    }
  }
)
