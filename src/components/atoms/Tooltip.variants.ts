import { cva } from "class-variance-authority"

export const tooltipContentVariants = cva(
  "absolute hidden group-hover:block group-focus-within:block bg-slate-900 text-white text-xs font-normal rounded-lg shadow-xl z-[9999] pointer-events-none leading-relaxed transition-all animate-in fade-in duration-150",
  {
    variants: {
      position: {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-900",
        bottom:
          "top-full left-1/2 -translate-x-1/2 mt-2 after:content-[''] after:absolute after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-b-slate-900",
        left: "right-full top-1/2 -translate-y-1/2 mr-2 after:content-[''] after:absolute after:left-full after:top-1/2 after:-translate-y-1/2 after:border-4 after:border-transparent after:border-l-slate-900",
        right:
          "left-full top-1/2 -translate-y-1/2 ml-2 after:content-[''] after:absolute after:right-full after:top-1/2 after:-translate-y-1/2 after:border-4 after:border-transparent after:border-r-slate-900",
        "top-left":
          "bottom-full left-0 mb-2 after:content-[''] after:absolute after:top-full after:left-1.5 after:border-4 after:border-transparent after:border-t-slate-900",
        "top-right":
          "bottom-full right-0 mb-2 after:content-[''] after:absolute after:top-full after:right-1.5 after:border-4 after:border-transparent after:border-t-slate-900",
        "bottom-left":
          "top-full left-0 mt-2 after:content-[''] after:absolute after:bottom-full after:left-1.5 after:border-4 after:border-transparent after:border-b-slate-900",
        "bottom-right":
          "top-full right-0 mt-2 after:content-[''] after:absolute after:bottom-full after:right-1.5 after:border-4 after:border-transparent after:border-b-slate-900"
      },
      variant: {
        default: "px-2.5 py-1.5 w-max max-w-xs whitespace-nowrap",
        help: "p-2.5 w-56"
      }
    },
    defaultVariants: {
      position: "top",
      variant: "default"
    }
  }
)
