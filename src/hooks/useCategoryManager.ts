import { useLiveQuery } from "dexie-react-hooks"

import { useConfirm } from "../contexts/ConfirmContext"
import { useLanguage } from "../contexts/LanguageContext"
import { db } from "../lib/db"
import type { CustomCategory } from "../lib/db-schema"
import { useCategoryForm } from "./useCategoryForm"

interface UseCategoryManagerProps {
  onClose: () => void
  addLog: (msg: string) => void
}

interface SaveParams {
  form: any
  t: any
  addLog: (msg: string) => void
  onClose: () => void
}

async function performSaveCategory(params: SaveParams) {
  const trimmedName = params.form.name.trim()
  if (!trimmedName) {
    alert(params.t.alertEnterName)
    return
  }

  if (params.form.editingCategory) {
    await performUpdateExistingCategory(
      params,
      params.form.editingCategory,
      trimmedName
    )
  } else {
    await performAddNewCategory(params, trimmedName)
  }
}

async function performUpdateExistingCategory(
  params: SaveParams,
  editingCategory: CustomCategory,
  trimmedName: string
) {
  const { t, addLog, form } = params
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
      iconEmoji: form.emoji.trim() || undefined,
      iconUrl: form.iconUrl || undefined,
      iconCardId: form.iconCardId || undefined,
      parentId: form.parentId || undefined,
      coverImageUrl: form.coverImageUrl || undefined,
      theme: form.theme || undefined
    })
    addLog(t.logUpdated.replace("{name}", trimmedName))
    form.handleCancelEdit()
    form.setActiveTab("manage")
  } catch (err) {
    console.error("Failed to update category:", err)
    alert(t.errUpdateFailed)
  }
}

async function performAddNewCategory(params: SaveParams, trimmedName: string) {
  const { t, addLog, form, onClose } = params
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
      iconEmoji: form.emoji.trim() || undefined,
      iconUrl: form.iconUrl || undefined,
      iconCardId: form.iconCardId || undefined,
      parentId: form.parentId || undefined,
      coverImageUrl: form.coverImageUrl || undefined,
      theme: form.theme || undefined,
      createdAt: Date.now()
    })
    addLog(t.logCreated.replace("{name}", trimmedName))
    resetFormState(
      form.setName,
      form.setParentId,
      form.setEmoji,
      form.setIconUrl,
      form.setIconCardId,
      form.setCoverImageUrl,
      form.setTheme,
      form.setSelectionType
    )
    onClose()
  } catch (err) {
    console.error("Failed to add category:", err)
    alert(t.errAddFailed)
  }
}

async function performDeleteCategory({
  categoryId,
  categoryName,
  confirm,
  t,
  addLog
}: {
  categoryId: string
  categoryName: string
  confirm: any
  t: any
  addLog: (msg: string) => void
}) {
  const ok = await confirm({
    title: t.deleteTooltip,
    message: t.confirmDelete.replace("{name}", categoryName),
    confirmText: t.deleteTooltip,
    cancelText: t.cancel,
    variant: "danger"
  })
  if (!ok) return

  try {
    await db.deleteCategory(categoryId)
    addLog(t.logDeleted.replace("{name}", categoryName))
  } catch (err) {
    console.error("Failed to delete category:", err)
    alert(t.errDeleteFailed)
  }
}

function startCategoryEdit(cat: CustomCategory, form: any) {
  form.setEditingCategory(cat)
  form.setName(cat.name)
  form.setParentId(cat.parentId || "")
  form.setEmoji(cat.iconEmoji || "")
  form.setIconUrl(cat.iconUrl || "")
  form.setIconCardId(cat.iconCardId || "")
  form.setCoverImageUrl(cat.coverImagePath || cat.coverImageUrl || "")
  form.setTheme(cat.theme || "")
  form.setActiveTab("create")
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

function useCategoryData() {
  const categories = useLiveQuery(() => db.getAllCategories()) || []
  const libraryCards =
    useLiveQuery(async () => {
      const cards = await db.getAllCards()
      return cards.filter((c) => !c.isVariable)
    }) || []
  return { categories, libraryCards }
}

export function useCategoryManager({
  onClose,
  addLog
}: UseCategoryManagerProps) {
  const confirm = useConfirm()
  const { t: i18n } = useLanguage()
  const t = i18n.categoryManager

  const form = useCategoryForm()
  const { categories, libraryCards } = useCategoryData()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await performSaveCategory({ form, t, addLog, onClose })
  }

  return {
    ...form,
    categories,
    libraryCards,
    t,
    handleSave,
    handleStartEdit: (cat: CustomCategory) => startCategoryEdit(cat, form),
    handleDelete: (id: string, nameVal: string) =>
      performDeleteCategory({
        categoryId: id,
        categoryName: nameVal,
        confirm,
        t,
        addLog
      })
  }
}
