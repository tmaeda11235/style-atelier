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
function initializeResponsiveLayout() {
  console.log('[Sandbox ContentScript] Initializing responsive layout...');

  const pageScroll = document.getElementById('pageScroll');
  if (!pageScroll) {
    console.warn('[Sandbox ContentScript] pageScroll element not found');
    return;
  }

  // Adjust pageScroll container styles to be responsive
  pageScroll.style.width = '100%';
  pageScroll.style.height = '100%';
  pageScroll.style.left = '0';
  pageScroll.style.top = '0';

  const update = () => {
    const W = pageScroll.clientWidth;
    if (W <= 0) return; // Not visible yet

    console.log('[Sandbox ContentScript] Resizing layout, clientWidth:', W);

    // Dynamic width/left calculation (centering logic)
    const w = W < 768 ? Math.max(320, W - 32) : Math.min(1608, W - 80);
    const l = Math.max(0, (W - w) / 2);

    // Aspect ratio parameters matching pristine values
    const gap = W >= 1024 ? 8 : 1; 
    const aspect_ratio = 1.78431;

    // Calculate grid row height dynamically
    // The grid columns are grid-cols-[minmax(0,8fr)_minmax(0,3fr)] -> 8/11 width for grid
    const w_grid = w * 8 / 11;
    const w_col = (w_grid - gap) / 2;
    const h_img = w_col / aspect_ratio;
    const rowHeight = h_img * 2 + gap;

    // We keep track of vertical position
    let currentY = 104; // Header starts at 104px (below top prompt bar)

    // Children of pageScroll
    const children = Array.from(pageScroll.children);
    children.forEach((child) => {
      const htmlChild = child as HTMLElement;
      
      // 1. Scroll height placeholder (e.g. style has very large height or class is w-1)
      const styleAttr = htmlChild.getAttribute('style') || '';
      if (styleAttr.includes('2.70828e+06px') || (htmlChild.className && htmlChild.className.includes('w-1') && !htmlChild.textContent)) {
        return;
      }

      // 2. Header (e.g., textContent contains "Today")
      if (htmlChild.textContent && htmlChild.textContent.includes('Today')) {
        htmlChild.style.top = `${currentY}px`;
        htmlChild.style.left = `${l}px`;
        htmlChild.style.width = `${w}px`;
        htmlChild.style.height = '46px';
        currentY += 46;
        return;
      }

      // 3. Grid Rows (containing grid columns)
      if (htmlChild.className && htmlChild.className.includes('grid-cols-')) {
        htmlChild.style.top = `${currentY}px`;
        htmlChild.style.left = `${l}px`;
        htmlChild.style.width = `${w}px`;
        htmlChild.style.height = `${rowHeight}px`;
        
        // Also adjust the aspect ratio style of individual image wrappers inside the row to match the new image sizes
        const imgWrappers = htmlChild.querySelectorAll('.group.overflow-hidden.rounded-md');
        imgWrappers.forEach((wrapper) => {
          (wrapper as HTMLElement).style.aspectRatio = `${aspect_ratio} / 1`;
        });

        currentY += rowHeight + 8; // Row height + gap
        return;
      }

      // 4. Footer (e.g., containing "Looking for more")
      if (htmlChild.textContent && htmlChild.textContent.includes('Looking for')) {
        htmlChild.style.top = `${currentY}px`;
        htmlChild.style.left = `${l}px`;
        htmlChild.style.width = `${w}px`;
        htmlChild.style.height = '72px';
        currentY += 72 + 20; // height + padding-bottom
        return;
      }
    });

    // Update scroll height placeholder to match our actual content height
    const placeholder = children.find(child => {
      const styleAttr = child.getAttribute('style') || '';
      return styleAttr.includes('2.70828e+06px') || (child.className && child.className.includes('w-1'));
    });
    if (placeholder) {
      (placeholder as HTMLElement).style.height = `${currentY}px`;
    }

    // 5. Update header overlay containers (siblings of pageScroll)
    const parent = pageScroll.parentElement;
    if (parent) {
      const siblingDivs = Array.from(parent.children).filter(child => child.tagName === 'DIV' && child !== pageScroll);
      siblingDivs.forEach(div => {
        const subs = Array.from(div.children);
        subs.forEach(sub => {
          const subEl = sub as HTMLElement;
          const classList = subEl.className;
          
          if (classList.includes('backdrop-blur-md') || classList.includes('bg-nav-gradient')) {
            // These overlays should match pageScroll content area width
            subEl.style.left = `${l}px`;
            subEl.style.width = `${W - l}px`;
          } else if (classList.includes('select-none') && subEl.style.zIndex === '5') {
            // Prompt input container: centered, w - 16 width, l + 8 left
            subEl.style.left = `${l + 8}px`;
            subEl.style.width = `${w - 16}px`;
          }
        });
      });
    }
  };

  update();
  window.addEventListener('resize', update);
  
  // Use a ResizeObserver on pageScroll for even more reliability
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(update);
    observer.observe(pageScroll);
  }
}

function main() {
  console.log("Style Atelier Sandbox Content Script: Initializing...")

  const extractor = new WebDataExtractor()
  if (typeof window !== "undefined") {
    (window as any)._extractor = extractor
  }
  const processor = new ImageProcessor(extractor, true) // Pass true to enable debug outline so observed items are visible
  const galleryObserver = new GalleryObserver(processor)
  const injector = new PromptInjector()
  const commandListener = new CommandListener(injector)

  // メッセージリスナーを起動 (chrome.runtime.onMessage.addListener が呼ばれる)
  commandListener.start()

  // ギャラリー監視を起動
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", () => {
      console.log("Style Atelier Sandbox: DOMContentLoaded, starting observer");
      initializeResponsiveLayout();
      galleryObserver.start();
    })
  } else {
    console.log("Style Atelier Sandbox: DOM ready, starting observer immediately");
    initializeResponsiveLayout();
    galleryObserver.start()
  }
  
  // ロード完了後にもオブザーバーを確実にする
  window.addEventListener("load", () => {
    console.log("Style Atelier Sandbox: load event, starting observer");
    initializeResponsiveLayout();
    galleryObserver.start();
  })
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", main)
} else {
  main()
}
export {}
