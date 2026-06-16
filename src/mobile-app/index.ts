import type { StyleCard } from "../lib/db-schema"
import { buildPromptString } from "../lib/prompt-utils"
import { decompressCardData } from "../lib/qr-utils"
import { GDriveClient } from "./gdrive-client"

let currentCardData: Partial<StyleCard> | null = null

function showToast(message: string) {
  const toast = document.getElementById("toast") as HTMLElement
  const span = toast.querySelector("span")
  if (span) {
    span.textContent = message
  }
  toast.classList.add("show")
  setTimeout(() => {
    toast.classList.remove("show")
  }, 2000)
}

function applyCardColors(
  card: Partial<StyleCard>,
  element: HTMLElement | null,
  rarityClass: string
) {
  if (!element) return
  const baseClass = element.classList.contains("card-front")
    ? "card-front"
    : "card-back"
  element.className = baseClass + " " + rarityClass
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
  const params = parameters || {}
  Object.entries(params).forEach(([key, val]) => {
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

  // Use thumbnailData if available, otherwise fallback to local image
  const src = card.thumbnailData || "./cyber_samurai.png"

  container.innerHTML = `
    <img src="${src}" alt="${card.name || "Card Image"}" class="card-image">
    <div class="card-image-overlay">Tap to reveal Prompt</div>
  `
}

function renderCard(card: Partial<StyleCard>) {
  const cardTitleFront = document.getElementById("cardTitleFront")
  const cardTitleBack = document.getElementById("cardTitleBack")
  const cardRarityFront = document.getElementById("cardRarityFront")
  const cardRarityBack = document.getElementById("cardRarityBack")
  const promptTextEl = document.getElementById("promptText")
  const cardFront = document.getElementById("cardFront")
  const cardBack = document.getElementById("cardBack")

  if (cardTitleFront) cardTitleFront.textContent = card.name || "Unnamed Card"
  if (cardTitleBack) cardTitleBack.textContent = card.name || "Unnamed Card"

  const rarity = (card.tier || "common").toUpperCase()
  if (cardRarityFront) cardRarityFront.textContent = rarity
  if (cardRarityBack) cardRarityBack.textContent = rarity

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
    parameters: {
      ar: "16:9",
      stylize: 750
    }
  }
  currentCardData = fallback
  renderCard(fallback)
}

function loadCardFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const rawParam = params.get("p") || params.get("data")

  if (rawParam) {
    try {
      // URLSearchParams decodes '+' as ' '. We must convert spaces back to '+' for valid Base64 decoding.
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
  const frontCard = cardContainer.querySelector(".card-front") as HTMLElement
  const backCard = cardContainer.querySelector(".card-back") as HTMLElement

  if (frontCard && backCard) {
    frontCard.style.setProperty("--glow-x", `${x}%`)
    frontCard.style.setProperty("--glow-y", `${y}%`)
    frontCard.style.setProperty("--holo-x", `${x}%`)
    frontCard.style.setProperty("--holo-y", `${y}%`)
    backCard.style.setProperty("--glow-x", `${x}%`)
    backCard.style.setProperty("--glow-y", `${y}%`)
    backCard.style.setProperty("--holo-x", `${x}%`)
    backCard.style.setProperty("--holo-y", `${y}%`)
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
  const px = ((touch.clientX - rect.left) / rect.width) * 100
  const py = ((touch.clientY - rect.top) / rect.height) * 100

  const clampedX = Math.max(0, Math.min(100, px))
  const clampedY = Math.max(0, Math.min(100, py))

  if (!ticking) {
    requestAnimationFrame(() => {
      updateHologramProperties(clampedX, clampedY, cardContainer)
      ticking = false
    })
    ticking = true
  }
}

function resetHologram(cardContainer: HTMLElement) {
  requestAnimationFrame(() => {
    updateHologramProperties(50, 50, cardContainer)
  })
}

function setupCardContainerEvents(cardContainer: HTMLElement) {
  cardContainer.addEventListener("click", (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest(".action-btn")) return
    cardContainer.classList.toggle("is-flipped")
  })

  cardContainer.addEventListener("mousemove", (e: MouseEvent) => {
    handleHologramMove(e, cardContainer)
  })

  cardContainer.addEventListener("mouseleave", () => {
    resetHologram(cardContainer)
  })

  cardContainer.addEventListener(
    "touchstart",
    (e: TouchEvent) => {
      handleHologramTouchMove(e, cardContainer)
    },
    { passive: true }
  )

  cardContainer.addEventListener(
    "touchmove",
    (e: TouchEvent) => {
      handleHologramTouchMove(e, cardContainer)
    },
    { passive: true }
  )

  cardContainer.addEventListener("touchend", () => {
    resetHologram(cardContainer)
  })
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

  saveCloudBtn.addEventListener("click", handleCloudSave)
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
})
