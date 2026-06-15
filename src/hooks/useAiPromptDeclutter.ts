import { useCallback, useState } from "react"

import { declutterFallback } from "../lib/ai/declutter-fallback"
import type { PromptSegment } from "../lib/db-schema"
import { useWebLlm } from "./useWebLlm"

export interface DeclutterResult {
  segments: string[]
}

const SYSTEM_PROMPT = `You are a professional prompt parsing AI. Your task is to split the user's messy, long Midjourney prompt into clean, modular text tokens (e.g., separating the subject, style elements, medium, lighting, camera settings, etc.). 
Remove redundant filler words. Ignore or filter out parameters (like --ar, --sref, --cref, --v) as they are handled separately.
Output the parsed tokens in the following JSON format. Output ONLY pure JSON, nothing else.

Format:
{
  "segments": [
    "subject or main character",
    "style or aesthetic",
    "lighting details",
    "camera or lens details"
  ]
}

Example Input:
"a beautiful cyberpunk girl in a neon alley glowing lights photorealistic highly detailed shot on 35mm lens --ar 16:9"
Example Output:
{
  "segments": [
    "a beautiful cyberpunk girl",
    "in a neon alley",
    "glowing lights",
    "photorealistic",
    "highly detailed",
    "shot on 35mm lens"
  ]
}`

function parseDeclutterResponse(response: string): DeclutterResult {
  let cleanJson = response.trim()
  const jsonStart = cleanJson.indexOf("{")
  const jsonEnd = cleanJson.lastIndexOf("}")
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1)
  }

  try {
    const parsed = JSON.parse(cleanJson)
    if (parsed && Array.isArray(parsed.segments)) {
      return { segments: parsed.segments.map(String) }
    }
  } catch {
    const segmentsMatch = response.match(/"segments"\s*:\s*\[([\s\S]*?)\]/)
    if (segmentsMatch) {
      const items = segmentsMatch[1]
        .split(",")
        .map((item) => item.replace(/"/g, "").trim())
        .filter((item) => item.length > 0)
      return { segments: items }
    }
  }
  return { segments: [] }
}

export function useAiPromptDeclutter() {
  const {
    status,
    progress,
    error: webLlmError,
    startDownload,
    runInference
  } = useWebLlm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const declutterPrompt = useCallback(
    async (rawPromptText: string): Promise<PromptSegment[] | null> => {
      if (!rawPromptText.trim()) return null
      setLoading(true)
      setError(null)

      if (status !== "ready") {
        setLoading(false)
        return declutterFallback(rawPromptText)
      }

      try {
        const response = await runInference(rawPromptText, SYSTEM_PROMPT, 0.1)
        const parsed = parseDeclutterResponse(response)

        if (parsed.segments.length === 0) {
          throw new Error("No segments extracted by the model")
        }

        return parsed.segments.map((val) => ({
          type: "text" as const,
          value: val
        }))
      } catch (err: any) {
        setError(err.message || "Failed to de-clutter prompt")
        return declutterFallback(rawPromptText)
      } finally {
        setLoading(false)
      }
    },
    [runInference, status]
  )

  return {
    status,
    progress,
    startDownload,
    loading,
    error,
    webLlmError,
    declutterPrompt,
    isModelReady: status === "ready"
  }
}
