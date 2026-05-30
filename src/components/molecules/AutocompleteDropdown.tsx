import React, { useEffect, useRef } from "react"

interface AutocompleteDropdownProps {
  options: string[]
  value: string
  isOpen: boolean
  onSelect: (option: string) => void
  onClose: () => void
}

export function AutocompleteDropdown({
  options,
  value,
  isOpen,
  onSelect,
  onClose,
}: AutocompleteDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter options based on input value
  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(value.toLowerCase()) && opt !== value
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen || filteredOptions.length === 0) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 right-0 z-30 mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg text-xs"
    >
      {filteredOptions.map((opt) => {
        const isUrl = opt.startsWith("http://") || opt.startsWith("https://")
        return (
          <div
            key={opt}
            onClick={() => onSelect(opt)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 cursor-pointer text-slate-700 transition-colors select-none"
          >
            {isUrl ? (
              <>
                <img
                  src={opt}
                  className="w-5 h-5 rounded object-cover border border-slate-200 bg-slate-50 flex-shrink-0"
                  alt="Sref Preview"
                  onError={(e) => {
                    // Hide failed image load and replace with a placeholder
                    e.currentTarget.style.display = "none"
                  }}
                />
                <span className="truncate flex-1 font-mono text-[10px] text-slate-500">
                  {opt}
                </span>
              </>
            ) : (
              <span className="truncate flex-1">{opt}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
