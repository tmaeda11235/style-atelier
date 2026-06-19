import { cva } from "class-variance-authority"

export const iconButtonVariants = cva(
  "inline-flex items-center justify-center transition-all focus:outline-none",
  {
    variants: {
      variant: {
        slate: "bg-slate-800 text-white hover:bg-slate-700",
        white: "bg-white/80 text-slate-400 hover:text-slate-600 shadow-sm",
        indigo: "bg-indigo-600 text-white hover:bg-indigo-700",
        danger: "bg-red-500 text-white hover:bg-red-600",
        yellow: "bg-yellow-400 text-white hover:bg-yellow-500",
        blue: "bg-blue-600 text-white hover:bg-blue-700"
      },
      size: {
        xs: "p-0.5",
        sm: "p-1",
        md: "p-2",
        lg: "p-3"
      },
      rounded: {
        true: "rounded-full",
        false: "rounded-md"
      }
    },
    defaultVariants: {
      variant: "slate",
      size: "sm",
      rounded: true
    }
  }
)
