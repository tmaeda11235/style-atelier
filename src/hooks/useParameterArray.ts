import { useState } from "react"

interface UseParameterArrayProps {
  values: string[] | string | undefined
  onChange: (newValues: string[] | undefined) => void
}

export const useParameterArray = ({ values, onChange }: UseParameterArrayProps) => {
  const [inputValue, setInputValue] = useState("")

  const getArrayValue = (): string[] => {
    if (Array.isArray(values)) return values
    if (typeof values === "string" && values.trim().length > 0) {
      return values.trim().split(/\s+/).filter((v) => v.length > 0)
    }
    return []
  }

  const currentValues = getArrayValue()

  const addValue = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const newItems = trimmed.split(/\s+/).filter((v) => v.length > 0)
    const updatedValues = [...currentValues]
    let changed = false

    newItems.forEach((item) => {
      if (!updatedValues.includes(item)) {
        updatedValues.push(item)
        changed = true
      }
    })

    if (changed) {
      onChange(updatedValues)
    }
    setInputValue("")
  }

  const removeValue = (index: number) => {
    const updatedValues = currentValues.filter((_, i) => i !== index)
    onChange(updatedValues.length > 0 ? updatedValues : undefined)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addValue(inputValue)
    }
  }

  return {
    inputValue,
    setInputValue,
    currentValues,
    addValue,
    removeValue,
    handleKeyDown,
  }
}