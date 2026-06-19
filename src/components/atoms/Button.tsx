import { type VariantProps } from "class-variance-authority"
import React from "react"

import { cn, extractLayoutClasses } from "../../lib/utils"
import { buttonVariants } from "./Button.variants"

/**
 * プロジェクト全体の標準的なボタンスタイルを提供するAtomコンポーネント。
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - ボタンのラベルやコンテンツ
 * @param {'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'} [props.variant='primary'] - ボタンの視覚スタイル
 * @param {'xs' | 'sm' | 'md' | 'lg' | 'icon'} [props.size='md'] - ボタンのサイズ
 * @param {boolean} [props.fullWidth=false] - 幅を100%にするかどうか
 * @param {string} [props.className=''] - 追加のカスタムクラス
 */
export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  children,
  variant,
  size,
  fullWidth,
  className = "",
  ...props
}: ButtonProps) {
  const layoutClassName = extractLayoutClasses(className)

  return (
    <button
      className={cn(
        buttonVariants({ variant, size, fullWidth }),
        layoutClassName
      )}
      {...props}>
      {children}
    </button>
  )
}
