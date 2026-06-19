import { type VariantProps } from "class-variance-authority"
import React from "react"

import { cn, extractLayoutClasses } from "../../lib/utils"
import { iconButtonVariants } from "./IconButton.variants"

/**
 * アイコンを表示するための円形または四角形のボタン。
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - SVGアイコンなど
 * @param {boolean} [props.rounded=true] - 円形にするかどうか
 * @param {'xs' | 'sm' | 'md' | 'lg'} [props.size='sm'] - ボタンのサイズ
 * @param {'slate' | 'white' | 'indigo' | 'danger' | 'yellow' | 'blue'} [props.variant='slate'] - カラースタイル
 */
export interface IconButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  children: React.ReactNode
}

export function IconButton({
  children,
  rounded,
  size,
  variant,
  className = "",
  ...props
}: IconButtonProps) {
  const layoutClassName = extractLayoutClasses(className)

  return (
    <button
      className={cn(
        iconButtonVariants({ variant, size, rounded }),
        layoutClassName
      )}
      {...props}>
      {children}
    </button>
  )
}
