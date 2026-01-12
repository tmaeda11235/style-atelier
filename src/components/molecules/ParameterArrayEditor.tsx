import React from "react"
import { Plus, X } from "lucide-react"
import { Input } from "../atoms/Input"
import { useParameterArray } from "../../hooks/useParameterArray"
import { cn } from "../../lib/utils"

interface ParameterArrayEditorProps {
  label: string
  icon: React.ReactNode
  values: string[] | string | undefined
  onChange: (newValues: string[] | undefined) => void
  placeholder?: string
  colorClass?: {
    bg: string
    text: string
    border: string
    hover: string
  }
}

export const ParameterArrayEditor: React.FC<ParameterArrayEditorProps> = ({
  label,
  icon,
  values,
  onChange,
  placeholder = "Add...",
  colorClass = {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-100",
    hover: "hover:text-blue-900",
  },
}) => {
  const { inputValue, setInputValue, currentValues, addValue, removeValue, handleKeyDown } =
    useParameterArray({
      values,
      onChange,
    })

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
        {icon} {label}
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {currentValues.map((val, idx) => (
          <div
            key={`${val}-${idx}`}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
              colorClass.bg,
              colorClass.text,
              colorClass.border
            )}
          >
            <span className="max-w-[150px] truncate">{val}</span>
            <button onClick={() => removeValue(idx)} className={colorClass.hover}>
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-8 text-xs bg-white"
        />
        <button
          onClick={() => addValue(inputValue)}
          className="p-1 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
        >
          <Plus className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  )
}