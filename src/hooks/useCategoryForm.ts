import { useState } from "react"

import type { CustomCategory } from "../lib/db-schema"

function parseEmoji(value: string): string {
  if (!value) return ""
  try {
    const segmenter = new Intl.Segmenter()
    const segments = [...segmenter.segment(value)]
    return segments.length > 0 ? segments[0].segment : ""
  } catch (e) {
    const chars = Array.from(value)
    return chars.length > 0 ? chars[0] : ""
  }
}

function resetFormState(
  setName: (v: string) => void,
  setParentId: (v: string) => void,
  setEmoji: (v: string) => void,
  setIconUrl: (v: string) => void,
  setIconCardId: (v: string) => void
) {
  setName("")
  setParentId("")
  setEmoji("")
  setIconUrl("")
  setIconCardId("")
}

export function useCategoryForm() {
  const [name, setName] = useState("")
  const [parentId, setParentId] = useState("")
  const [emoji, setEmoji] = useState("")
  const [iconUrl, setIconUrl] = useState("")
  const [iconCardId, setIconCardId] = useState("")
  const [isSelectingCard, setIsSelectingCard] = useState(false)
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create")
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(
    null
  )

  const handleEmojiChange = (val: string) => setEmoji(parseEmoji(val))
  const handleSelectCard = (cardId: string, thumb: string) => {
    setIconCardId(cardId)
    setIconUrl(thumb)
    setIsSelectingCard(false)
  }
  const handleClearImage = () => {
    setIconUrl("")
    setIconCardId("")
  }
  const handleCancelEdit = () => {
    setEditingCategory(null)
    resetFormState(setName, setParentId, setEmoji, setIconUrl, setIconCardId)
  }

  return {
    name,
    setName,
    parentId,
    setParentId,
    emoji,
    setEmoji,
    iconUrl,
    setIconUrl,
    iconCardId,
    setIconCardId,
    isSelectingCard,
    setIsSelectingCard,
    activeTab,
    setActiveTab,
    editingCategory,
    setEditingCategory,
    handleEmojiChange,
    handleSelectCard,
    handleClearImage,
    handleCancelEdit,
    resetForm: () =>
      resetFormState(setName, setParentId, setEmoji, setIconUrl, setIconCardId)
  }
}
