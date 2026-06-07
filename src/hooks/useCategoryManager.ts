import { useLiveQuery } from "dexie-react-hooks"
import { useState } from "react"

import { useConfirm } from "../contexts/ConfirmContext"
import { useLanguage } from "../contexts/LanguageContext"
import { db } from "../lib/db"
import type { CustomCategory } from "../lib/db-schema"

interface UseCategoryManagerProps {
  onClose: () => void
  addLog: (msg: string) => void
}

export function useCategoryManager({
  onClose,
  addLog
}: UseCategoryManagerProps) {
  const confirm = useConfirm()
  const { t: i18n } = useLanguage()
  const t = i18n.categoryManager

  const [activeTab, setActiveTab] = useState<"create" | "manage">("create")
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(
    null
  )

  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("")
  const [iconUrl, setIconUrl] = useState("")
  const [iconCardId, setIconCardId] = useState("")
  const [isSelectingCard, setIsSelectingCard] = useState(false)

  // Fetch categories
  const categories = useLiveQuery(() => db.getAllCategories()) || []

  // Fetch library cards to choose icons from
  const libraryCards =
    useLiveQuery(async () => {
      const cards = await db.getAllCards()
      return cards.filter((c) => !c.isVariable)
    }) || []

  const handleEmojiChange = (value: string) => {
    if (!value) {
      setEmoji("")
      return
    }
    try {
      const segmenter = new Intl.Segmenter()
      const segments = [...segmenter.segment(value)]
      if (segments.length > 0) {
        setEmoji(segments[0].segment)
      } else {
        setEmoji("")
      }
    } catch (e) {
      const chars = Array.from(value)
      if (chars.length > 0) {
        setEmoji(chars[0])
      } else {
        setEmoji("")
      }
    }
  }

  const handleSelectCard = (cardId: string, thumbData: string) => {
    setIconCardId(cardId)
    setIconUrl(thumbData)
    setIsSelectingCard(false)
  }

  const handleStartEdit = (cat: CustomCategory) => {
    setEditingCategory(cat)
    setName(cat.name)
    setEmoji(cat.iconEmoji || "")
    setIconUrl(cat.iconUrl || "")
    setIconCardId(cat.iconCardId || "")
    setActiveTab("create")
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setName("")
    setEmoji("")
    setIconUrl("")
    setIconCardId("")
  }

  const handleDelete = async (categoryId: string, categoryName: string) => {
    const ok = await confirm({
      title: t.deleteTooltip,
      message: t.confirmDelete.replace("{name}", categoryName),
      confirmText: t.deleteTooltip,
      cancelText: t.cancel,
      variant: "danger"
    })
    if (!ok) {
      return
    }
    try {
      await db.deleteCategory(categoryId)
      addLog(t.logDeleted.replace("{name}", categoryName))
    } catch (err) {
      console.error("Failed to delete category:", err)
      alert(t.errDeleteFailed)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      alert(t.alertEnterName)
      return
    }

    if (editingCategory) {
      const targetId = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      if (targetId !== editingCategory.id) {
        const existing = await db.getCategory(targetId)
        if (existing) {
          alert(t.alertAlreadyExists)
          return
        }
      }

      try {
        await db.updateCategory(editingCategory.id, {
          name: trimmedName,
          iconEmoji: emoji.trim() || undefined,
          iconUrl: iconUrl || undefined,
          iconCardId: iconCardId || undefined
        })
        addLog(t.logUpdated.replace("{name}", trimmedName))
        handleCancelEdit()
        setActiveTab("manage")
      } catch (err) {
        console.error("Failed to update category:", err)
        alert(t.errUpdateFailed)
      }
      return
    }

    const id = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    const existing = await db.getCategory(id)
    if (existing) {
      alert(t.alertAlreadyExists)
      return
    }

    try {
      await db.addCategory({
        id,
        name: trimmedName,
        iconEmoji: emoji.trim() || undefined,
        iconUrl: iconUrl || undefined,
        iconCardId: iconCardId || undefined,
        createdAt: Date.now()
      })
      addLog(t.logCreated.replace("{name}", trimmedName))
      setName("")
      setEmoji("")
      setIconUrl("")
      setIconCardId("")
      onClose()
    } catch (err) {
      console.error("Failed to add category:", err)
      alert(t.errAddFailed)
    }
  }

  return {
    activeTab,
    setActiveTab,
    editingCategory,
    name,
    setName,
    emoji,
    iconUrl,
    setIconUrl,
    iconCardId,
    isSelectingCard,
    setIsSelectingCard,
    categories,
    libraryCards,
    handleEmojiChange,
    handleSelectCard,
    handleStartEdit,
    handleCancelEdit,
    handleDelete,
    handleSave,
    t
  }
}
