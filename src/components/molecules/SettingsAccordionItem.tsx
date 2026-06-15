import { ChevronDown, ChevronUp } from "lucide-react"
import React from "react"

interface SettingsAccordionItemProps {
  id: string
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function SettingsAccordionItem({
  id,
  title,
  isOpen,
  onToggle,
  children
}: SettingsAccordionItemProps) {
  return (
    <div className="border border-border-primary rounded-2xl bg-surface overflow-hidden shadow-sm hover:shadow-md transition-all">
      <button
        type="button"
        id={id}
        onClick={onToggle}
        className="flex items-center justify-between w-full p-4 bg-muted hover:bg-surface-hover transition-colors font-bold text-xs text-text-primary border-b border-border-primary/60 select-none cursor-pointer">
        <span className="flex items-center gap-1.5 uppercase tracking-wider">
          {title}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        )}
      </button>
      {isOpen && children}
    </div>
  )
}
