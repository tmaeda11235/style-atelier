import React, { useState } from "react"

interface FolderExplorerProps {
  breadcrumbs: Array<{ id: string | null; name: string }>
  currentSubfolders: Array<{
    id: string
    name: string
    iconUrl?: string
    iconEmoji?: string
  }>
  setCurrentFolderId: (id: string | null) => void
  moveCardToCategory: (
    cardId: string,
    categoryId: string | null
  ) => Promise<void>
  subfoldersGridClass?: string
}

interface BreadcrumbsProps {
  breadcrumbs: Array<{ id: string | null; name: string }>
  dragOverFolderId: string | null | undefined
  setDragOverFolderId: (id: string | null | undefined) => void
  setCurrentFolderId: (id: string | null) => void
  moveCardToCategory: (
    cardId: string,
    categoryId: string | null
  ) => Promise<void>
}

function Breadcrumbs({
  breadcrumbs,
  dragOverFolderId,
  setDragOverFolderId,
  setCurrentFolderId,
  moveCardToCategory
}: BreadcrumbsProps) {
  return (
    <div
      data-testid="breadcrumbs"
      className="flex items-center flex-wrap gap-1 text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200/60 shadow-sm">
      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1
        const isOver = dragOverFolderId === crumb.id
        return (
          <React.Fragment key={crumb.id || "root"}>
            {idx > 0 && <span className="text-slate-300">/</span>}
            <span
              onClick={() => setCurrentFolderId(crumb.id)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => {
                e.preventDefault()
                setDragOverFolderId(crumb.id)
              }}
              onDragLeave={() => setDragOverFolderId(undefined)}
              onDrop={async (e) => {
                e.preventDefault()
                setDragOverFolderId(undefined)
                const cardId = e.dataTransfer.getData("cardId")
                if (cardId) {
                  await moveCardToCategory(cardId, crumb.id)
                }
              }}
              className={`cursor-pointer px-1.5 py-0.5 rounded transition-all font-semibold ${
                isLast
                  ? "text-slate-800 font-bold bg-slate-100"
                  : "text-blue-600 hover:bg-blue-50"
              } ${isOver ? "bg-blue-100 ring-2 ring-blue-400 scale-105" : ""}`}>
              {crumb.name}
            </span>
          </React.Fragment>
        )
      })}
    </div>
  )
}

interface SubfolderItemProps {
  folder: {
    id: string
    name: string
    iconUrl?: string
    iconEmoji?: string
  }
  isOver: boolean
  onClick: () => void
  onDragEnter: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
}

function SubfolderItem({
  folder,
  isOver,
  onClick,
  onDragEnter,
  onDragLeave,
  onDrop
}: SubfolderItemProps) {
  return (
    <div
      onClick={onClick}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative flex flex-col items-center justify-center p-3 rounded-lg border bg-white shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:border-slate-300 active:scale-95 ${
        isOver
          ? "border-blue-500 ring-4 ring-blue-100 bg-blue-50/50 scale-105"
          : "border-slate-200"
      }`}>
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shadow-inner mb-1.5 flex-shrink-0">
        {folder.iconUrl ? (
          <img
            src={folder.iconUrl}
            className="w-full h-full object-cover"
            alt={folder.name}
          />
        ) : (
          <span className="text-lg leading-none">
            {folder.iconEmoji || "📁"}
          </span>
        )}
      </div>
      <span className="text-[10px] font-bold text-slate-700 text-center truncate w-full px-1">
        {folder.name}
      </span>
    </div>
  )
}

interface SubfolderGridProps {
  currentSubfolders: Array<{
    id: string
    name: string
    iconUrl?: string
    iconEmoji?: string
  }>
  dragOverFolderId: string | null | undefined
  setDragOverFolderId: (id: string | null | undefined) => void
  setCurrentFolderId: (id: string | null) => void
  moveCardToCategory: (
    cardId: string,
    categoryId: string | null
  ) => Promise<void>
  subfoldersGridClass?: string
}

function SubfolderGrid({
  currentSubfolders,
  dragOverFolderId,
  setDragOverFolderId,
  setCurrentFolderId,
  moveCardToCategory,
  subfoldersGridClass
}: SubfolderGridProps) {
  if (currentSubfolders.length === 0) return null

  return (
    <div
      data-testid="subfolders-grid"
      className={`grid grid-cols-3 gap-2 p-2 rounded-lg border border-dashed ${
        subfoldersGridClass || "bg-slate-50/50 border-slate-200"
      }`}>
      {currentSubfolders.map((folder) => {
        const isOver = dragOverFolderId === folder.id
        const handleDrop = async (e: React.DragEvent) => {
          e.preventDefault()
          setDragOverFolderId(undefined)
          const cardId = e.dataTransfer.getData("cardId")
          if (cardId) {
            await moveCardToCategory(cardId, folder.id)
          }
        }
        return (
          <SubfolderItem
            key={folder.id}
            folder={folder}
            isOver={isOver}
            onClick={() => setCurrentFolderId(folder.id)}
            onDragEnter={(e) => {
              e.preventDefault()
              setDragOverFolderId(folder.id)
            }}
            onDragLeave={() => setDragOverFolderId(undefined)}
            onDrop={handleDrop}
          />
        )
      })}
    </div>
  )
}

export function FolderExplorer({
  breadcrumbs,
  currentSubfolders,
  setCurrentFolderId,
  moveCardToCategory,
  subfoldersGridClass
}: FolderExplorerProps) {
  const [dragOverFolderId, setDragOverFolderId] = useState<
    string | null | undefined
  >(undefined)

  return (
    <>
      <Breadcrumbs
        breadcrumbs={breadcrumbs}
        dragOverFolderId={dragOverFolderId}
        setDragOverFolderId={setDragOverFolderId}
        setCurrentFolderId={setCurrentFolderId}
        moveCardToCategory={moveCardToCategory}
      />
      <SubfolderGrid
        currentSubfolders={currentSubfolders}
        dragOverFolderId={dragOverFolderId}
        setDragOverFolderId={setDragOverFolderId}
        setCurrentFolderId={setCurrentFolderId}
        moveCardToCategory={moveCardToCategory}
        subfoldersGridClass={subfoldersGridClass}
      />
    </>
  )
}
