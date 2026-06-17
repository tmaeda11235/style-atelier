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

document.addEventListener("DOMContentLoaded", () => {
  loadCardFromUrl()
  setupEventHandlers()
  initA2HS()

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
