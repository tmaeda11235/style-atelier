import { AlertTriangle, Loader2 } from "lucide-react"
import React from "react"

import { AdviceViewer } from "../atoms/AdviceViewer"
import { ModelStatusOverlay } from "./AiModelStatusOverlays"

interface AdviceSectionContentProps {
  isModelReady: boolean
  isEngineInitializing?: boolean
  status: string
  progress: number
  speed: number
  eta: number
  retryCount: number
  maxRetries: number
  text: string
  webLlmError: string | null
  startDownload: () => void
  loading: boolean
  error: string | null
  advice: string | null
  t: any
  hasWebGpu?: boolean | null
}

function NotReadyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 text-center rounded-lg bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-indigo-950/30">
      {children}
    </div>
  )
}

function FallbackAdviceContainer(props: {
  advice: string
  status: string
  progress: number
  speed: number
  blur?: boolean
  eta: number
  retryCount: number
  maxRetries: number
  text: string
  webLlmError: string | null
  startDownload: () => void
  t: any
  hasWebGpu?: boolean | null
}) {
  const isWebGpuUnsupported = props.hasWebGpu === false

  const fallbackMessage = isWebGpuUnsupported
    ? props.t.aiAdviceFallbackDisclaimerWebGpuUnsupported ||
      "Operating in lightweight fallback mode (WebGPU unsupported)."
    : props.t.aiAdviceFallbackDisclaimer ||
      "Operating in lightweight fallback mode. Download local AI for context-aware suggestions:"

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      <AdviceViewer advice={props.advice} />
      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-indigo-950 flex flex-col items-center gap-1.5">
        <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center leading-normal">
          {fallbackMessage}
        </p>
        {!isWebGpuUnsupported && (
          <ModelStatusOverlay
            status={props.status}
            progress={props.progress}
            speed={props.speed}
            eta={props.eta}
            retryCount={props.retryCount}
            maxRetries={props.maxRetries}
            text={props.text}
            webLlmError={props.webLlmError}
            startDownload={props.startDownload}
            t={props.t}
          />
        )}
      </div>
    </div>
  )
}

function LoadingAdviceContainer({
  isEngineInitializing,
  t
}: {
  isEngineInitializing?: boolean
  t: any
}) {
  const loadingText = isEngineInitializing
    ? t.aiEngineInitializing ||
      "Initializing AI engine (this may take a few seconds)..."
    : t.aiAdviceLoading || "Consulting the local AI cauldron..."
  return (
    <div className="flex items-center justify-center py-6 gap-2 text-slate-500 dark:text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
      <span>{loadingText}</span>
    </div>
  )
}

function ErrorAdviceContainer({ error, t }: { error: string; t: any }) {
  return (
    <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/15 border border-rose-100/50 dark:border-rose-950/30 text-rose-600 dark:text-rose-400">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span>
        {t.aiAdviceError || "Failed to concoct AI advice."}: {error}
      </span>
    </div>
  )
}

export function AdviceSectionContent(props: AdviceSectionContentProps) {
  const { isModelReady, isEngineInitializing, loading, error, advice, t } =
    props
  if (!isModelReady) {
    if (advice) {
      return <FallbackAdviceContainer {...props} advice={advice} />
    }
    return (
      <NotReadyWrapper>
        <ModelStatusOverlay
          status={props.status}
          progress={props.progress}
          speed={props.speed}
          eta={props.eta}
          retryCount={props.retryCount}
          maxRetries={props.maxRetries}
          text={props.text}
          webLlmError={props.webLlmError}
          startDownload={props.startDownload}
          t={t}
        />
      </NotReadyWrapper>
    )
  }
  if (loading) {
    return (
      <LoadingAdviceContainer
        isEngineInitializing={isEngineInitializing}
        t={t}
      />
    )
  }
  if (error) {
    return <ErrorAdviceContainer error={error} t={t} />
  }
  return advice ? <AdviceViewer advice={advice} /> : null
}
