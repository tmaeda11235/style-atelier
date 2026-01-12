import React from "react"

/**
 * 汎用的なテキスト入力フィールドを提供するAtomコンポーネント。
 *
 * @param {Object} props
 * @param {string} [props.className=''] - 追加のカスタムクラス
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 ${className}`}
      {...props}
    />
  )
}