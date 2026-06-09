import { Edit3, Plus, X } from "lucide-react"
import React, { useState } from "react"

import { useParameterAliases } from "../../hooks/useParameterAliases"
import { useParameterArray } from "../../hooks/useParameterArray"
import { useParameterFolders } from "../../hooks/useParameterFolders"
import type { StyleCard } from "../../lib/db-schema"
import { cn } from "../../lib/utils"
import { Input } from "../atoms/Input"
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
  const [aliasNameInput, setAliasNameInput] = useState("")
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(
    undefined
  )
  const [newFolderNameInput, setNewFolderNameInput] = useState("")

  const typeAliases = aliases.filter(
    (a) => (a.paramType || (a as any).type) === parameterType
  )

  const handleOpenEdit = (val: string) => {
    const existing = typeAliases.find((a) => a.value === val)
    setEditingValue(val)
    setAliasNameInput(existing ? existing.alias || (existing as any).name : "")
    setSelectedFolderId(existing ? existing.folderId : undefined)
    setNewFolderNameInput("")
  }

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
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
                title="Edit alias"
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
                    Used in Styles:
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
                            🖼️
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
            className="h-8 text-xs bg-white w-full"
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
          className="p-1 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors h-8 flex items-center justify-center"
          type="button">
          <Plus className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Alias Edit Modal */}
      {editingValue && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl p-4 w-80 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-slate-700">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                Edit Parameter Alias
              </h4>
              <button
                onClick={() => setEditingValue(null)}
                className="text-slate-400 hover:text-slate-600"
                type="button">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">
                  Parameter Value
                </label>
                <div className="text-xs font-mono text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 truncate">
                  {editingValue}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">
                  Alias Name
                </label>
                <input
                  type="text"
                  value={aliasNameInput}
                  onChange={(e) => setAliasNameInput(e.target.value)}
                  placeholder="My Custom Style"
                  className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">
                  Folder / Category
                </label>
                <select
                  value={selectedFolderId || ""}
                  onChange={(e) => {
                    setSelectedFolderId(e.target.value || undefined)
                    if (e.target.value !== "__new__") {
                      setNewFolderNameInput("")
                    }
                  }}
                  className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white font-semibold">
                  <option value="">(No Folder)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                  <option value="__new__">+ Create New Folder...</option>
                </select>
                {selectedFolderId === "__new__" && (
                  <input
                    type="text"
                    value={newFolderNameInput}
                    onChange={(e) => setNewFolderNameInput(e.target.value)}
                    placeholder="Enter new folder name"
                    className="w-full text-xs border border-slate-200 rounded p-1.5 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => {
                  const existing = typeAliases.find(
                    (a) => a.value === editingValue
                  )
                  if (existing) {
                    deleteAlias(existing.id)
                  }
                  setEditingValue(null)
                }}
                className="px-2.5 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50 rounded-md border border-red-100 transition-colors"
                type="button">
                Delete
              </button>
              <button
                onClick={async () => {
                  let folderId = selectedFolderId
                  if (
                    selectedFolderId === "__new__" &&
                    newFolderNameInput.trim()
                  ) {
                    const newFolderId = await addFolder({
                      name: newFolderNameInput.trim()
                    })
                    folderId = newFolderId
                  }

                  const existing = typeAliases.find(
                    (a) => a.value === editingValue
                  )
                  await saveAlias({
                    id: existing?.id,
                    alias: aliasNameInput.trim() || editingValue,
                    value: editingValue,
                    paramType: parameterType as any,
                    folderId: folderId === "__new__" ? undefined : folderId
                  })
                  setEditingValue(null)
                }}
                className="px-3 py-1.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
                type="button">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
