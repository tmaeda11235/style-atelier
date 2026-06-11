import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

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

export function useAiRecipeAdvice(cards: any[]) {
  const { status, runInference } = useWebLlm()
  const { i18n } = useTranslation()
  const [advice, setAdvice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cacheRef = useRef<Record<string, string>>({})
  const runInferenceRef = useRef(runInference)

  useEffect(() => {
    runInferenceRef.current = runInference
  }, [runInference])

  const key = getCombinationKey(cards)

  useEffect(() => {
    if (cards.length < 2 || status !== "ready") {
      setAdvice(null)
      setError(null)
      setLoading(false)
      return
    }
    if (cacheRef.current[key]) {
      setAdvice(cacheRef.current[key])
      setError(null)
      setLoading(false)
      return
    }
    let isMounted = true
    const fetchAdvice = async () => {
      setLoading(true)
      setError(null)
      const { systemPrompt, userPrompt } = generatePrompts(cards, i18n.language)
      try {
        const res = await runInferenceRef.current(userPrompt, systemPrompt, 0.7)
        if (isMounted) {
          cacheRef.current[key] = res
          setAdvice(res)
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to generate advice")
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    const timer = setTimeout(fetchAdvice, 500)
    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [cards, key, status, i18n.language])

  return { advice, loading, error, isModelReady: status === "ready", status }
}
