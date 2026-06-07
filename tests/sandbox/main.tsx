/* eslint-disable */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import ReactDOM from "react-dom/client"

import SidePanelPage from "../../src/pages/SidePanel"

import "../../src/style.css" // スタイルの読み込み

import { db } from "../../src/lib/db"

const queryClient = new QueryClient()

// シードデータ設定
async function seedSandboxData() {
  try {
    console.log("[Sandbox Seed] Clearing old style cards...")
    await db.styleCards.clear()
    console.log("[Sandbox Seed] Seeding mock cards into IndexedDB...")
    await db.styleCards.bulkAdd([
      {
        id: "mock-card-1",
        name: "cyberpunk style",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        promptSegments: [
          { type: "text", value: "neon-lit cyberpunk aesthetic" }
        ],
        parameters: { sref: ["https://midjourney.com/mock-sref"] },
        masking: { isSrefHidden: false, isPHidden: false },
        tier: "Common",
        isFavorite: false,
        isPinned: true, // HandBar に表示されるようにピン留め
        usageCount: 0,
        tags: ["style"],
        dominantColor: "#3b82f6",
        thumbnailData:
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231e293b'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-size='10'>cyberpunk</text></svg>",
        frameId: "default",
        genealogy: { generation: 1, parentIds: [] }
      },
      {
        id: "mock-card-2",
        name: "anime slot template",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        promptSegments: [
          { type: "text", value: "retro anime style," },
          { type: "slot", label: "Subject", default: "girl" },
          { type: "text", value: "eating ramen" }
        ],
        parameters: {},
        masking: { isSrefHidden: false, isPHidden: false },
        tier: "Rare",
        isFavorite: false,
        isPinned: true,
        usageCount: 2,
        tags: ["anime"],
        dominantColor: "#ec4899",
        thumbnailData:
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231e293b'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23ec4899' font-size='10'>anime</text></svg>",
        frameId: "default",
        genealogy: { generation: 1, parentIds: [] }
      }
    ])

    console.log("[Sandbox Seed] Clearing old categories...")
    await db.categories.clear()
    console.log("[Sandbox Seed] Seeding default categories...")
    const now = Date.now()
    await db.categories.bulkAdd([
      { id: "style", name: "Style", iconEmoji: "🎨", createdAt: now },
      { id: "character", name: "Character", iconEmoji: "👤", createdAt: now },
      { id: "landscape", name: "Landscape", iconEmoji: "🌲", createdAt: now },
      { id: "lighting", name: "Lighting", iconEmoji: "💡", createdAt: now },
      { id: "camera", name: "Camera", iconEmoji: "📷", createdAt: now },
      { id: "abstract", name: "Abstract", iconEmoji: "🌀", createdAt: now },
      { id: "other", name: "Other", iconEmoji: "📁", createdAt: now }
    ])

    console.log("[Sandbox Seed] Seeding finished successfully.")
  } catch (err) {
    console.error("[Sandbox Seed] Failed to seed sandbox database:", err)
  }
}

seedSandboxData()

// chrome API モックの定義
if (typeof window !== "undefined") {
  ;(window as any).db = db
  const pendingRequests = new Map<string, (value: any) => void>()

  // 親ウィンドウからのレスポンスを待受
  window.addEventListener("message", (event) => {
    const data = event.data
    if (data && data.source === "chrome-api-mock-response") {
      const resolve = pendingRequests.get(data.messageId)
      if (resolve) {
        resolve(data.payload)
        pendingRequests.delete(data.messageId)
      }
    }
  })

  ;(window as any).chrome = {
    tabs: {
      query: async (queryInfo: any) => {
        // 常にアクティブなMidjourneyタブが存在するようにエミュレート
        return [
          { id: 1, url: "https://www.midjourney.com/imagine", active: true }
        ]
      },
      sendMessage: (tabId: number, message: any) => {
        return new Promise((resolve) => {
          const messageId = Math.random().toString(36).substring(2, 15)
          pendingRequests.set(messageId, resolve)

          // 親ウィンドウへ中継を依頼
          window.parent.postMessage(
            {
              target: "content-script",
              payload: message,
              messageId
            },
            "*"
          )
        })
      },
      reload: () => {
        // 親ウィンドウに対してリロードのメッセージを送る、あるいは直接リロードさせる
        console.log("Mock chrome.tabs.reload triggered")
      }
    },
    runtime: {
      onMessage: {
        addListener: () => {},
        removeListener: () => {}
      }
    },
    identity: {
      getAuthToken: (details: any, callback: any) => {
        if (callback) callback("mock-token-123")
        return Promise.resolve("mock-token-123")
      },
      removeCachedAuthToken: (details: any, callback: any) => {
        if (callback) callback()
        return Promise.resolve()
      }
    }
  }
}

const root = ReactDOM.createRoot(document.getElementById("root")!)
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <div className="dark h-screen w-screen overflow-hidden bg-slate-950 text-slate-50">
        <SidePanelPage />
      </div>
    </QueryClientProvider>
  </React.StrictMode>
)
