import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
        secondary:
          "bg-muted text-text-primary hover:bg-surface-hover focus:ring-slate-500",
        ghost:
          "bg-transparent text-text-secondary hover:bg-surface-hover focus:ring-slate-500",
        danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
        outline:
          "bg-transparent border border-border-primary text-text-primary hover:bg-surface-hover focus:ring-slate-500"
      },
      size: {
        xs: "px-2 py-1 text-[10px]",
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
        icon: "p-2"
      },
      fullWidth: {
        true: "w-full",
        false: ""
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false
    }
  }
)
