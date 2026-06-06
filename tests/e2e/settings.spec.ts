import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Style Atelier Sandbox E2E Tests - Settings", () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`);
    });
    page.on('requestfailed', request => {
      console.error(`[REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText}`);
    });
    page.on('response', response => {
      if (response.status() >= 400) {
        console.error(`[HTTP ERROR] ${response.url()}: ${response.status()}`);
      }
    });
  });

  test("should allow selecting restore mode and verify replace/merge behavior", async ({ page }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots");

    // Mock Google Drive API response
    await page.route("https://www.googleapis.com/drive/v3/files*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files: [
            {
              id: "mock-file-123",
              modifiedTime: "2026-06-03 12:00:00",
              size: "153600" // 150.0 KB
            }
          ]
        })
      });
    });

    console.log("Navigating to sandbox page for Restore Mode E2E test...");
    await page.goto("/tests/sandbox/index.html");

    const spFrame = page.frameLocator("#sidepanel-frame");

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("text=スキップ");
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click();
    }

    // 2. Switch to Settings tab
    const settingsTabButton = spFrame.locator("nav button:has-text('Settings')");
    await expect(settingsTabButton).toBeVisible();
    await settingsTabButton.click();

    // 3. Verify Sync and Force Recovery UI is visible
    const syncBtn = spFrame.locator("#google-drive-sync-btn");
    const forceRecoveryBtn = spFrame.locator("#force-recovery-btn");
    await expect(syncBtn).toBeVisible({ timeout: 10000 });
    await expect(forceRecoveryBtn).toBeVisible();

    // Enable Google Drive synchronization
    console.log("Enabling Google Drive sync...");
    const toggleBtn = spFrame.locator("#google-drive-toggle-btn");
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Wait for the cloud backup preview to appear
    console.log("Waiting for cloud backup preview...");
    const previewEl = spFrame.locator("text=150.0 KB").first();
    await expect(previewEl).toBeVisible({ timeout: 10000 });

    // Scroll to the Force Recovery button to bring the Danger Zone preview into view
    await forceRecoveryBtn.scrollIntoViewIfNeeded();

    // 4. Capture screenshot of Settings tab with new UI
    await page.screenshot({
      path: path.join(screenshotsDir, "restore-mode-ui.png"),
    });

    // 5. Test sync/merge and soft delete behavior via page evaluation (Dexie verification)
    const results = await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db;
      
      const resetData = async () => {
        await database.styleCards.clear();
        await database.categories.clear();
        await database.userSettings.clear();
        await database.historyItems.clear();
      };

      // Set initial local state
      await resetData();
      await database.styleCards.bulkAdd([
        {
          id: "card-1",
          name: "Local Card 1 (Old)",
          createdAt: 1000,
          updatedAt: 1000,
          promptSegments: [],
          parameters: {},
          masking: {},
          tier: "Common",
          tags: [],
          dominantColor: "#000",
          thumbnailData: ""
        },
        {
          id: "card-2",
          name: "Local Only Card",
          createdAt: 1000,
          updatedAt: 1000,
          promptSegments: [],
          parameters: {},
          masking: {},
          tier: "Common",
          tags: [],
          dominantColor: "#000",
          thumbnailData: ""
        }
      ]);

      const backupPayload = {
        styleCards: [
          {
            id: "card-1",
            name: "Backup Card 1 (New)",
            createdAt: 1000,
            updatedAt: 2000, // Newer!
            promptSegments: [],
            parameters: {},
            masking: {},
            tier: "Common",
            tags: [],
            dominantColor: "#000",
            thumbnailData: ""
          },
          {
            id: "card-3",
            name: "Backup Only Card",
            createdAt: 1500,
            updatedAt: 1500,
            promptSegments: [],
            parameters: {},
            masking: {},
            tier: "Common",
            tags: [],
            dominantColor: "#000",
            thumbnailData: ""
          }
        ],
        categories: [],
        userSettings: [],
        historyItems: []
      };

      // Scenario A: Merge Restore (Simulating Sync download phase)
      await database.importBackupData(backupPayload, "merge");
      const afterMerge = await database.getAllCards();

      // Reset for Scenario B: Replace Restore (Simulating Force Recovery)
      await resetData();
      await database.styleCards.bulkAdd([
        {
          id: "card-1",
          name: "Local Card 1 (Old)",
          createdAt: 1000,
          updatedAt: 1000,
          promptSegments: [],
          parameters: {},
          masking: {},
          tier: "Common",
          tags: [],
          dominantColor: "#000",
          thumbnailData: ""
        },
        {
          id: "card-2",
          name: "Local Only Card",
          createdAt: 1000,
          updatedAt: 1000,
          promptSegments: [],
          parameters: {},
          masking: {},
          tier: "Common",
          tags: [],
          dominantColor: "#000",
          thumbnailData: ""
        }
      ]);

      await database.importBackupData(backupPayload, "replace");
      const afterReplace = await database.getAllCards();

      // Scenario C: Logical Delete Sync
      await resetData();
      await database.styleCards.bulkAdd([
        {
          id: "card-active",
          name: "Active Card",
          createdAt: 1000,
          updatedAt: 1000,
          promptSegments: [],
          parameters: {},
          masking: {},
          tier: "Common",
          tags: [],
          dominantColor: "#000",
          thumbnailData: "heavy-thumb-data"
        }
      ]);

      const backupWithDelete = {
        styleCards: [
          {
            id: "card-active",
            name: "Active Card",
            createdAt: 1000,
            updatedAt: 2000, // Newer delete state
            isDeleted: true,
            promptSegments: [],
            parameters: {},
            masking: {},
            tier: "Common",
            tags: [],
            dominantColor: "#000",
            thumbnailData: "",
            images: [],
            selectedThumbnails: []
          }
        ],
        categories: [],
        userSettings: [],
        historyItems: []
      };

      await database.importBackupData(backupWithDelete, "merge");
      const activeCardsAfterDeleteSync = await database.getAllCards();
      const physicalCardsAfterDeleteSync = await database.styleCards.toArray();

      return {
        afterMerge: afterMerge.map((c: any) => ({ id: c.id, name: c.name })),
        afterReplace: afterReplace.map((c: any) => ({ id: c.id, name: c.name })),
        logicalDeleteSync: {
          activeCount: activeCardsAfterDeleteSync.length,
          physicalCount: physicalCardsAfterDeleteSync.length,
          card: physicalCardsAfterDeleteSync[0] ? {
            id: physicalCardsAfterDeleteSync[0].id,
            isDeleted: physicalCardsAfterDeleteSync[0].isDeleted,
            thumbnailData: physicalCardsAfterDeleteSync[0].thumbnailData
          } : null
        }
      };
    });

    console.log("Merge results:", results.afterMerge);
    console.log("Replace results:", results.afterReplace);
    console.log("Delete sync results:", results.logicalDeleteSync);

    // Verify Merge Results
    expect(results.afterMerge).toContainEqual({ id: "card-1", name: "Backup Card 1 (New)" });
    expect(results.afterMerge).toContainEqual({ id: "card-2", name: "Local Only Card" });
    expect(results.afterMerge).toContainEqual({ id: "card-3", name: "Backup Only Card" });
    expect(results.afterMerge.length).toBe(3);

    // Verify Replace Results
    expect(results.afterReplace).toContainEqual({ id: "card-1", name: "Backup Card 1 (New)" });
    expect(results.afterReplace).toContainEqual({ id: "card-3", name: "Backup Only Card" });
    expect(results.afterReplace.length).toBe(2);

    // Verify Logical Delete Sync Results
    expect(results.logicalDeleteSync.activeCount).toBe(0); // Filtered out from getAllCards
    expect(results.logicalDeleteSync.physicalCount).toBe(1); // Record still exists in IndexedDB
    expect(results.logicalDeleteSync.card).toEqual({
      id: "card-active",
      isDeleted: true,
      thumbnailData: "" // Heavy image info is cleared
    });

    console.log("Sync and logical delete E2E logic verification passed successfully!");
  });

  test("should support auto-sync toggling and trigger backup on database changes", async ({ page }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots");

    let uploadCallCount = 0;
    // Mock files list request
    await page.route("**/drive/v3/files*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ files: [] })
      });
    });

    // Mock file creation/upload request
    await page.route("**/upload/drive/v3/files*", async (route) => {
      uploadCallCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "mock-file-123" })
      });
    });

    console.log("Navigating to sandbox page for Auto-Sync E2E test...");
    await page.goto("/tests/sandbox/index.html");

    const spFrame = page.frameLocator("#sidepanel-frame");

    // Skip welcome dialog
    const skipButton = spFrame.locator("text=スキップ");
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click();
    }

    // Switch to Settings tab
    const settingsTabButton = spFrame.locator("nav button:has-text('Settings')");
    await settingsTabButton.click();

    // Enable Google Drive synchronization
    const toggleBtn = spFrame.locator("#google-drive-toggle-btn");
    await toggleBtn.click();

    // Check that auto-sync button is visible
    const autoSyncBtn = spFrame.locator("#google-drive-auto-sync-btn");
    await expect(autoSyncBtn).toBeVisible({ timeout: 10000 });

    // Enable auto-sync
    await autoSyncBtn.click();

    // Capture screenshot showing auto-sync enabled
    await page.screenshot({
      path: path.join(screenshotsDir, "auto-sync-enabled.png"),
    });

    // Simulate database changes inside evaluate to see if auto-backup triggers
    console.log("Mutating database to trigger auto-backup...");
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db;
      // Configure fast debounce using exposed config
      const autoSyncConfig = (window as any).autoSyncConfig;
      if (autoSyncConfig) {
        autoSyncConfig.setDebounceMs(100);
      }

      // Add a style card to trigger dexie hooks
      await database.styleCards.add({
        id: "card-auto-sync-test",
        name: "Auto Sync Test Card",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        promptSegments: [],
        parameters: {},
        masking: {},
        tier: "Common",
        tags: [],
        dominantColor: "#000",
        thumbnailData: ""
      });
    });

    // Wait for the debounced upload call to happen (100ms debounce + some network overhead)
    await page.waitForTimeout(500);

    // Verify upload was triggered automatically
    expect(uploadCallCount).toBeGreaterThan(0);
    console.log("Auto-backup triggered successfully upon DB changes!");
  });

  test("should toggle Easy Mode and restrict tab visibility to Library only", async ({ page }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots");
    console.log("Navigating to sandbox page for Easy Mode E2E test...");
    await page.goto("/tests/sandbox/index.html");

    const spFrame = page.frameLocator("#sidepanel-frame");

    // 1. Skip welcome dialog if exists
    const skipButton = spFrame.locator("text=スキップ");
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click();
    }

    // 2. Verify History tab is visible initially
    const historyTabBtn = spFrame.locator("nav button:has-text('History')");
    await expect(historyTabBtn).toBeVisible({ timeout: 10000 });

    // 3. Click Settings icon in header to navigate to Settings
    const settingsNavBtn = spFrame.locator("#settings-nav-btn");
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 });
    await settingsNavBtn.click();

    // 4. Verify Easy Mode toggle button exists in SettingsTab
    const easyModeToggle = spFrame.locator("#easy-mode-toggle-btn");
    await expect(easyModeToggle).toBeVisible({ timeout: 10000 });

    // 5. Toggle Easy Mode to ON
    console.log("Enabling Easy Mode...");
    await easyModeToggle.click();
    await page.waitForTimeout(500);

    // 6. Verify tabs are hidden and Library title is displayed
    const libraryTitle = spFrame.locator("span:has-text('Library')");
    await expect(libraryTitle).toBeVisible({ timeout: 10000 });
    await expect(historyTabBtn).not.toBeVisible();

    // 7. Save screenshot of active Easy Mode
    await page.screenshot({
      path: path.join(screenshotsDir, "easy-mode-active.png"),
    });
    console.log("Easy Mode active screenshot saved.");

    // 8. Re-open settings via header settings button
    await settingsNavBtn.click();
    await page.waitForTimeout(500);

    // 9. Toggle Easy Mode to OFF
    console.log("Disabling Easy Mode...");
    await easyModeToggle.click();
    await page.waitForTimeout(500);

    // 10. Verify typical tabs are restored (e.g. History tab visible)
    await expect(historyTabBtn).toBeVisible({ timeout: 10000 });

    // 11. Save screenshot of restored standard mode
    await page.screenshot({
      path: path.join(screenshotsDir, "easy-mode-deactivated.png"),
    });
    console.log("Easy Mode E2E test passed successfully!");
  });
});
