import React from "react"

/**
 * アイコンを表示するための円形または四角形のボタン。
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - SVGアイコンなど
 * @param {boolean} [props.rounded=true] - 円形にするかどうか
 * @param {'sm' | 'md' | 'lg'} [props.size='sm'] - ボタンのサイズ
 * @param {'slate' | 'white' | 'indigo' | 'danger'} [props.variant='slate'] - カラースタイル
 */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  rounded?: boolean
  size?: "xs" | "sm" | "md" | "lg"
  variant?: "slate" | "white" | "indigo" | "danger" | "yellow"
}

export function IconButton({
  children,
  rounded = true,
  size = "sm",
  variant = "slate",
  className = "",
  ...props
}: IconButtonProps) {
  const baseStyles = "inline-flex items-center justify-center transition-all focus:outline-none"
  const shapeStyle = rounded ? "rounded-full" : "rounded-md"

  const sizes = {
    xs: "p-0.5",
    sm: "p-1",
    md: "p-2",
    lg: "p-3",
  }

  const variants = {
    slate: "bg-slate-800 text-white hover:bg-slate-700",
    white: "bg-white/80 text-slate-400 hover:text-slate-600 shadow-sm",
    indigo: "bg-indigo-600 text-white hover:bg-indigo-700",
    danger: "bg-red-500 text-white hover:bg-red-600",
    yellow: "bg-yellow-400 text-white hover:bg-yellow-500",
  }

  return (
    <button
      className={`${baseStyles} ${shapeStyle} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}