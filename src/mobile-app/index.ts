/* eslint-disable max-lines */
import type { StyleCard } from "../lib/db-schema"
import { buildPromptString } from "../lib/prompt-utils"
import { decompressCardData } from "../lib/qr-utils"
import { initA2HS } from "./a2hs"
import {
  initGisClient,
  isMock,
  requestAccessToken,
  saveToGoogleDrive,
  type SaveResult
} from "./gdrive"
import { setupCardContainerEvents } from "./hologram"
import { resolveMobileCardImage } from "./image"
import { LocalAiClient } from "./local-ai-client"

let currentCardData: Partial<StyleCard> | null = null

function showToast(message: string) {
  const toast = document.getElementById("toast") as HTMLElement
  const span = toast.querySelector("span")
  if (span) span.textContent = message
  toast.classList.add("show")
  setTimeout(() => toast.classList.remove("show"), 6000)
}

function applyCardColors(
  card: Partial<StyleCard>,
  element: HTMLElement | null,
  rarityClass: string
) {
  if (!element) return
  const isFront = element.classList.contains("card-front")
  element.className = (isFront ? "card-front" : "card-back") + " " + rarityClass
  if (card.dominantColor) {
    element.style.setProperty(
      "--color-accent-card",
      card.accentColor || "#3b82f6"
    )
    element.style.setProperty(
      "--color-dominant-card",
      card.dominantColor || "#1e293b"
    )
  }
}

function renderParameterBadges(parameters: Record<string, any> | undefined) {
  const parameterBadgesEl = document.getElementById("parameterBadges")
  if (!parameterBadgesEl) return
  parameterBadgesEl.innerHTML = ""
  Object.entries(parameters || {}).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      const badge = document.createElement("span")
      badge.className = "parameter-badge"
      badge.textContent = `--${key} ${val}`
      parameterBadgesEl.appendChild(badge)
    }
  })
}

function renderCardImage(card: Partial<StyleCard>) {
  const container = document.getElementById("cardImageContainer")
  if (!container) return
  container.innerHTML = `
    <img src="./cyber_samurai.png" alt="${card.name || "Card Image"}" class="card-image loading">
    <div class="card-image-overlay">Tap to reveal Prompt</div>
  `
  resolveMobileCardImage(card.id, card.thumbnailPath, card.thumbnailData)
    .then((src) => {
      const img = container.querySelector("img")
      if (img) {
        img.src = src
        img.classList.remove("loading")
      }
    })
    .catch((err) => {
      console.error("Failed to resolve OPFS image:", err)
    })
}

function renderCard(card: Partial<StyleCard>) {
  currentCardData = card
  const titleFront = document.getElementById("cardTitleFront")
  const titleBack = document.getElementById("cardTitleBack")
  const rarityFront = document.getElementById("cardRarityFront")
  const rarityBack = document.getElementById("cardRarityBack")
  const promptTextEl = document.getElementById("promptText")
  const cardFront = document.getElementById("cardFront")
  const cardBack = document.getElementById("cardBack")

  if (titleFront) titleFront.textContent = card.name || "Unnamed Card"
  if (titleBack) titleBack.textContent = card.name || "Unnamed Card"

  const rarity = (card.tier || "common").toUpperCase()
  if (rarityFront) rarityFront.textContent = rarity
  if (rarityBack) rarityBack.textContent = rarity

  const rarityClass = `rarity-${(card.tier || "common").toLowerCase()}`
  applyCardColors(card, cardFront, rarityClass)
  applyCardColors(card, cardBack, rarityClass)

  if (promptTextEl) {
    promptTextEl.textContent = buildPromptString(
      card.promptSegments || [],
      card.parameters || {}
    )
  }

  renderCardImage(card)
  renderParameterBadges(card.parameters)
}

function loadFallbackCard() {
  const fallback: Partial<StyleCard> = {
    name: "Cyber Samurai",
    tier: "legendary",
    accentColor: "#fbbf24",
    dominantColor: "#1e293b",
    promptSegments: [
      {
        id: "1",
        value:
          "A futuristic cyberpunk samurai standing in neon rain, Tokyo street background, highly detailed style, glowing katana, rich colors, intricate cybernetic armor, Unreal Engine 5 render, cinematic lighting",
        type: "text"
      }
    ],
    parameters: { ar: "16:9", stylize: 750 }
  }
  currentCardData = fallback
  renderCard(fallback)
}

function loadCardFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const rawParam = params.get("p") || params.get("data")
  if (rawParam) {
    try {
      const cardData = decompressCardData(rawParam.replace(/ /g, "+"))
      currentCardData = cardData
      renderCard(cardData)
    } catch (err) {
      console.error("Failed to decode card data from URL:", err)
      showToast("データのデコードに失敗しました")
      loadFallbackCard()
    }
  } else {
    loadFallbackCard()
  }
}

function setLoadingState(isLoading: boolean) {
  const btn = document.getElementById("saveCloudBtn") as HTMLButtonElement
  if (!btn) return
  const span = btn.querySelector("span")
  btn.disabled = isLoading
  if (span)
    span.textContent = isLoading ? "保存中..." : "クラウド保存（PCへ同期）"
}

async function handleSaveResult(result: SaveResult) {
  if (result === "success") {
    showToast("クラウドに一時保存しました（PC起動時に同期されます）")
  } else if (result === "duplicate") {
    showToast("既にクラウドに保存されています")
  } else {
    showToast("保存に失敗しました")
  }
}

async function executeSave(token: string) {
  if (!currentCardData) return
  await handleSaveResult(await saveToGoogleDrive(token, currentCardData))
}

async function handleSaveCloudClick() {
  if (!currentCardData) {
    showToast("カードデータがありません")
    return
  }
  setLoadingState(true)
  if (isMock) {
    setTimeout(async () => {
      await executeSave("mock-token")
      setLoadingState(false)
    }, 500)
    return
  }
  const onToken = async (token: string) => {
    try {
      await executeSave(token)
    } finally {
      setLoadingState(false)
    }
  }
  const onError = () => {
    showToast("連携に失敗しました")
    setLoadingState(false)
  }
  if (!requestAccessToken()) {
    initGisClient(onToken, onError)
    setTimeout(() => {
      if (!requestAccessToken()) {
        showToast("認証リクエストに失敗しました")
        setLoadingState(false)
      }
    }, 500)
  }
}

function setupButtonEvents(
  copyBtn: HTMLButtonElement,
  promptText: HTMLElement,
  saveCloudBtn: HTMLButtonElement
) {
  copyBtn.addEventListener("click", async () => {
    const textToCopy = promptText.textContent?.trim() || ""
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = textToCopy
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      showToast("コピーしました！")
    } catch (err) {
      console.error("Failed to copy: ", err)
      showToast("コピーに失敗しました")
    }
  })
  saveCloudBtn.addEventListener("click", handleSaveCloudClick)
}

function setupEventHandlers() {
  setupCardContainerEvents(
    document.getElementById("cardContainer") as HTMLElement
  )
  setupButtonEvents(
    document.getElementById("copyBtn") as HTMLButtonElement,
    document.getElementById("promptText") as HTMLElement,
    document.getElementById("saveCloudBtn") as HTMLButtonElement
  )
}

interface GeneratedMetadata {
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

// eslint-disable-next-line max-lines-per-function
function initLocalAi() {
  const downloadBtn = document.getElementById(
    "aiDownloadBtn"
  ) as HTMLButtonElement
  const analyzeBtn = document.getElementById(
    "aiAnalyzeBtn"
  ) as HTMLButtonElement
  const progressContainer = document.getElementById(
    "aiProgressContainer"
  ) as HTMLElement
  const progressText = document.getElementById("aiProgressText") as HTMLElement
  const progressPercent = document.getElementById(
    "aiProgressPercent"
  ) as HTMLElement
  const progressBarFill = document.getElementById(
    "aiProgressBarFill"
  ) as HTMLElement
  const downloadStats = document.getElementById(
    "aiDownloadStats"
  ) as HTMLElement
  const speedEl = document.getElementById("aiSpeed") as HTMLElement
  const etaEl = document.getElementById("aiEta") as HTMLElement
  const resultsContainer = document.getElementById(
    "aiResultsContainer"
  ) as HTMLElement
  const resultGenre = document.getElementById("aiResultGenre") as HTMLElement
  const resultTags = document.getElementById("aiResultTags") as HTMLElement
  const resultSummary = document.getElementById(
    "aiResultSummary"
  ) as HTMLElement
  const latencyEl = document.getElementById("aiLatency") as HTMLElement
  const speedTpsEl = document.getElementById("aiSpeedTps") as HTMLElement
  const errorAlert = document.getElementById("aiErrorAlert") as HTMLElement
  const errorText = document.getElementById("aiErrorText") as HTMLElement

  if (!downloadBtn || !analyzeBtn) return

  const client = new LocalAiClient()

  downloadBtn.addEventListener("click", () => {
    client.startDownload()
  })

  analyzeBtn.addEventListener("click", async () => {
    const promptTextEl = document.getElementById("promptText")
    if (!promptTextEl) return
    const prompt = promptTextEl.textContent?.trim() || ""
    if (!prompt) return

    analyzeBtn.disabled = true
    analyzeBtn.textContent = "分析中..."
    errorAlert.style.display = "none"
    resultsContainer.style.display = "none"

    const isJa = navigator.language?.startsWith("ja")
    const systemPrompt = isJa
      ? 'あなたはMidjourneyのプロンプトを分析するAIアシスタントです。入力されたプロンプトのアートスタイルを詳細に分析し、その芸術的ジャンル/スタイル（genre）、画像の特徴を表現する英単語のタグ（tags、最大5個、すべて英語）、および人間が理解しやすい簡潔な日本語の1文の説明（summary）を、以下のJSONフォーマットで出力してください。余計なテキストは含めず純粋なJSONのみを出力してください。\n\nフォーマット:\n{\n  "genre": "ジャンル名",\n  "tags": ["tag1", "tag2"],\n  "summary": "日本語の要約"\n}'
      : 'You are an AI assistant that analyzes Midjourney prompts. Analyze the art style and output its artistic genre/style (genre), English tags (tags, up to 5 elements), and a concise summary (summary) in the following JSON format. Output ONLY pure JSON.\n\nFormat:\n{\n  "genre": "genre name",\n  "tags": ["tag1", "tag2"],\n  "summary": "concise English summary"\n}'

    try {
      const res = await client.runInference(prompt, systemPrompt)
      const parsed = parseResponse(res.result)

      resultGenre.textContent = parsed.genre || "N/A"
      resultSummary.textContent = parsed.summary || "N/A"
      resultTags.innerHTML = ""
      if (parsed.tags && parsed.tags.length > 0) {
        parsed.tags.forEach((tag) => {
          const badge = document.createElement("span")
          badge.className = "ai-result-tag-badge"
          badge.textContent = tag
          resultTags.appendChild(badge)
        })
      } else {
        resultTags.textContent = "None"
      }

      latencyEl.textContent = Math.round(res.metrics.latencyMs).toString()
      speedTpsEl.textContent = res.metrics.tokensPerSec.toString()

      resultsContainer.style.display = "flex"
    } catch (err: any) {
      console.error("Inference error in UI:", err)
      errorText.textContent = err.message || "推論に失敗しました"
      errorAlert.style.display = "flex"
    } finally {
      analyzeBtn.disabled = false
      analyzeBtn.innerHTML = `
        <svg style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 4px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        スタイルを分析する
      `
    }
  })

  client.addStatusListener((status, details) => {
    console.log("UI updated with status:", status, details)

    // Hide everything first
    downloadBtn.style.display = "none"
    analyzeBtn.style.display = "none"
    progressContainer.style.display = "none"
    errorAlert.style.display = "none"

    if (status === "download-required") {
      downloadBtn.style.display = "block"
    } else if (status === "downloading") {
      progressContainer.style.display = "flex"
      downloadStats.style.display = "flex"
      progressText.textContent = details.text || "モデルをダウンロード中..."
      progressPercent.textContent = `${details.progress}%`
      progressBarFill.style.width = `${details.progress}%`
      speedEl.textContent = `${details.speed} MB/s`
      etaEl.textContent =
        details.eta > 0
          ? `残り時間: ${Math.floor(details.eta / 60)}分${details.eta % 60}秒`
          : "残り時間: 計算中..."
    } else if (
      status === "ready" ||
      status === "engine-ready" ||
      status === "idle"
    ) {
      analyzeBtn.style.display = "block"
    } else if (status === "engine-initializing") {
      progressContainer.style.display = "flex"
      downloadStats.style.display = "none" // No download stats for engine initialization
      progressText.textContent = details.text || "AIエンジンを初期化中..."
      progressPercent.textContent = `${details.progress}%`
      progressBarFill.style.width = `${details.progress}%`
    } else if (status === "error") {
      downloadBtn.style.display = "block" // Allow retry
      errorText.textContent = details.error || "エラーが発生しました"
      errorAlert.style.display = "flex"
    }
  })

  // Start check
  client.checkModelDownloaded()
}

document.addEventListener("DOMContentLoaded", () => {
  loadCardFromUrl()
  setupEventHandlers()
  initA2HS()
  initLocalAi()

  if (typeof window !== "undefined") {
    ;(window as any).__renderCardForTest = renderCard
  }

  if (
    "serviceWorker" in navigator &&
    (import.meta.env.PROD || window.location.search.includes("pwa=true"))
  ) {
    navigator.serviceWorker
      .register("/mobile/sw.js")
      .then((reg) => console.log("ServiceWorker registered: ", reg.scope))
      .catch((err) => console.error("ServiceWorker failed: ", err))
  }
})
