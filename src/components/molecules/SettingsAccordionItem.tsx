import { ChevronDown, ChevronUp } from "lucide-react"
import React from "react"

interface SettingsAccordionItemProps {
  id: string
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  headerAccessory?: React.ReactNode
}

export function SettingsAccordionItem({
  id,
  title,
  isOpen,
  onToggle,
  children,
  headerAccessory
}: SettingsAccordionItemProps) {
  return (
    <div className="border border-border-primary rounded-2xl bg-surface overflow-hidden shadow-sm hover:shadow-md transition-all">
      <button
        type="button"
        id={id}
        onClick={onToggle}
        className="flex items-center w-full p-4 bg-muted hover:bg-surface-hover transition-colors font-bold text-xs text-text-primary border-b border-border-primary/60 select-none cursor-pointer">
        <span className="flex items-center gap-1.5 uppercase tracking-wider flex-grow text-left">
          {title}
        </span>
        {headerAccessory && <div className="mr-3">{headerAccessory}</div>}
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-text-secondary shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" />
        )}
      </button>
      {isOpen && children}
    </div>
  )
}
