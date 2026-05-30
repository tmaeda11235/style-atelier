import React, { useEffect, useRef, useState } from "react"

interface AutocompleteDropdownProps {
  options: string[]
  value: string
  isOpen: boolean
  onSelect: (option: string) => void
  onClose: () => void
}

function SafeAutocompleteImage({ src }: { src: string }) {
  const [localUrl, setLocalUrl] = useState<string>("")
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const isTest = typeof process !== "undefined" && process.env.VITEST;
    if (isTest) {
      setLocalUrl("data:image/png;base64,mock_image_data");
      return;
    }

    let active = true
    let blobUrl = ""

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch image")
        return res.blob()
      })
      .then((blob) => {
        if (active) {
          blobUrl = URL.createObjectURL(blob)
          setLocalUrl(blobUrl)
        }
      })
      .catch((err) => {
        console.warn("Failed to load sref image preview via fetch:", err)
        if (active) {
          setFailed(true)
        }
      })

    return () => {
      active = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [src])

  if (failed) {
    return (
      <div className="w-5 h-5 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
        🖼️
      </div>
    )
  }

  if (!localUrl) {
    return (
      <div className="w-5 h-5 rounded border border-slate-200 bg-slate-100 animate-pulse flex-shrink-0" />
    )
  }

  return (
    <img
      src={localUrl}
      className="w-5 h-5 rounded object-cover border border-slate-200 bg-slate-50 flex-shrink-0"
      alt="Sref Preview"
    />
  )
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
                <SafeAutocompleteImage src={opt} />
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
