import { AlertTriangle, Database, HelpCircle, RefreshCw } from "lucide-react"
import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"

interface DbErrorOverlayProps {
  error: Error
}

interface TranslationHelper {
  t: any
}

function CausesSection({ t }: TranslationHelper) {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 space-y-2.5">
      <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5" />
        {t.dbError?.reasons || "考えられる原因："}
      </h3>
      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
        <li>
          {t.dbError?.reason1 ||
            "シークレットモード（プライベートブラウジング）による制限"}
        </li>
        <li>{t.dbError?.reason2 || "ブラウザまたは端末のディスク容量不足"}</li>
        <li>
          {t.dbError?.reason3 ||
            "ブラウザの権限設定によるデータベース利用の制限"}
        </li>
      </ul>
    </div>
  )
}

function SolutionsSection({ t }: TranslationHelper) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
        {t.dbError?.solutions || "対処方法："}
      </h3>
      <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside leading-relaxed">
        <li className="pl-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {t.dbError?.solution1 ||
              "シークレットモードを解除して、通常のウィンドウで再度お試しください。"}
          </span>
        </li>
        <li className="pl-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {t.dbError?.solution2 ||
              "端末の空き容量を増やしてから、再度お試しください。"}
          </span>
        </li>
        <li className="pl-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {t.dbError?.solution3 ||
              "ブラウザの設定でサイトのデータ保存（Cookieやサイトデータ）を許可してください。"}
          </span>
        </li>
      </ol>
    </div>
  )
}

function ErrorDetailsAccordion({ error }: { error: Error }) {
  return (
    <details className="group border-t border-slate-100 dark:border-slate-800 pt-4">
      <summary className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer list-none flex items-center justify-between transition-colors">
        <span>詳細なエラー情報 (Technical Details)</span>
        <span className="transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/50 rounded-lg text-[10px] font-mono text-rose-600 dark:text-rose-400 overflow-x-auto max-h-32 leading-relaxed whitespace-pre-wrap">
        {error.name}: {error.message}
        {error.stack && `\n\n${error.stack}`}
      </div>
    </details>
  )
}

export function DbErrorOverlay({ error }: DbErrorOverlayProps) {
  const { t } = useLanguage()

  const title = t.dbError?.title || "データベース起動エラー"
  const message =
    t.dbError?.message ||
    "データベース（IndexedDB）の初期化に失敗しました。アプリケーションを起動できません。"

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-rose-500 to-amber-500 p-6 text-white flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_120%,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
          <div className="bg-white/20 p-3 rounded-full mb-3 backdrop-blur-sm">
            <Database className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2 justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-200 shrink-0" />
            {title}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed text-center font-medium">
            {message}
          </p>

          <CausesSection t={t} />
          <SolutionsSection t={t} />
          <ErrorDetailsAccordion error={error} />

          <button
            onClick={handleRetry}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transform active:scale-[0.98] transition-all cursor-pointer">
            <RefreshCw className="w-4 h-4" />
            <span>再読み込み (Reload App)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
