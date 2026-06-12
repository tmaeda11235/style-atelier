import { X } from "lucide-react"
import React from "react"

function TabButtons({
  t,
  activeTab,
  setActiveTab,
  editingCategory,
  handleCancelEdit
}: {
  t: any
  activeTab: string
  setActiveTab: (tab: string) => void
  editingCategory: any
  handleCancelEdit: () => void
}) {
  return (
    <div className="flex gap-4">
      <button
        onClick={() => setActiveTab("create")}
        className={`text-xs font-bold pb-1 border-b-2 transition-all ${
          activeTab === "create" && !editingCategory
            ? "border-blue-600 text-blue-600"
            : "border-transparent text-slate-400 hover:text-slate-600"
        }`}>
        {t.addCategory}
      </button>
      <button
        onClick={() => {
          setActiveTab("manage")
          if (editingCategory) {
            handleCancelEdit()
          }
        }}
        className={`text-xs font-bold pb-1 border-b-2 transition-all ${
          activeTab === "manage"
            ? "border-blue-600 text-blue-600"
            : "border-transparent text-slate-400 hover:text-slate-600"
        }`}>
        {t.manageCategories}
      </button>
      {editingCategory && (
        <span className="text-xs font-bold pb-1 border-b-2 border-blue-600 text-blue-600">
          {t.editCategoryName.replace("{name}", editingCategory.name)}
        </span>
      )}
    </div>
  )
}

export function CategoryModalHeader({
  t,
  isSelectingCard,
  activeTab,
  setActiveTab,
  editingCategory,
  handleCancelEdit,
  handleCloseIcon
}: {
  t: any
  isSelectingCard: boolean
  activeTab: string
  setActiveTab: (tab: string) => void
  editingCategory: any
  handleCancelEdit: () => void
  handleCloseIcon: () => void
}) {
  return (
    <div className="p-4 border-b flex items-center justify-between">
      {isSelectingCard ? (
        <h3 className="text-xs font-bold text-slate-800">{t.selectCardIcon}</h3>
      ) : (
        <TabButtons
          t={t}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          editingCategory={editingCategory}
          handleCancelEdit={handleCancelEdit}
        />
      )}
      <button
        onClick={handleCloseIcon}
        className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        aria-label={t.cancel}>
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
