import { type VariantProps } from "class-variance-authority"
import React from "react"

import { cn, extractLayoutClasses } from "../../lib/utils"
import { inputVariants } from "./Input.variants"

/**
 * 汎用的なテキスト入力フィールドを提供するAtomコンポーネント。
 */
export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ variant, size, width, className = "", ...props }, ref) => {
    const layoutClassName = extractLayoutClasses(className)

    return (
      <input
        ref={ref}
        className={cn(inputVariants({ variant, size, width }), layoutClassName)}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"
