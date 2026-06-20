import litertWorkerUrl from "url:~litert.worker.ts"
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

  const offscreenUrl = `${offscreenHtmlUrl}?workerUrl=${encodeURIComponent(litertWorkerUrl)}`

  isCreating = chrome.offscreen.createDocument({
    url: offscreenUrl,
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
let sidePanelConnectionsCount = 0

if (
  typeof chrome !== "undefined" &&
  chrome.runtime &&
  chrome.runtime.onConnect
) {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "sidepanel") {
      sidePanelConnectionsCount++
      isSidePanelOpen = true
      port.onDisconnect.addListener(() => {
        sidePanelConnectionsCount = Math.max(0, sidePanelConnectionsCount - 1)
        if (sidePanelConnectionsCount === 0) {
          isSidePanelOpen = false
          checkLifecycle()
        }
      })
    }
  })
}

async function checkLifecycle() {
  let activeSidePanel = isSidePanelOpen
  if (
    !activeSidePanel &&
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    chrome.runtime.getContexts
  ) {
    try {
      const contexts = await chrome.runtime.getContexts({
        contextTypes: ["SIDE_PANEL"]
      })
      activeSidePanel = contexts.length > 0
    } catch (e) {
      console.warn("Failed to get contexts:", e)
    }
  }

  if (!activeSidePanel && !isDownloading && !isInferenceRunning) {
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
