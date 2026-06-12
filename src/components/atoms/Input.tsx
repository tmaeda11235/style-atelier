import React from "react"

/**
 * 汎用的なテキスト入力フィールドを提供するAtomコンポーネント。
 *
 * @param {Object} props
 * @param {string} [props.className=''] - 追加のカスタムクラス
 */
type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-400 ${className}`}
      {...props}
    />
  )
}
