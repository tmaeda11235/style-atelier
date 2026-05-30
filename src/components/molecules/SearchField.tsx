import React, { useState } from "react"
import { Input } from "../atoms/Input"
import { AutocompleteDropdown } from "./AutocompleteDropdown"

/**
 * オートコンプリート機能を備えた検索フィールド。
 *
 * @param {Object} props
 * @param {string[]} [props.options] - オートコンプリートの候補リスト
 * @param {string} [props.placeholder] - プレースホルダ
 * @param {string} [props.value] - 入力値
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} [props.onChange] - 変更ハンドラ
 * @param {string} [props.className=''] - 追加のカスタムクラス
 */
interface SearchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  options?: string[]
}

export function SearchField({
  options = [],
  className = "",
  ...props
}: SearchFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const inputValue = (props.value as string) || ""

  const handleSelect = (val: string) => {
    if (props.onChange) {
      const syntheticEvent = {
        target: {
          value: val,
        },
      } as React.ChangeEvent<HTMLInputElement>
      props.onChange(syntheticEvent)
    }
    setIsOpen(false)
  }

  return (
    <div className={`w-full relative ${className}`}>
      <Input
        autoComplete="off"
        {...props}
        onFocus={(e) => {
          setIsOpen(true)
          if (props.onFocus) props.onFocus(e)
        }}
      />
      <AutocompleteDropdown
        options={options}
        value={inputValue}
        isOpen={isOpen}
        onSelect={handleSelect}
        onClose={() => setIsOpen(false)}
      />
    </div>
  )
}