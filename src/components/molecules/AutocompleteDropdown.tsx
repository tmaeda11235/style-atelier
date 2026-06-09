import React, { useEffect, useRef, useState } from "react"

import { useParameterAliases } from "../../hooks/useParameterAliases"
import { useParameterFolders } from "../../hooks/useParameterFolders"
import type { StyleCard } from "../../lib/db-schema"

interface AutocompleteDropdownProps {
  options: string[]
  value: string
  isOpen: boolean
  onSelect: (option: string) => void
  onClose: () => void
  styleCards?: StyleCard[]
  parameterType: "p" | "sref" | "cref" | "imagePrompts"
}

function SafeAutocompleteImage({ src }: { src: string }) {
  const [localUrl, setLocalUrl] = useState<string>("")
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const isTest = typeof process !== "undefined" && process.env.VITEST
    if (isTest) {
      setLocalUrl("data:image/png;base64,mock_image_data")
      return
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
  styleCards = [],
  parameterType
}: AutocompleteDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { aliases } = useParameterAliases()
  const { folders } = useParameterFolders()

  const typeAliases = aliases.filter((a) => a.type === parameterType)

  // Determine autocomplete items (either grouped by folder or filtered list)
  const getFilteredItems = () => {
    if (!value) {
      const items: {
        value: string
        label: string
        isHeader?: boolean
        headerText?: string
      }[] = []

      folders.forEach((folder) => {
        const folderAliases = typeAliases.filter(
          (a) => a.folderId === folder.id
        )
        if (folderAliases.length > 0) {
          items.push({
            value: "",
            label: "",
            isHeader: true,
            headerText: folder.name
          })
          folderAliases.forEach((alias) => {
            items.push({ value: alias.value, label: alias.name })
          })
        }
      })

      const uncategorized = typeAliases.filter((a) => !a.folderId)
      if (uncategorized.length > 0) {
        items.push({
          value: "",
          label: "",
          isHeader: true,
          headerText: "Uncategorized"
        })
        uncategorized.forEach((alias) => {
          items.push({ value: alias.value, label: alias.name })
        })
      }

      if (items.length === 0) {
        options.forEach((opt) => {
          items.push({ value: opt, label: opt })
        })
      }

      return items
    }

    const query = value.toLowerCase()

    // Search in options
    const matchedOptions = options.filter(
      (opt) => opt.toLowerCase().includes(query) && opt !== value
    )

    // Match aliases that might not be in options but match by name or value
    const matchedAliases = typeAliases.filter(
      (alias) =>
        (alias.name.toLowerCase().includes(query) ||
          alias.value.toLowerCase().includes(query)) &&
        alias.value !== value
    )

    // Combine them without duplicates
    const finalSet = new Set<string>()
    const items: { value: string; label: string }[] = []

    matchedAliases.forEach((alias) => {
      if (!finalSet.has(alias.value)) {
        finalSet.add(alias.value)
        items.push({ value: alias.value, label: alias.name })
      }
    })

    matchedOptions.forEach((opt) => {
      if (!finalSet.has(opt)) {
        finalSet.add(opt)
        const alias = typeAliases.find((a) => a.value === opt)
        items.push({ value: opt, label: alias ? alias.name : opt })
      }
    })

    return items
  }

  const items = getFilteredItems()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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

  if (!isOpen || items.length === 0) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg text-xs">
      {items.map((item, idx) => {
        if (item.isHeader) {
          return (
            <div
              key={`header-${idx}`}
              className="px-3 py-1 bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider select-none border-y border-slate-100 first:border-t-0">
              📁 {item.headerText}
            </div>
          )
        }

        const opt = item.value
        const isUrl = opt.startsWith("http://") || opt.startsWith("https://")
        const matchingCard = styleCards.find((c) =>
          c.parameters?.sref?.includes(opt)
        )

        return (
          <div
            key={opt}
            onClick={() => onSelect(opt)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 cursor-pointer text-slate-700 transition-colors select-none">
            {matchingCard && matchingCard.thumbnailData ? (
              <img
                src={matchingCard.thumbnailData}
                className="w-5 h-5 rounded object-cover border border-slate-200 bg-slate-50 flex-shrink-0"
                alt="Card Preview"
              />
            ) : isUrl ? (
              <SafeAutocompleteImage src={opt} />
            ) : (
              <div className="w-5 h-5 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 font-mono text-[9px]">
                #
              </div>
            )}
            <div className="flex flex-col flex-1 min-w-0">
              <span className="truncate font-bold text-slate-800 text-[10px]">
                {item.label}
              </span>
              {item.label !== opt && (
                <span className="truncate font-mono text-[8px] text-slate-400">
                  {opt}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
