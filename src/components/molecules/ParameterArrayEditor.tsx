/* eslint-disable i18next/no-literal-string, max-lines-per-function */
import { Edit3, Plus, X } from "lucide-react"
import React, { useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useParameterAliases } from "../../hooks/useParameterAliases"
import { useParameterArray } from "../../hooks/useParameterArray"
import { useParameterFolders } from "../../hooks/useParameterFolders"
import { cn } from "../../lib/utils"
import type { StyleCard } from "../../shared/lib/db-schema"
import { Input } from "../atoms/Input"
import { AliasEditModal } from "./AliasEditModal"
import { AutocompleteDropdown } from "./AutocompleteDropdown"

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
  options?: string[]
  styleCards?: StyleCard[]
  parameterType: "p" | "sref" | "cref" | "imagePrompts"
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
    hover: "hover:text-blue-900"
  },
  options = [],
  styleCards = [],
  parameterType
}) => {
  const { t } = useLanguage()
  const {
    inputValue,
    setInputValue,
    currentValues,
    addValue,
    removeValue,
    handleKeyDown
  } = useParameterArray({
    values,
    onChange
  })

  const { aliases, saveAlias, deleteAlias } = useParameterAliases()
  const { folders, addFolder } = useParameterFolders()

  const [isOpen, setIsOpen] = useState(false)
  const [editingValue, setEditingValue] = useState<string | null>(null)

  const typeAliases = aliases.filter(
    (a) => (a.paramType || (a as any).type) === parameterType
  )

  const handleOpenEdit = (val: string) => {
    setEditingValue(val)
  }

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
        {icon} {label}
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {currentValues.map((val, idx) => {
          // Identify matching style cards for hover preview
          const matchedCards = styleCards.filter((card) => {
            if (parameterType === "sref")
              return card.parameters?.sref?.includes(val)
            if (parameterType === "p") return card.parameters?.p?.includes(val)
            if (parameterType === "cref")
              return card.parameters?.cref?.includes(val)
            if (parameterType === "imagePrompts")
              return card.parameters?.imagePrompts?.includes(val)
            return false
          })

          const alias = typeAliases.find((a) => a.value === val)

          return (
            <div
              key={`${val}-${idx}`}
              className={cn(
                "group/badge relative flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-default transition-all hover:shadow-sm",
                colorClass.bg,
                colorClass.text,
                colorClass.border
              )}>
              <span className="max-w-[120px] truncate" title={val}>
                {alias ? `${alias.alias || (alias as any).name} (${val})` : val}
              </span>

              {/* Alias edit button */}
              <button
                onClick={() => handleOpenEdit(val)}
                className="opacity-40 hover:opacity-100 transition-opacity"
                title={t.parameterArrayEditor?.editAlias || "Edit alias"}
                type="button">
                <Edit3 className="w-2.5 h-2.5" />
              </button>

              <button
                onClick={() => removeValue(idx)}
                className={cn(
                  "opacity-40 hover:opacity-100 transition-opacity",
                  colorClass.hover
                )}
                type="button">
                <X className="w-3 h-3" />
              </button>

              {/* Hover preview tooltip */}
              {matchedCards.length > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/badge:block z-[99] bg-slate-950/95 backdrop-blur text-white text-[10px] p-2.5 rounded-lg shadow-xl border border-slate-800 w-48 pointer-events-none animate-in fade-in duration-200">
                  <div className="font-bold border-b border-slate-800 pb-1 mb-1.5 text-slate-400">
                    {t.parameterArrayEditor?.usedInStyles || "Used in Styles:"}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto scrollbar-none">
                    {matchedCards.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className="flex flex-col gap-0.5 items-center bg-slate-900/60 p-1 rounded">
                        {c.thumbnailData ? (
                          <img
                            src={c.thumbnailData}
                            className="w-12 h-12 object-cover rounded border border-slate-800"
                            alt={c.name}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded border border-slate-800 bg-slate-800 flex items-center justify-center text-[10px]">
                            {t.parameterArrayEditor?.imageEmoji || "🖼️"}
                          </div>
                        )}
                        <span className="truncate w-full text-center text-[8px] font-medium text-slate-300">
                          {c.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex gap-2 items-start">
        <div className="flex-1 relative">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            size="sm"
          />
          {options.length > 0 && (
            <AutocompleteDropdown
              options={options}
              value={inputValue}
              isOpen={isOpen}
              onSelect={(val) => {
                setInputValue(val)
                setIsOpen(false)
              }}
              onClose={() => setIsOpen(false)}
              styleCards={styleCards}
              parameterType={parameterType}
            />
          )}
        </div>
        <button
          onClick={() => addValue(inputValue)}
          className="p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors h-8 flex items-center justify-center cursor-pointer"
          type="button">
          <Plus className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </button>
      </div>

      {/* Alias Edit Modal */}
      {editingValue && (
        <AliasEditModal
          editingValue={editingValue}
          onClose={() => setEditingValue(null)}
          typeAliases={typeAliases}
          parameterType={parameterType}
          folders={folders}
          addFolder={addFolder}
          saveAlias={saveAlias as any}
          deleteAlias={deleteAlias}
        />
      )}
    </div>
  )
}
