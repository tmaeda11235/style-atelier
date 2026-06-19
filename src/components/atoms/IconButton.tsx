import { cva, type VariantProps } from "class-variance-authority"
import React from "react"

import { cn } from "../../lib/utils"

/**
 * アイコンを表示するための円形または四角形のボタン。
 */
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

export interface IconButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {}

export function IconButton({
  children,
  variant,
  size,
  rounded,
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn(iconButtonVariants({ variant, size, rounded, className }))}
      {...props}>
      {children}
    </button>
  )
}
