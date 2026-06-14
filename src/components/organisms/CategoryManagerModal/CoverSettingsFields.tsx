import { Image as ImageIcon } from "lucide-react"
import React from "react"

import { Button } from "../../atoms/Button"

interface CoverSettingsFieldsProps {
  t: any
  coverImageUrl: string
  setCoverImageUrl: (v: string) => void
  setSelectionType: (v: "icon" | "cover" | null) => void
  setIsSelectingCard: (v: boolean) => void
  handleClearCoverImage: () => void
}

function CoverUploadButton({
  t,
  setCoverImageUrl
}: {
  t: any
  setCoverImageUrl: (v: string) => void
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setCoverImageUrl(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="relative">
      <input
        type="file"
        accept="image/*"
        id="category-cover-upload"
        data-testid="category-cover-file-input"
        className="hidden"
        onChange={handleFileChange}
      />
      <label
        htmlFor="category-cover-upload"
        className="cursor-pointer inline-flex items-center justify-center px-3 py-2 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition-colors h-9 w-full text-center truncate">
        {t.uploadLocalImage || "Upload"}
      </label>
    </div>
  )
}

function CoverPreview({
  t,
  coverImageUrl,
  handleClearCoverImage
}: {
  t: any
  coverImageUrl: string
  handleClearCoverImage: () => void
}) {
  if (!coverImageUrl) return null
  return (
    <div className="mt-2 relative p-2 border border-slate-200 rounded-lg bg-slate-50 flex flex-col items-center justify-center space-y-2">
      <span className="text-[10px] font-bold text-slate-400 uppercase">
        {t.coverPreview || "Preview"}
      </span>
      <div className="w-full h-20 rounded-md bg-slate-200 border border-slate-300 overflow-hidden shadow-inner relative">
        <img
          src={coverImageUrl}
          className="w-full h-full object-cover"
          alt="Cover Preview"
        />
      </div>
      <button
        type="button"
        onClick={handleClearCoverImage}
        className="text-[10px] text-red-500 hover:underline font-bold">
        {t.clearCoverImage || "Clear"}
      </button>
    </div>
  )
}

export function CoverSettingsFields({
  t,
  coverImageUrl,
  setCoverImageUrl,
  setSelectionType,
  setIsSelectingCard,
  handleClearCoverImage
}: CoverSettingsFieldsProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-500 mb-1">
        {t.coverImage || "Cover Image"}
      </label>
      <div className="grid grid-cols-2 gap-4">
        <Button
          type="button"
          data-testid="select-cover-from-library-btn"
          variant={coverImageUrl ? "primary" : "secondary"}
          size="sm"
          className="w-full flex items-center justify-center gap-1.5 h-9"
          onClick={() => {
            setSelectionType("cover")
            setIsSelectingCard(true)
          }}>
          <ImageIcon className="w-4 h-4" />
          <span className="truncate">{t.selectFromLibrary || "Library"}</span>
        </Button>

        <CoverUploadButton t={t} setCoverImageUrl={setCoverImageUrl} />
      </div>

      <CoverPreview
        t={t}
        coverImageUrl={coverImageUrl}
        handleClearCoverImage={handleClearCoverImage}
      />
    </div>
  )
}
