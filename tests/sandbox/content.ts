import { PromptInjector } from "../../src/contents/domain/actions/PromptInjector"
import { CommandListener } from "../../src/contents/services/CommandListener"

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

  const injector = new PromptInjector()
  const commandListener = new CommandListener(injector)

  // メッセージリスナーを起動 (chrome.runtime.onMessage.addListener が呼ばれる)
  commandListener.start()
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", main)
} else {
  main()
}
export {}
