import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Lock,
  Upload
} from "lucide-react"
import React from "react"

import { HelpTooltip } from "../atoms/HelpTooltip"

interface LocalBackupSectionProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  isSyncing: boolean
  isRestoring: boolean
  handleLocalExport: () => void
  handleLocalImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleExportCSV: () => void
  handleExportMarkdown: () => void
  t: any
}

export function LocalBackupSection({
  fileInputRef,
  isSyncing,
  isRestoring,
  handleLocalExport,
  handleLocalImport,
  handleExportCSV,
  handleExportMarkdown,
  t
}: LocalBackupSectionProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Subtle decorative background gradient */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
          <FileJson className="w-6 h-6" />
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            {t.localBackupTitle}
            <HelpTooltip content={t.localBackupDesc} position="top-left" />
          </h3>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleLocalExport}
            disabled={isSyncing || isRestoring}
            className="py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2">
            <Download className="w-3.5 h-3.5" />
            {t.exportBtn}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSyncing || isRestoring}
            className="py-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 disabled:opacity-30 disabled:hover:bg-white text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2">
            <Upload className="w-3.5 h-3.5" />
            {t.importBtn}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleLocalImport}
            accept=".json"
            className="hidden"
          />
        </div>

        {/* Separator / Subheader for other tools export */}
        <div className="border-t border-slate-100 pt-4 mt-2">
          <div className="mb-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              External Integration (Notion, Obsidian, etc.)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportCSV}
              disabled={isSyncing || isRestoring}
              className="py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-30 disabled:hover:bg-indigo-50 text-indigo-700 border border-indigo-100/50 text-[11px] font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {t.exportCsvBtn}
            </button>
            <button
              onClick={handleExportMarkdown}
              disabled={isSyncing || isRestoring}
              className="py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-30 disabled:hover:bg-indigo-50 text-indigo-700 border border-indigo-100/50 text-[11px] font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              {t.exportMdBtn}
            </button>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center gap-1.5 bg-indigo-50/40 rounded-xl px-3 py-2 border border-indigo-100/50 justify-between">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="text-[10px] text-indigo-700 font-bold">
              {t.privacyNoteTitle}
            </span>
          </div>
          <HelpTooltip content={t.privacyNote} position="top-left" />
        </div>
      </div>
    </div>
  )
}
