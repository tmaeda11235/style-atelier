import { test as base, chromium, type BrowserContext } from "@playwright/test";
import path from "path";

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    // Plasmoがビルドした拡張機能（prod版）のパスを指定します
    const pathToExtension = path.join(__dirname, "../../build/chrome-mv3-prod");
    
    const context = await chromium.launchPersistentContext("", {
      headless: false, // 拡張機能を読み込むためにヘッドフルモードで起動します
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // バックグラウンド・サービスワーカーがロードされるのを待機し、拡張機能IDを取得します
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker");
    }
    
    const extensionId = background.url().split("/")[2];
    await use(extensionId);
  },
});

export { expect } from "@playwright/test";
