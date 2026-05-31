import { PromptInjector } from "../../src/contents/domain/actions/PromptInjector"
import { CommandListener } from "../../src/contents/services/CommandListener"
import { WebDataExtractor } from "../../src/contents/domain/extractors/WebDataExtractor"
import { ImageProcessor } from "../../src/contents/domain/processors/ImageProcessor"
import { GalleryObserver } from "../../src/contents/services/GalleryObserver"

// 1. chrome API のモック定義（onMessage の親ウィンドウ中継）
const messageListeners: Array<(message: any, sender: any, sendResponse: (res: any) => void) => void | boolean> = [];

if (typeof window !== "undefined") {
  (window as any).chrome = {
    runtime: {
      onMessage: {
        addListener: (listener: any) => {
          console.log('[Sandbox ContentScript] Listener added');
          messageListeners.push(listener);
        },
        removeListener: (listener: any) => {
          const index = messageListeners.indexOf(listener);
          if (index > -1) {
            messageListeners.splice(index, 1);
          }
        }
      }
    }
  };

  // 親ウィンドウ (Sandbox Parent) からのメッセージを受信
  window.addEventListener('message', async (event) => {
    const data = event.data;
    if (data && data.source === 'chrome-api-mock') {
      const { payload, messageId } = data;
      console.log('[Sandbox ContentScript] Received message:', payload);

      for (const listener of messageListeners) {
        const sendResponse = (responsePayload: any) => {
          console.log('[Sandbox ContentScript] Sending Response back:', responsePayload);
          window.parent.postMessage({
            target: 'sidepanel',
            payload: responsePayload,
            messageId
          }, '*');
        };

        // コールバックをキック
        const isAsync = listener(payload, {}, sendResponse);
        if (!isAsync) {
          // 同期処理の場合はここで何かしらのレスポンスを返す仕様も考慮できるが、
          // CommandListenerは async/Promise (isAsync = true) を返す想定。
        }
      }
    }
  });
}

// 2. 本物の Content Script ロジックの開始
function main() {
  console.log("Style Atelier Sandbox Content Script: Initializing...")

  const extractor = new WebDataExtractor()
  const processor = new ImageProcessor(extractor, true) // Pass true to enable debug outline so observed items are visible
  const galleryObserver = new GalleryObserver(processor)
  const injector = new PromptInjector()
  const commandListener = new CommandListener(injector)

  // メッセージリスナーを起動 (chrome.runtime.onMessage.addListener が呼ばれる)
  commandListener.start()

  // ギャラリー監視を起動
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", () => galleryObserver.start())
  } else {
    galleryObserver.start()
  }
  
  // ロード完了後にもオブザーバーを確実にする
  window.addEventListener("load", () => galleryObserver.start())

  // モック画像のインジェクト
  injectMockCards()
  
  // React のロードタイムラグに対応するために時間差で再試行
  setTimeout(injectMockCards, 500)
  setTimeout(injectMockCards, 1500)
}

function injectMockCards() {
  const container = document.getElementById("pageScroll");
  if (!container) {
    return;
  }

  // 既にモックカードが追加されている場合はスキップ
  if (document.querySelector(".sa-mock-gallery")) {
    return;
  }

  console.log("Style Atelier Sandbox: Injecting premium mock cards...");

  // コンテナを初期化してダミーのローディングを削除
  container.innerHTML = "";

  // スタイルの追加
  const style = document.createElement("style");
  style.className = "sa-mock-gallery-styles";
  style.textContent = `
    .sa-mock-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
      padding: 40px;
      width: 100%;
      box-sizing: border-box;
      z-index: 10;
      position: relative;
    }
    .sa-mock-card {
      position: relative;
      background-color: #0b0f19;
      border: 1px solid #1e293b;
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
      display: flex;
      flex-direction: column;
    }
    .sa-mock-card:hover {
      transform: translateY(-4px);
      border-color: #3b82f6;
      box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.3);
    }
    .sa-mock-card a {
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .sa-mock-card img {
      width: 100%;
      height: 210px;
      object-fit: cover;
      display: block;
      transition: opacity 0.2s ease;
    }
    .sa-mock-card img:hover {
      opacity: 0.95;
    }
    .sa-mock-card .card-info {
      padding: 14px;
      background-color: #020617;
      border-top: 1px solid #1e293b;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .sa-mock-card .break-word {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
      word-break: break-word;
      margin-bottom: 8px;
    }
    .sa-mock-card .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
    }
    .sa-mock-card .job-id {
      font-size: 9px;
      color: #475569;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .sa-mock-card .tag {
      font-size: 9px;
      background-color: #1e1b4b;
      color: #818cf8;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
    }
  `;
  document.head.appendChild(style);

  // ギャラリーコンテナ作成
  const gallery = document.createElement("div");
  gallery.className = "sa-mock-gallery";

  const cardsData = [
    {
      jobId: "8f3e5b32-cd29-4e6a-bc01-e25f617d774e",
      prompt: "Cyberpunk street vendor stall, holographic signs, rain slicked asphalt, purple and teal lighting --ar 16:9 --personalize --v 6.0",
      tag: "Cyberpunk",
      svg: `
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1e1b4b"/>
              <stop offset="50%" stop-color="#701a75"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g1)"/>
          <circle cx="200" cy="150" r="80" fill="#ec4899" opacity="0.3" filter="blur(20px)"/>
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#22d3ee" font-family="system-ui, sans-serif" font-weight="bold" font-size="20">CYBERPUNK</text>
        </svg>
      `
    },
    {
      jobId: "1a9f8b72-3c21-4f8e-bd71-c06f1d2e3f4a",
      prompt: "Minimalist ceramic vase on wooden pedestal, soft warm morning light, cinematic shadows, organic shapes --ar 4:5 --sref 3902910 --v 6.0",
      tag: "Minimalist",
      svg: `
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fef08a" stop-opacity="0.2"/>
              <stop offset="100%" stop-color="#ca8a04" stop-opacity="0.1"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="#1e1b4b"/>
          <rect x="100" y="50" width="200" height="200" fill="url(#g2)" rx="100"/>
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#fef08a" font-family="system-ui, sans-serif" font-weight="bold" font-size="20">MINIMALIST</text>
        </svg>
      `
    },
    {
      jobId: "5c8b2a19-f9c3-4d7a-b5e1-a02b1f8e9c3d",
      prompt: "Lush celestial garden with glowing flora, dreamlike nebula sky, iridescent crystal structures --ar 16:9 --chaos 20 --v 6.0",
      tag: "Celestial",
      svg: `
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#312e81"/>
              <stop offset="50%" stop-color="#1e1b4b"/>
              <stop offset="100%" stop-color="#4c1d95"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g3)"/>
          <circle cx="200" cy="150" r="100" fill="#a855f7" opacity="0.2" filter="blur(30px)"/>
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#c084fc" font-family="system-ui, sans-serif" font-weight="bold" font-size="20">CELESTIAL</text>
        </svg>
      `
    },
    {
      jobId: "9d7e5f31-8b2c-4a3d-9f0a-1e2b3c4d5e6f",
      prompt: "Vibrant retro-futuristic synthwave sports car driving towards sunset, grid lines, chrome reflection --ar 16:9 --stylize 250 --v 6.0",
      tag: "Synthwave",
      svg: `
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f43f5e"/>
              <stop offset="100%" stop-color="#1e1b4b"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g4)"/>
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#fb7185" font-family="system-ui, sans-serif" font-weight="bold" font-size="20">SYNTHWAVE</text>
        </svg>
      `
    }
  ];

  cardsData.forEach(data => {
    const card = document.createElement("div");
    card.className = "sa-mock-card group";

    const a = document.createElement("a");
    a.href = `https://www.midjourney.com/jobs/${data.jobId}`;
    a.draggable = false;

    // Convert SVG to data URL
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.svg.trim())}`;

    const img = document.createElement("img");
    img.src = svgUrl;
    img.alt = data.prompt;

    const info = document.createElement("div");
    info.className = "card-info";

    const promptDiv = document.createElement("div");
    promptDiv.className = "break-word";
    promptDiv.textContent = data.prompt;

    const footer = document.createElement("div");
    footer.className = "card-footer";

    const jobIdSpan = document.createElement("span");
    jobIdSpan.className = "job-id";
    jobIdSpan.textContent = `Job: ${data.jobId.slice(0, 8)}...`;

    const tagSpan = document.createElement("span");
    tagSpan.className = "tag";
    tagSpan.textContent = data.tag;

    footer.appendChild(jobIdSpan);
    footer.appendChild(tagSpan);

    info.appendChild(promptDiv);
    info.appendChild(footer);

    a.appendChild(img);
    a.appendChild(info);
    card.appendChild(a);

    gallery.appendChild(card);
  });

  container.appendChild(gallery);
  console.log("Style Atelier Sandbox: Premium mock cards injected successfully");

  // Force-trigger observation on the newly added images immediately
  if (typeof window !== "undefined" && (window as any).chrome) {
    const event = new Event("DOMContentLoaded");
    window.dispatchEvent(event);
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", main)
} else {
  main()
}
export {}
