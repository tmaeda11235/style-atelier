import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

import { useWebLlm } from "./useWebLlm"

export interface GeneratedMetadata {
  genre: string
  tags: string[]
  summary: string
}

function parseResponse(response: string): GeneratedMetadata {
  let cleanJson = response.trim()
  const jsonStart = cleanJson.indexOf("{")
  const jsonEnd = cleanJson.lastIndexOf("}")
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1)
  }

  try {
    const parsed = JSON.parse(cleanJson)
    return {
      genre: parsed.genre || "",
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
      summary: parsed.summary || ""
    }
  } catch {
    const genreMatch = response.match(/"genre"\s*:\s*"([^"]+)"/)
    const summaryMatch = response.match(/"summary"\s*:\s*"([^"]+)"/)
    const tagsMatch = response.match(/"tags"\s*:\s*\[([^\]]+)\]/)

    let tags: string[] = []
    if (tagsMatch) {
      tags = tagsMatch[1].split(",").map((t) => t.replace(/"/g, "").trim())
    }

    return {
      genre: genreMatch ? genreMatch[1] : "",
      tags: tags,
      summary: summaryMatch ? summaryMatch[1] : ""
    }
  }
}

function getSystemPrompt(language: string): string {
  const isJa = language?.startsWith("ja")
  return isJa
    ? 'あなたはMidjourneyのプロンプトを分析するAIアシスタントです。入力されたプロンプトのアートスタイルを詳細に分析し、その芸術的ジャンル/スタイル（genre）、画像の特徴を表現する英単語のタグ（tags、最大5個、すべて英語）、および人間が理解しやすい簡潔な日本語の1文の説明（summary）を、以下のJSONフォーマットで出力してください。余計なテキストは含めず純粋なJSONのみを出力してください。\n\nフォーマット:\n{\n  "genre": "ジャンル名",\n  "tags": ["tag1", "tag2"],\n  "summary": "日本語の要約"\n}'
    : 'You are an AI assistant that analyzes Midjourney prompts. Analyze the art style and output its artistic genre/style (genre), English tags (tags, up to 5 elements), and a concise summary (summary) in the following JSON format. Output ONLY pure JSON.\n\nFormat:\n{\n  "genre": "genre name",\n  "tags": ["tag1", "tag2"],\n  "summary": "concise English summary"\n}'
}

function useAiMetadataState() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedMetadata | null>(null)
  return { loading, setLoading, error, setError, result, setResult }
}

function useGenerateMetadata(
  runInference: any,
  language: string,
  setLoading: (l: boolean) => void,
  setError: (e: string | null) => void,
  setResult: (r: GeneratedMetadata | null) => void
) {
  return useCallback(
    async (promptText: string) => {
      if (!promptText) return null
      setLoading(true)
      setError(null)
      setResult(null)

      try {
        const systemPrompt = getSystemPrompt(language)
        const response = await runInference(promptText, systemPrompt, 0.2)
        const parsed = parseResponse(response)
        setResult(parsed)
        return parsed
      } catch (err: any) {
        setError(err.message || "Failed to generate metadata")
        return null
      } finally {
        setLoading(false)
      }
    },
    [runInference, language, setLoading, setError, setResult]
  )
}

export function useAiMetadataGenerator() {
  const {
    runInference,
    status,
    progress,
    startDownload,
    error: webLlmError,
    speed,
    eta,
    retryCount,
    maxRetries,
    text
  } = useWebLlm()
  const { i18n } = useTranslation()
  const { loading, setLoading, error, setError, result, setResult } =
    useAiMetadataState()

  const generateMetadata = useGenerateMetadata(
    runInference,
    i18n.language,
    setLoading,
    setError,
    setResult
  )

  return {
    status,
    progress,
    startDownload,
    loading,
    error,
    webLlmError,
    speed,
    eta,
    retryCount,
    maxRetries,
    text,
    result,
    setResult,
    generateMetadata,
    isModelReady: status === "ready"
  }
}
