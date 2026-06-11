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
let isInferenceRunning = false

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
  if (!isSidePanelOpen && !isDownloading && !isInferenceRunning) {
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

function forwardToOffscreen(message: any, sendResponse: (res: any) => void) {
  if (message.action === "run-inference") {
    isInferenceRunning = true
  }
  setupOffscreen()
    .then(() => {
      chrome.runtime.sendMessage(message, (response) => {
        if (message.action === "run-inference") {
          isInferenceRunning = false
          checkLifecycle()
        }
        sendResponse(response || { status: "success" })
      })
    })
    .catch((err) => {
      if (message.action === "run-inference") {
        isInferenceRunning = false
        checkLifecycle()
      }
      sendResponse({ status: "error", error: err.message })
    })
}

function handleBackgroundMessage(
  message: any,
  sendResponse: (res: any) => void
): boolean | undefined {
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
    forwardToOffscreen(message, sendResponse)
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
    } else if (
      payload &&
      (payload.status === "inference-result" ||
        payload.status === "inference-error")
    ) {
      isInferenceRunning = false
      checkLifecycle()
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
    return handleBackgroundMessage(message, sendResponse)
  })
}
