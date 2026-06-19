/* eslint-disable max-lines-per-function */
import React, { useEffect, useRef } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useCommandPalette } from "../../hooks/useCommandPalette"
import { Input } from "../atoms/Input"

export function CommandPalette() {
  const { t } = useLanguage()
  const {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    filteredItems,
    isLoading,
    handleKeyDown
  } = useCommandPalette()

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      // Small timeout to ensure the DOM is fully rendered and ready
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeElement = listRef.current.children[
        selectedIndex
      ] as HTMLElement
      if (activeElement && typeof activeElement.scrollIntoView === "function") {
        activeElement.scrollIntoView({
          block: "nearest"
        })
      }
    }
  }, [selectedIndex, isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 bg-slate-950/60 backdrop-blur-sm transition-all duration-200"
      onClick={() => setIsOpen(false)}>
      <div
        className="w-full max-w-xl bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300 transform scale-100 flex flex-col max-h-[60vh] backdrop-filter"
        onClick={(e) => e.stopPropagation()}>
        {/* Search Input Container */}
        <div className="relative flex items-center border-b border-slate-800/80 px-4 py-3 bg-slate-950/40">
          <span className="text-xl text-slate-400 mr-3">🔮</span>
          <Input
            ref={inputRef}
            type="text"
            variant="unstyled"
            className="flex-1 text-slate-100 placeholder-slate-500 text-sm w-full"
            placeholder={
              t.commandPalette?.placeholder ||
              "Type a command or search style cards..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center space-x-1.5 ml-2">
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-medium bg-slate-800 text-slate-400 rounded-md border border-slate-700/60 shadow-sm">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results Container */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto py-2 divide-y divide-slate-800/30"
          style={{ scrollbarWidth: "thin" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
              <span className="animate-spin mr-2">🔄</span>
              {t.commandPalette?.loading || "Loading search targets..."}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <span className="text-2xl mb-2">🤷‍♂️</span>
              <p className="text-slate-400 text-sm font-medium">
                {t.commandPalette?.empty ||
                  "No matching commands, cards, or categories found."}
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isActive = idx === selectedIndex
              return (
                <div
                  key={item.id}
                  className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-150 border-l-4 ${
                    isActive
                      ? "bg-indigo-600/20 border-l-indigo-500 text-indigo-100"
                      : "hover:bg-slate-800/30 border-l-transparent text-slate-300"
                  }`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={item.action}>
                  {/* Icon Indicator */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mr-3.5 shadow-md shrink-0 relative overflow-hidden"
                    style={{
                      backgroundColor: item.color
                        ? `${item.color}15`
                        : "rgba(30, 41, 59, 0.5)",
                      border: item.color
                        ? `1px solid ${item.color}40`
                        : "1px solid rgba(71, 85, 105, 0.2)"
                    }}>
                    {item.color && (
                      <span
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    <span className="text-base select-none">{item.icon}</span>
                  </div>

                  {/* Title and Subtitle */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm font-semibold truncate ${isActive ? "text-indigo-100" : "text-slate-200"}`}>
                        {item.title}
                      </p>
                      {item.type === "command" && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                          CMD
                        </span>
                      )}
                      {item.type === "category" && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800/80 text-emerald-400 border border-emerald-950/50">
                          Folder
                        </span>
                      )}
                      {item.type === "card" && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800/80 text-indigo-400 border border-indigo-950/50">
                          Card
                        </span>
                      )}
                    </div>
                    {item.subtitle && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {t.commandPalette?.shortcutTip || "Press Ctrl+K or Cmd+K to toggle"}
          </span>
          <div className="flex items-center space-x-3">
            <span className="flex items-center">
              <kbd className="px-1 py-0.5 bg-slate-800 rounded mr-1">↑↓</kbd>{" "}
              Navigate
            </span>
            <span className="flex items-center">
              <kbd className="px-1 py-0.5 bg-slate-800 rounded mr-1">↵</kbd>{" "}
              Select
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
