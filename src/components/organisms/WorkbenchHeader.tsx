import { BookUp2, Clock, Dices, Redo, Trash2, Undo } from "lucide-react"
import React, { useEffect, useRef, useState } from "react"

import type { RecipeHistoryItem, StyleCard } from "../../lib/db-schema"
import { Button } from "../atoms/Button"

export interface WorkbenchHeaderProps {
  workbenchCards: StyleCard[]
  clearWorkbench: () => void
  pickRandomCards: () => void
  isShuffling?: boolean
  recipeHistory: RecipeHistoryItem[]
  handleRestoreRecipe: (recipe: RecipeHistoryItem) => void
  deleteRecipeHistory: (id: string) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  t: any
}

interface RecipeHistoryItemRowProps {
  recipe: RecipeHistoryItem
  handleRestoreRecipe: (recipe: RecipeHistoryItem) => void
  deleteRecipeHistory: (id: string) => void
  setIsOpen: (open: boolean) => void
}

interface RecipeHistoryDropdownProps {
  recipeHistory: RecipeHistoryItem[]
  handleRestoreRecipe: (recipe: RecipeHistoryItem) => void
  deleteRecipeHistory: (id: string) => void
  setIsOpen: (open: boolean) => void
  t: any
}

interface HistoryMenuProps {
  recipeHistory: RecipeHistoryItem[]
  handleRestoreRecipe: (recipe: RecipeHistoryItem) => void
  deleteRecipeHistory: (id: string) => void
  t: any
}

interface HistoryControlsProps {
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

function useOutsideClick(
  ref: React.RefObject<HTMLElement | null>,
  callback: () => void
) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [ref, callback])
}

const RecipeHistoryItemRow: React.FC<RecipeHistoryItemRowProps> = ({
  recipe,
  handleRestoreRecipe,
  deleteRecipeHistory,
  setIsOpen
}) => {
  return (
    <div className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group transition-colors duration-150">
      <button
        onClick={() => {
          handleRestoreRecipe(recipe)
          setIsOpen(false)
        }}
        className="flex-1 text-left mr-2 min-w-0 cursor-pointer"
        title="Restore this recipe">
        <div className="font-semibold text-slate-700 dark:text-slate-300 truncate">
          {recipe.name}
        </div>
        <div className="text-[9px] text-slate-400">
          {new Date(recipe.timestamp).toLocaleString()}
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          deleteRecipeHistory(recipe.id)
        }}
        className="text-slate-400 hover:text-red-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
        title="Delete from history"
        type="button">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

const RecipeHistoryDropdown: React.FC<RecipeHistoryDropdownProps> = ({
  recipeHistory,
  handleRestoreRecipe,
  deleteRecipeHistory,
  setIsOpen,
  t
}) => {
  return (
    <div
      className="absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-55 p-2 text-xs font-normal animate-in fade-in slide-in-from-top-1 duration-150"
      data-testid="workbench-history-dropdown"
      style={{ zIndex: 999 }}>
      <div className="px-2 py-1.5 font-bold text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
        <span>{t.pastRecipes || "Past Recipes"}</span>
        <span className="text-[9px] lowercase font-normal">
          {recipeHistory.length} items
        </span>
      </div>
      {recipeHistory.length === 0 ? (
        <div className="px-2 py-4 text-center text-slate-400 italic">
          {t.noRecipes || "No history yet"}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {recipeHistory.map((recipe) => (
            <RecipeHistoryItemRow
              key={recipe.id}
              recipe={recipe}
              handleRestoreRecipe={handleRestoreRecipe}
              deleteRecipeHistory={deleteRecipeHistory}
              setIsOpen={setIsOpen}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const HistoryMenu: React.FC<HistoryMenuProps> = ({
  recipeHistory,
  handleRestoreRecipe,
  deleteRecipeHistory,
  t
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  useOutsideClick(dropdownRef, () => setIsOpen(false))

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-[10px] font-bold shadow-sm active:scale-95 transition-all duration-200 cursor-pointer"
        title="View blend history"
        id="workbench-history-btn"
        data-testid="workbench-history-btn"
        type="button">
        <Clock className="w-3.5 h-3.5" />
        <span>{t.recipeHistory || "History"}</span>
      </button>
      {isOpen && (
        <RecipeHistoryDropdown
          recipeHistory={recipeHistory}
          handleRestoreRecipe={handleRestoreRecipe}
          deleteRecipeHistory={deleteRecipeHistory}
          setIsOpen={setIsOpen}
          t={t}
        />
      )}
    </div>
  )
}

const HistoryControls: React.FC<HistoryControlsProps> = ({
  undo,
  redo,
  canUndo,
  canRedo
}) => (
  <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2">
    <button
      onClick={undo}
      disabled={!canUndo}
      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
      title="Undo (Ctrl+Z)"
      id="workbench-undo-btn"
      data-testid="workbench-undo-btn"
      type="button">
      <Undo className="w-3.5 h-3.5" />
    </button>
    <button
      onClick={redo}
      disabled={!canRedo}
      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
      title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
      id="workbench-redo-btn"
      data-testid="workbench-redo-btn"
      type="button">
      <Redo className="w-3.5 h-3.5" />
    </button>
  </div>
)

interface GachaButtonProps {
  pickRandomCards: () => void
  isShuffling?: boolean
  t: any
}

const GachaButton: React.FC<GachaButtonProps> = ({
  pickRandomCards,
  isShuffling,
  t
}) => (
  <button
    onClick={pickRandomCards}
    disabled={isShuffling}
    className={`flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-full text-[10px] font-bold shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all duration-200 cursor-pointer ${
      isShuffling ? "opacity-50 cursor-not-allowed" : ""
    }`}
    title="Pick 1-3 random styles from library"
    id="workbench-gacha-btn"
    data-testid="workbench-gacha-btn"
    type="button">
    <Dices className={`w-3.5 h-3.5 ${isShuffling ? "animate-spin" : ""}`} />
    <span>{t.gachaPick || "Gacha Pick"}</span>
  </button>
)

export const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = (props) => {
  const {
    workbenchCards,
    clearWorkbench,
    pickRandomCards,
    isShuffling,
    undo,
    redo,
    canUndo,
    canRedo,
    t
  } = props

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
        <BookUp2 className="w-5 h-5 text-blue-500 dark:text-blue-400" />
        Workbench
      </h2>
      <div className="flex items-center gap-2">
        <HistoryControls
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        <HistoryMenu {...props} />
        <GachaButton
          pickRandomCards={pickRandomCards}
          isShuffling={isShuffling}
          t={t}
        />
        {workbenchCards.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearWorkbench}
            className="text-slate-400 hover:text-slate-600 text-[10px] h-6 px-2">
            {t.clearAll || "Clear"}
          </Button>
        )}
      </div>
    </div>
  )
}
