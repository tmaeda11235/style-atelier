import React from "react"

/**
 * プロジェクト全体の標準的なボタンスタイルを提供するAtomコンポーネント。
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - ボタンのラベルやコンテンツ
 * @param {'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'} [props.variant='primary'] - ボタンの視覚スタイル
 * @param {'sm' | 'md' | 'lg' | 'icon'} [props.size='md'] - ボタンのサイズ
 * @param {boolean} [props.fullWidth=false] - 幅を100%にするかどうか
 * @param {string} [props.className=''] - 追加のカスタムクラス
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline"
  size?: "xs" | "sm" | "md" | "lg" | "icon"
  fullWidth?: boolean
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"

  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-500",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-500",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
    outline: "bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-500",
  }

  const sizes = {
    xs: "px-2 py-1 text-[10px]",
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
    icon: "p-2",
  }

  const widthStyle = fullWidth ? "w-full" : ""

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}