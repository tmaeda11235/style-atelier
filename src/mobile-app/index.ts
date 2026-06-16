import type { StyleCard } from "../lib/db-schema"
import { buildPromptString } from "../lib/prompt-utils"
import { decompressCardData } from "../lib/qr-utils"
import {
  initGisClient,
  isMock,
  requestAccessToken,
  saveToGoogleDrive,
  type SaveResult
} from "./gdrive"

let currentCardData: Partial<StyleCard> | null = null

function showToast(message: string) {
  const toast = document.getElementById("toast") as HTMLElement
  const span = toast.querySelector("span")
  if (span) span.textContent = message
  toast.classList.add("show")
  setTimeout(() => toast.classList.remove("show"), 2000)
}

function applyCardColors(
  card: Partial<StyleCard>,
  element: HTMLElement | null,
  rarityClass: string
) {
  if (!element) return
  const base = element.classList.contains("card-front")
    ? "card-front"
    : "card-back"
  element.className = `${base} ${rarityClass}`
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
  const el = document.getElementById("parameterBadges")
  if (!el) return
  el.innerHTML = ""
  Object.entries(parameters || {}).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      const badge = document.createElement("span")
      badge.className = "parameter-badge"
      badge.textContent = `--${key} ${val}`
      el.appendChild(badge)
    }
  })
}
function renderCardImage(card: Partial<StyleCard>) {
  const container = document.getElementById("cardImageContainer")
  if (!container) return

  // Use thumbnailData if available, otherwise fallback to local image
  const src = card.thumbnailData || "./cyber_samurai.png"

  container.innerHTML = `
    <img src="${src}" alt="${card.name || "Card Image"}" class="card-image">
    <div class="card-image-overlay">Tap to reveal Prompt</div>
  `
}

function renderCard(card: Partial<StyleCard>) {
  currentCardData = card
  const titleFront = document.getElementById("cardTitleFront")
  const titleBack = document.getElementById("cardTitleBack")
  const rarityFront = document.getElementById("cardRarityFront")
  const rarityBack = document.getElementById("cardRarityBack")
  const promptEl = document.getElementById("promptText")

  if (titleFront) titleFront.textContent = card.name || "Unnamed Card"
  if (titleBack) titleBack.textContent = card.name || "Unnamed Card"

  const rarity = (card.tier || "common").toUpperCase()
  if (rarityFront) rarityFront.textContent = rarity
  if (rarityBack) rarityBack.textContent = rarity

  const rarityClass = `rarity-${(card.tier || "common").toLowerCase()}`
  applyCardColors(card, document.getElementById("cardFront"), rarityClass)
  applyCardColors(card, document.getElementById("cardBack"), rarityClass)

  if (promptEl) {
    promptEl.textContent = buildPromptString(
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
    tier: "Legendary",
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
      const normalizedData = rawParam.replace(/ /g, "+")
      const cardData = decompressCardData(normalizedData)
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

let ticking = false

function updateHologramProperties(
  x: number,
  y: number,
  cardContainer: HTMLElement
) {
  const front = cardContainer.querySelector(".card-front") as HTMLElement
  const back = cardContainer.querySelector(".card-back") as HTMLElement
  if (front && back) {
    ;[front, back].forEach((el) => {
      el.style.setProperty("--glow-x", `${x}%`)
      el.style.setProperty("--glow-y", `${y}%`)
      el.style.setProperty("--holo-x", `${x}%`)
      el.style.setProperty("--holo-y", `${y}%`)
    })
  }
}

function handleHologramMove(e: MouseEvent, cardContainer: HTMLElement) {
  const rect = cardContainer.getBoundingClientRect()
  const px = ((e.clientX - rect.left) / rect.width) * 100
  const py = ((e.clientY - rect.top) / rect.height) * 100
  if (!ticking) {
    requestAnimationFrame(() => {
      updateHologramProperties(px, py, cardContainer)
      ticking = false
    })
    ticking = true
  }
}

function handleHologramTouchMove(e: TouchEvent, cardContainer: HTMLElement) {
  if (e.touches.length === 0) return
  const touch = e.touches[0]
  const rect = cardContainer.getBoundingClientRect()
  const px = Math.max(
    0,
    Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100)
  )
  const py = Math.max(
    0,
    Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100)
  )
  if (!ticking) {
    requestAnimationFrame(() => {
      updateHologramProperties(px, py, cardContainer)
      ticking = false
    })
    ticking = true
  }
}

function resetHologram(cardContainer: HTMLElement) {
  requestAnimationFrame(() => updateHologramProperties(50, 50, cardContainer))
}

function setupCardContainerEvents(cardContainer: HTMLElement) {
  cardContainer.addEventListener("click", (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest(".action-btn")) return
    cardContainer.classList.toggle("is-flipped")
  })
  cardContainer.addEventListener("mousemove", (e) =>
    handleHologramMove(e, cardContainer)
  )
  cardContainer.addEventListener("mouseleave", () =>
    resetHologram(cardContainer)
  )
  const opts = { passive: true }
  cardContainer.addEventListener(
    "touchstart",
    (e) => handleHologramTouchMove(e, cardContainer),
    opts
  )
  cardContainer.addEventListener(
    "touchmove",
    (e) => handleHologramTouchMove(e, cardContainer),
    opts
  )
  cardContainer.addEventListener("touchend", () => resetHologram(cardContainer))
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

async function handleCloudSave() {
  if (!currentCardData) {
    showToast("保存するカードデータがありません")
    return
  }

  // E2Eテスト時はダミーの成功トーストを返す
  if ((window as any).__E2E_TEST__) {
    showToast("クラウドに一時保存しました")
    return
  }

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY

  if (!clientId || !apiKey) {
    console.error("Google API Credentials not found.")
    showToast("クラウド保存の設定が不足しています")
    return
  }

  try {
    showToast("クラウド保存中...")
    const client = new GDriveClient(clientId, apiKey)
    const result = await client.saveCardData(currentCardData)

    if (result.success) {
      showToast("クラウドに保存しました！")
    } else {
      console.error(result.error)
      showToast("保存に失敗しました")
    }
  } catch (err) {
    console.error(err)
    showToast("保存中にエラーが発生しました")
  }
}

function setupButtonEvents(
  copyBtn: HTMLButtonElement,
  promptText: HTMLElement,
  saveCloudBtn: HTMLButtonElement
) {
  copyBtn.addEventListener("click", async () => {
    const text = promptText.textContent?.trim() || ""
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = text
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
  const cardContainer = document.getElementById("cardContainer") as HTMLElement
  const copyBtn = document.getElementById("copyBtn") as HTMLButtonElement
  const promptText = document.getElementById("promptText") as HTMLElement
  const saveCloudBtn = document.getElementById(
    "saveCloudBtn"
  ) as HTMLButtonElement
  setupCardContainerEvents(cardContainer)
  setupButtonEvents(copyBtn, promptText, saveCloudBtn)
}

document.addEventListener("DOMContentLoaded", () => {
  loadCardFromUrl()
  setupEventHandlers()
  if (!isMock) {
    initGisClient(
      () => {},
      () => {}
    )
  }
})
