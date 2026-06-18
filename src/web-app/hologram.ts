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
  const rect = cardContainer.getBoundingClientRect()
  const px = ((e.touches[0].clientX - rect.left) / rect.width) * 100
  const py = ((e.touches[0].clientY - rect.top) / rect.height) * 100
  if (!ticking) {
    requestAnimationFrame(() => {
      updateHologramProperties(
        Math.max(0, Math.min(100, px)),
        Math.max(0, Math.min(100, py)),
        cardContainer
      )
      ticking = false
    })
    ticking = true
  }
}

function resetHologram(cardContainer: HTMLElement) {
  requestAnimationFrame(() => updateHologramProperties(50, 50, cardContainer))
}

export function setupCardContainerEvents(cardContainer: HTMLElement) {
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
  cardContainer.addEventListener(
    "touchstart",
    (e) => handleHologramTouchMove(e, cardContainer),
    { passive: true }
  )
  cardContainer.addEventListener(
    "touchmove",
    (e) => handleHologramTouchMove(e, cardContainer),
    { passive: true }
  )
  cardContainer.addEventListener("touchend", () => resetHologram(cardContainer))
}
