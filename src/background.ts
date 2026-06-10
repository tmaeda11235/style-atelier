import offscreenHtmlUrl from "url:~src/offscreen.html"

// アクションクリック時にサイドパネルを開く設定
if (
  typeof chrome !== "undefined" &&
  chrome.sidePanel &&
  chrome.sidePanel.setPanelBehavior
) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error))
}

// Keep track of offscreen document status
let isCreating: Promise<void> | null = null

async function setupOffscreen() {
  if (typeof chrome === "undefined" || !chrome.offscreen) return

  if (await chrome.offscreen.hasDocument()) {
    return
  }

  if (isCreating) {
    await isCreating
    return
  }

  isCreating = chrome.offscreen.createDocument({
    url: offscreenHtmlUrl,
    reasons: [chrome.offscreen.Reason.LOCAL_STORAGE],
    justification: "WebLLM model download, caching, and inference"
  })

  try {
    await isCreating
  } finally {
    isCreating = null
  }
}

// Listen for connection status (e.g., from sidepanel) to manage offscreen lifecycle
let isDownloading = false
let isSidePanelOpen = false

if (
  typeof chrome !== "undefined" &&
  chrome.runtime &&
  chrome.runtime.onConnect
) {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "sidepanel") {
      isSidePanelOpen = true
      port.onDisconnect.addListener(() => {
        isSidePanelOpen = false
        checkLifecycle()
      })
    }
  })
}

function checkLifecycle() {
  if (!isSidePanelOpen && !isDownloading) {
    closeOffscreen()
  }
}

async function closeOffscreen() {
  if (
    typeof chrome !== "undefined" &&
    chrome.offscreen &&
    chrome.offscreen.closeDocument
  ) {
    if (await chrome.offscreen.hasDocument()) {
      await chrome.offscreen.closeDocument()
    }
  }
}

// Message orchestrator
if (
  typeof chrome !== "undefined" &&
  chrome.runtime &&
  chrome.runtime.onMessage
) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 1. Messages targeting background itself
    if (message.target === "background") {
      if (message.action === "set-downloading") {
        isDownloading = !!message.value
        checkLifecycle()
        sendResponse({ status: "success" })
        return true
      }
    }

    // 2. Messages targeting offscreen
    if (message.target === "offscreen") {
      setupOffscreen()
        .then(() => {
          chrome.runtime.sendMessage(message, (response) => {
            // Forward the response back, ensuring we don't throw if response is undefined
            sendResponse(response || { status: "success" })
          })
        })
        .catch((err) => {
          sendResponse({ status: "error", error: err.message })
        })
      return true // Async response
    }

    // 3. Messages from offscreen-worker (forwarded to active views)
    if (message.source === "offscreen-worker") {
      const payload = message.payload
      if (payload && payload.status === "downloading") {
        isDownloading = true
      } else if (
        payload &&
        (payload.status === "ready" || payload.status === "error")
      ) {
        isDownloading = false
        checkLifecycle()
      }
    }
  })
}
