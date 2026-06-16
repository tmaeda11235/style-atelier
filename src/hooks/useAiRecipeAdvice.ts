import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { generateStaticRecipeAdvice } from "../lib/ai/recipe-heuristics"
import { useWebLlm } from "./useWebLlm"

function getCombinationKey(cardsList: any[]): string {
  return cardsList
    .map((c) => `${c.id || c.name}-${c.weight ?? 1.0}`)
    .sort()
    .join("|")
}

interface PromptInfo {
  systemPrompt: string
  userPrompt: string
}

function generatePrompts(cards: any[], lang: string): PromptInfo {
  const cardsDesc = cards
    .map((c, i) => {
      const promptText = c.promptSegments
        ? c.promptSegments.map((s: any) => s.value || s.default || "").join(" ")
        : c.prompt || ""
      return `Card ${i + 1} (${c.name}): "${promptText}" (Weight: ${c.weight ?? 1.0})`
    })
    .join("\n")

  const isJa = lang?.startsWith("ja")

  const systemPrompt = isJa
    ? "あなたはMidjourneyプロンプトのブレンド専門家です。2つ以上のスタイルカードの特徴を分析し、それらを組み合わせた際の視覚的効果、最適なウェイト比率、およびブレンドを引き立てる追加のキーワードについて、日本語でアドバイスを提供してください。出力は簡潔なMarkdown形式にしてください。回答が長くなりすぎないように簡潔にまとめてください。"
    : "You are a Midjourney prompt blending expert. Analyze the characteristics of 2 or more Style Cards, predict the visual result of combining them, recommend optimal weight ratios, and suggest additional keywords to enhance the blend. Output must be in English. Keep the output as a concise Markdown."

  const userPrompt = isJa
    ? `以下のカードを調合します：\n${cardsDesc}\n\n調合アドバイスを以下の見出しで提供してください：\n- **期待される視覚的効果**:\n- **推奨ウェイト比率**:\n- **追加キーワードの提案**:`
    : `Blend the following cards:\n${cardsDesc}\n\nProvide blend advice with these headings:\n- **Expected Visual Blending Effect**:\n- **Recommended Weights**:\n- **Suggested Keywords`

  return { systemPrompt, userPrompt }
}

interface FetchAdviceParams {
  cards: any[]
  lang: string
  key: string
  setAdvice: React.Dispatch<React.SetStateAction<string | null>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setIsFallback: React.Dispatch<React.SetStateAction<boolean>>
  cacheRef: React.MutableRefObject<Record<string, string>>
  runInferenceRef: React.MutableRefObject<
    (prompt: string, systemPrompt?: string, temp?: number) => Promise<string>
  >
  isMounted: () => boolean
}

async function fetchAdviceHelper(params: FetchAdviceParams) {
  const {
    cards,
    lang,
    key,
    setAdvice,
    setError,
    setLoading,
    setIsFallback,
    cacheRef,
    runInferenceRef,
    isMounted
  } = params

  setLoading(true)
  setError(null)
  const { systemPrompt, userPrompt } = generatePrompts(cards, lang)
  try {
    const res = await runInferenceRef.current(userPrompt, systemPrompt, 0.7)
    if (isMounted()) {
      cacheRef.current[key] = res
      setAdvice(res)
      setIsFallback(false)
    }
  } catch (err: any) {
    console.error(
      "AI blend advice generation failed, falling back to static heuristics:",
      err
    )
    if (isMounted()) {
      const fallbackAdvice = generateStaticRecipeAdvice(cards, lang)
      setAdvice(fallbackAdvice)
      setIsFallback(true)
    }
  } finally {
    if (isMounted()) {
      setLoading(false)
    }
  }
}

interface CacheCheckParams {
  cards: any[]
  status: string
  key: string
  lang: string
  cacheRef: React.MutableRefObject<Record<string, string>>
  setAdvice: React.Dispatch<React.SetStateAction<string | null>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setIsFallback: React.Dispatch<React.SetStateAction<boolean>>
}

function processCache(params: CacheCheckParams): boolean {
  const {
    cards,
    status,
    key,
    lang,
    cacheRef,
    setAdvice,
    setError,
    setLoading,
    setIsFallback
  } = params
  if (cards.length < 2) {
    setAdvice(null)
    setError(null)
    setLoading(false)
    setIsFallback(false)
    return true
  }
  const isDownloading =
    status === "checking" ||
    status === "downloading" ||
    status === "verifying" ||
    status === "retrying"

  if (status !== "ready" && !isDownloading && status !== "insufficient-quota") {
    const fallbackAdvice = generateStaticRecipeAdvice(cards, lang)
    setAdvice(fallbackAdvice)
    setError(null)
    setLoading(false)
    setIsFallback(true)
    return true
  }
  if (status !== "ready") {
    setAdvice(null)
    setError(null)
    setLoading(false)
    setIsFallback(false)
    return true
  }
  if (cacheRef.current[key]) {
    setAdvice(cacheRef.current[key])
    setError(null)
    setLoading(false)
    setIsFallback(false)
    return true
  }
  return false
}

interface RecipeAdviceFetchProps {
  cards: any[]
  key: string
  status: string
  lang: string
  setAdvice: React.Dispatch<React.SetStateAction<string | null>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setIsFallback: React.Dispatch<React.SetStateAction<boolean>>
  cacheRef: React.MutableRefObject<Record<string, string>>
  runInferenceRef: React.MutableRefObject<
    (prompt: string, systemPrompt?: string, temp?: number) => Promise<string>
  >
}

function useAiRecipeAdviceFetch(props: RecipeAdviceFetchProps) {
  const propsRef = useRef(props)
  useEffect(() => {
    propsRef.current = props
  })

  useEffect(() => {
    const p = propsRef.current
    if (processCache(p)) {
      return
    }
    let mounted = true
    const timer = setTimeout(() => {
      fetchAdviceHelper({
        cards: p.cards,
        key: p.key,
        lang: p.lang,
        setAdvice: p.setAdvice,
        setError: p.setError,
        setLoading: p.setLoading,
        setIsFallback: p.setIsFallback,
        cacheRef: p.cacheRef,
        runInferenceRef: p.runInferenceRef,
        isMounted: () => mounted
      })
    }, 500)
    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [props.cards, props.key, props.status, props.lang])
}

export function useAiRecipeAdvice(cards: any[]) {
  const { status, runInference, isEngineInitializing } = useWebLlm()
  const { i18n } = useTranslation()
  const [advice, setAdvice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const cacheRef = useRef<Record<string, string>>({})
  const runInferenceRef = useRef(runInference)

  useEffect(() => {
    runInferenceRef.current = runInference
  }, [runInference])

  const key = getCombinationKey(cards)

  useAiRecipeAdviceFetch({
    cards,
    key,
    status,
    lang: i18n.language,
    setAdvice,
    setError,
    setLoading,
    setIsFallback,
    cacheRef,
    runInferenceRef
  })

  return {
    advice,
    loading,
    error,
    isModelReady: status === "ready",
    isFallback,
    status,
    isEngineInitializing
  }
}
