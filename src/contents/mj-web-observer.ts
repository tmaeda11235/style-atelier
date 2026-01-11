import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://midjourney.com/*", "https://*.midjourney.com/*"],
  all_frames: true,
  run_at: "document_start"
}

const DEBUG_MODE = false

function getPromptFromContainer(img: HTMLImageElement): string {
  // Strategy 1: Look for common container under #pageScroll (User provided selector)
  const unitContainer = img.closest("#pageScroll > div") || img.closest(".absolute") || img.closest(".group")
  
  if (unitContainer) {
      // User provided HTML shows the prompt is in a span with "word-break: break-word" style
      // or class "inline align-baseline" inside the .break-word container.
      // The first span might be an image thumbnail wrapper.
      const promptSpan = unitContainer.querySelector('.break-word span[style*="word-break"]') || 
                         unitContainer.querySelector('.break-word span.align-baseline')
      
      if (promptSpan && promptSpan.textContent) {
          return promptSpan.textContent.trim()
      }
  }

  // Strategy 2: Traverse up 5 levels (Fallback)
  let current: HTMLElement | null = img.parentElement
  for (let i = 0; i < 5; i++) {
      if (!current) break
      const promptEl = current.querySelector('.break-word span[style*="word-break"]') || 
                       current.querySelector('.break-word span.align-baseline')
      if (promptEl && promptEl.textContent) {
          return promptEl.textContent.trim()
      }
      current = current.parentElement
  }
  return ""
}

function processImage(img: HTMLImageElement) {
  if (img.dataset.saObserved) return
  img.dataset.saObserved = "true"

  if (DEBUG_MODE) {
    img.style.outline = "2px solid #00ff00"
    img.style.outlineOffset = "-2px"
  }

  // Ensure draggable is enabled for interaction
  img.draggable = true
  img.style.cursor = "grab"

  img.addEventListener("dragstart", (e) => {
    // Attempt to extract prompt
    const prompt = getPromptFromContainer(img) || img.alt || ""
    
    // Attempt to extract Job ID from parent link
    let jobId = ""
    const parentLink = img.closest("a")
    if (parentLink && parentLink.href) {
        const match = parentLink.href.match(/jobs\/([a-f0-9-]{36})/)
        if (match) jobId = match[1]
    }

    const payload = {
      src: img.src,
      prompt: prompt,
      jobId: jobId,
      source: "midjourney-web"
    }

    if (e.dataTransfer) {
      try {
        // Attach custom data for the extension side panel
        e.dataTransfer.setData("application/json", JSON.stringify(payload))
      } catch (err) {
        console.error("Style Atelier: Failed to attach data", err)
      }
    }
  }, { capture: true })
}

function observeDOM() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          if (node.tagName === "IMG") processImage(node as HTMLImageElement)
          node.querySelectorAll("img").forEach(processImage)
        }
      })
    })
  })

  observer.observe(document.body, { childList: true, subtree: true })
  
  // Initial scan
  document.querySelectorAll("img").forEach(processImage)
}

if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", observeDOM)
} else {
    observeDOM()
}
// Ensure it runs after full load as well for late injections
window.addEventListener("load", observeDOM)