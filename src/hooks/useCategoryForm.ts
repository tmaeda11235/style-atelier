import { useState } from "react"

import type { CustomCategory } from "../shared/lib/db-schema"

function parseEmoji(value: string): string {
  if (!value) return ""
  try {
    const segmenter = new Intl.Segmenter()
    const segments = [...segmenter.segment(value)]
    return segments.length > 0 ? segments[0].segment : ""
  } catch {
    const chars = Array.from(value)
    return chars.length > 0 ? chars[0] : ""
  }
}

function resetFormState(
  setName: (v: string) => void,
  setParentId: (v: string) => void,
  setEmoji: (v: string) => void,
  setIconUrl: (v: string) => void,
  setIconCardId: (v: string) => void,
  setCoverImageUrl: (v: string) => void,
  setTheme: (v: string) => void,
  setSelectionType: (v: "icon" | "cover" | null) => void
) {
  setName("")
  setParentId("")
  setEmoji("")
  setIconUrl("")
  setIconCardId("")
  setCoverImageUrl("")
  setTheme("")
  setSelectionType(null)
}

function triggerReset(states: any) {
  resetFormState(
    states.setName,
    states.setParentId,
    states.setEmoji,
    states.setIconUrl,
    states.setIconCardId,
    states.setCoverImageUrl,
    states.setTheme,
    states.setSelectionType
  )
}

function useCategoryFormStates() {
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
  const [coverImageUrl, setCoverImageUrl] = useState("")
  const [theme, setTheme] = useState("")
  const [selectionType, setSelectionType] = useState<"icon" | "cover" | null>(
    null
  )

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
    coverImageUrl,
    setCoverImageUrl,
    theme,
    setTheme,
    selectionType,
    setSelectionType
  }
}

export function useCategoryForm() {
  const states = useCategoryFormStates()

  const handleEmojiChange = (val: string) => states.setEmoji(parseEmoji(val))
  const handleSelectCard = (cardId: string, thumb: string) => {
    if (states.selectionType === "cover") {
      states.setCoverImageUrl(thumb)
    } else {
      states.setIconCardId(cardId)
      states.setIconUrl(thumb)
    }
    states.setIsSelectingCard(false)
    states.setSelectionType(null)
  }
  const handleClearImage = () => {
    states.setIconUrl("")
    states.setIconCardId("")
  }
  const handleCancelEdit = () => {
    states.setEditingCategory(null)
    triggerReset(states)
  }

  return {
    ...states,
    handleEmojiChange,
    handleSelectCard,
    handleClearImage,
    handleClearCoverImage: () => states.setCoverImageUrl(""),
    handleCancelEdit,
    resetForm: () => triggerReset(states)
  }
}
