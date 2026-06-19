import { type VariantProps } from "class-variance-authority"
import React from "react"

import { cn, extractLayoutClasses } from "../../lib/utils"
import { inputVariants } from "./Input.variants"

/**
 * 汎用的なテキスト入力フィールドを提供するAtomコンポーネント。
 *
 * @param {Object} props
 * @param {string} [props.className=''] - 追加のカスタムクラス
 */
export interface InputProps
  extends
    React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

export function Input({ width, className = "", ...props }: InputProps) {
  const layoutClassName = extractLayoutClasses(className)

  return (
    <input
      className={cn(inputVariants({ width }), layoutClassName)}
      {...props}
    />
  )
}
