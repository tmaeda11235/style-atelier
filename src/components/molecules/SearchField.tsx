import React from "react"
import { Input } from "../atoms/Input"

/**
 * オートコンプリート機能を備えた検索フィールド。
 *
 * @param {Object} props
 * @param {string[]} [props.options] - オートコンプリートの候補リスト
 * @param {string} [props.id] - datalistとinputを紐付けるID
 * @param {string} [props.placeholder] - プレースホルダ
 * @param {string} [props.value] - 入力値
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} [props.onChange] - 変更ハンドラ
 * @param {string} [props.className=''] - 追加のカスタムクラス
 */
interface SearchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  options?: string[]
  id?: string
}

export function SearchField({
  options = [],
  id = "search-options",
  className = "",
  ...props
}: SearchFieldProps) {
  return (
    <div className={`w-full ${className}`}>
      <Input
        list={id}
        autoComplete="off"
        {...props}
      />
      {options.length > 0 && (
        <datalist id={id}>
          {options.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      )}
    </div>
  )
}