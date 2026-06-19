import { cva } from "class-variance-authority"

export const imageThumbnailItemVariants = cva(
  "relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-all",
  {
    variants: {
      selected: {
        true: "border-blue-500 ring-2 ring-blue-100 shadow-md",
        false: "border-slate-200 hover:border-slate-400"
      }
    },
    defaultVariants: {
      selected: false
    }
  }
)

export const imageThumbnailBadgeVariants = cva(
  "absolute top-1.5 left-1.5 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1"
)
