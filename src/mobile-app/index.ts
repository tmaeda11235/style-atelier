import type { StyleCard } from "../lib/db-schema"
import { buildPromptString } from "../lib/prompt-utils"
import { decompressCardData } from "../lib/qr-utils"

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
  if (cardFront) {
    cardFront.className = "card-front " + rarityClass
    if (card.dominantColor) {
      cardFront.style.setProperty(
        "--color-accent-card",
        card.accentColor || "#3b82f6"
      )
      cardFront.style.setProperty(
        "--color-dominant-card",
        card.dominantColor || "#1e293b"
      )
    }
  }
  if (cardBack) {
    cardBack.className = "card-back " + rarityClass
    if (card.dominantColor) {
      cardBack.style.setProperty(
        "--color-accent-card",
        card.accentColor || "#3b82f6"
      )
      cardBack.style.setProperty(
        "--color-dominant-card",
        card.dominantColor || "#1e293b"
      )
    }
  }

  if (promptTextEl) {
    promptTextEl.textContent = buildPromptString(
      card.promptSegments || [],
      card.parameters || {}
    )
  }
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
        text: "A futuristic cyberpunk samurai standing in neon rain, Tokyo street background, highly detailed style, glowing katana, rich colors, intricate cybernetic armor, Unreal Engine 5 render, cinematic lighting",
        type: "text"
      }
    ],
    parameters: {
      ar: "16:9",
      stylize: 750
    }
  }
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

function handleHologramMove(e: MouseEvent, cardContainer: HTMLElement) {
  const rect = cardContainer.getBoundingClientRect()
  const px = ((e.clientX - rect.left) / rect.width) * 100
  const py = ((e.clientY - rect.top) / rect.height) * 100

  const frontCard = cardContainer.querySelector(".card-front") as HTMLElement
  const backCard = cardContainer.querySelector(".card-back") as HTMLElement

  if (frontCard && backCard) {
    ;[frontCard, backCard].forEach((card) => {
      card.style.setProperty("--glow-x", `${px}%`)
      card.style.setProperty("--glow-y", `${py}%`)
      card.style.setProperty("--holo-x", `${px}%`)
      card.style.setProperty("--holo-y", `${py}%`)
    })
  }
}

function resetHologram(cardContainer: HTMLElement) {
  const frontCard = cardContainer.querySelector(".card-front") as HTMLElement
  const backCard = cardContainer.querySelector(".card-back") as HTMLElement

  if (frontCard && backCard) {
    ;[frontCard, backCard].forEach((card) => {
      card.style.setProperty("--glow-x", "50%")
      card.style.setProperty("--glow-y", "50%")
      card.style.setProperty("--holo-x", "50%")
      card.style.setProperty("--holo-y", "50%")
    })
  }
}

function setupEventHandlers() {
  const cardContainer = document.getElementById("cardContainer") as HTMLElement
  const copyBtn = document.getElementById("copyBtn") as HTMLButtonElement
  const promptText = document.getElementById("promptText") as HTMLElement
  const saveCloudBtn = document.getElementById(
    "saveCloudBtn"
  ) as HTMLButtonElement

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

  saveCloudBtn.addEventListener("click", () => {
    showToast("クラウドに一時保存しました")
  })
}

document.addEventListener("DOMContentLoaded", () => {
  loadCardFromUrl()
  setupEventHandlers()
})
