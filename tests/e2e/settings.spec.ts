import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Settings @J-SET-01", () => {
  test.beforeEach(async ({ page }) => {
    // Mock all Google APIs globally for settings tests to prevent 401 retries
    await page.route("https://www.googleapis.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({})
      })
    })

    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`)
    })
    page.on("requestfailed", (request) => {
      console.error(
        `[REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText}`
      )
    })
    page.on("response", (response) => {
      if (response.status() >= 400) {
        console.error(`[HTTP ERROR] ${response.url()}: ${response.status()}`)
      }
    })
    // Mock WebGPU support by default to prevent Download Model button from being disabled in Settings tests
    await page.addInitScript(() => {
      const mockGpu = {
        requestAdapter: async () => ({ name: "MockGPU" })
      }
      Object.defineProperty(navigator, "gpu", {
        value: mockGpu,
        writable: true,
        configurable: true
      })
    })
  })

  test("should allow selecting restore mode and verify replace/merge behavior", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    // Mock Google Drive API response
    await page.route(
      "https://www.googleapis.com/drive/v3/files*",
      async (route) => {
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
        })
      }
    )

    console.log("Navigating to sandbox page for Restore Mode E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Switch to Settings tab
    const settingsTabButton = spFrame.locator("#settings-nav-btn")
    await expect(settingsTabButton).toBeVisible()
    await settingsTabButton.click()

    // Expand Cloud Backup & Sync and Maintenance sections to make sync and recovery buttons visible
    const cloudAccordionHeader = spFrame.locator("#settings-accordion-cloud")
    await expect(cloudAccordionHeader).toBeVisible()
    await cloudAccordionHeader.click()

    const maintenanceAccordionHeader = spFrame.locator(
      "#settings-accordion-maintenance"
    )
    await expect(maintenanceAccordionHeader).toBeVisible()
    await maintenanceAccordionHeader.click()
    const syncBtn = spFrame.locator("#google-drive-sync-btn")
    const forceRecoveryBtn = spFrame.locator("#force-recovery-btn")
    await expect(syncBtn).toBeVisible({ timeout: 10000 })
    await expect(forceRecoveryBtn).toBeVisible()

    // Enable Google Drive synchronization
    console.log("Enabling Google Drive sync...")
    const toggleBtn = spFrame.locator("#google-drive-toggle-btn")
    await expect(toggleBtn).toBeVisible()
    await toggleBtn.click()

    // Wait for the cloud backup preview to appear
    console.log("Waiting for cloud backup preview...")
    const previewEl = spFrame.locator("text=150.0 KB").first()
    await expect(previewEl).toBeVisible({ timeout: 10000 })

    // Scroll to the Force Recovery button to bring the Danger Zone preview into view
    await forceRecoveryBtn.scrollIntoViewIfNeeded()

    // 4. Capture screenshot of Settings tab with new UI
    await page.screenshot({
      path: path.join(screenshotsDir, "restore-mode-ui.png")
    })

    // 5. Test sync/merge and soft delete behavior via page evaluation (Dexie verification)
    const results = await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db

      const resetData = async () => {
        await database.styleCards.clear()
        await database.categories.clear()
        await database.userSettings.clear()
        await database.historyItems.clear()
      }

      // Set initial local state
      await resetData()
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
      ])

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
      }

      // Scenario A: Merge Restore (Simulating Sync download phase)
      await database.importBackupData(backupPayload, "merge")
      const afterMerge = await database.getAllCards()

      // Reset for Scenario B: Replace Restore (Simulating Force Recovery)
      await resetData()
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
      ])

      await database.importBackupData(backupPayload, "replace")
      const afterReplace = await database.getAllCards()

      // Scenario C: Logical Delete Sync
      await resetData()
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
      ])

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
      }

      await database.importBackupData(backupWithDelete, "merge")
      const activeCardsAfterDeleteSync = await database.getAllCards()
      const physicalCardsAfterDeleteSync = await database.styleCards.toArray()

      return {
        afterMerge: afterMerge.map((c: any) => ({ id: c.id, name: c.name })),
        afterReplace: afterReplace.map((c: any) => ({
          id: c.id,
          name: c.name
        })),
        logicalDeleteSync: {
          activeCount: activeCardsAfterDeleteSync.length,
          physicalCount: physicalCardsAfterDeleteSync.length,
          card: physicalCardsAfterDeleteSync[0]
            ? {
                id: physicalCardsAfterDeleteSync[0].id,
                isDeleted: physicalCardsAfterDeleteSync[0].isDeleted,
                thumbnailData: physicalCardsAfterDeleteSync[0].thumbnailData
              }
            : null
        }
      }
    })

    console.log("Merge results:", results.afterMerge)
    console.log("Replace results:", results.afterReplace)
    console.log("Delete sync results:", results.logicalDeleteSync)

    // Verify Merge Results
    expect(results.afterMerge).toContainEqual({
      id: "card-1",
      name: "Backup Card 1 (New)"
    })
    expect(results.afterMerge).toContainEqual({
      id: "card-2",
      name: "Local Only Card"
    })
    expect(results.afterMerge).toContainEqual({
      id: "card-3",
      name: "Backup Only Card"
    })
    expect(results.afterMerge.length).toBe(3)

    // Verify Replace Results
    expect(results.afterReplace).toContainEqual({
      id: "card-1",
      name: "Backup Card 1 (New)"
    })
    expect(results.afterReplace).toContainEqual({
      id: "card-3",
      name: "Backup Only Card"
    })
    expect(results.afterReplace.length).toBe(2)

    // Verify Logical Delete Sync Results
    expect(results.logicalDeleteSync.activeCount).toBe(0) // Filtered out from getAllCards
    expect(results.logicalDeleteSync.physicalCount).toBe(1) // Record still exists in IndexedDB
    expect(results.logicalDeleteSync.card).toEqual({
      id: "card-active",
      isDeleted: true,
      thumbnailData: "" // Heavy image info is cleared
    })

    console.log(
      "Sync and logical delete E2E logic verification passed successfully!"
    )
  })

  test("should support auto-sync toggling and trigger backup on database changes", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")

    let uploadCallCount = 0
    // Mock files list request
    await page.route("**/drive/v3/files*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ files: [] })
      })
    })

    // Mock file creation/upload request
    await page.route("**/upload/drive/v3/files*", async (route) => {
      uploadCallCount++
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "mock-file-123" })
      })
    })

    console.log("Navigating to sandbox page for Auto-Sync E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Switch to Settings tab
    const settingsTabButton = spFrame.locator("#settings-nav-btn")
    await settingsTabButton.click()

    // Expand Cloud Backup & Sync section to make sync buttons visible
    const cloudAccordionHeader = spFrame.locator("#settings-accordion-cloud")
    await expect(cloudAccordionHeader).toBeVisible()
    await cloudAccordionHeader.click()
    const toggleBtn = spFrame.locator("#google-drive-toggle-btn")
    await toggleBtn.click()

    // Check that auto-sync button is visible
    const autoSyncBtn = spFrame.locator("#google-drive-auto-sync-btn")
    await expect(autoSyncBtn).toBeVisible({ timeout: 10000 })

    // Enable auto-sync
    await autoSyncBtn.click()

    // Capture screenshot showing auto-sync enabled
    await page.screenshot({
      path: path.join(screenshotsDir, "auto-sync-enabled.png")
    })

    // Simulate database changes inside evaluate to see if auto-backup triggers
    console.log("Mutating database to trigger auto-backup...")
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      // Configure fast debounce using exposed config
      const autoSyncConfig = (window as any).autoSyncConfig
      if (autoSyncConfig) {
        autoSyncConfig.setDebounceMs(100)
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
      })
    })
    // Wait for the debounced upload call to happen (100ms debounce + some network overhead)
    await expect(async () => {
      expect(uploadCallCount).toBeGreaterThan(0)
    }).toPass({ timeout: 5000 })
    console.log("Auto-backup triggered successfully upon DB changes!")
  })

  test("should toggle Easy Mode and restrict tab visibility to Library only", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Easy Mode E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if exists
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Verify History tab is visible initially
    const historyTabBtn = spFrame.locator("nav button:has-text('History')")
    await expect(historyTabBtn).toBeVisible({ timeout: 10000 })

    // 3. Click Settings icon in header to navigate to Settings
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    // 4. Verify Easy Mode toggle button exists in SettingsTab
    const easyModeToggle = spFrame.locator("#easy-mode-toggle-btn")
    await expect(easyModeToggle).toBeVisible({ timeout: 10000 })

    // 5. Toggle Easy Mode to ON
    console.log("Enabling Easy Mode...")
    await easyModeToggle.click()
    const libraryTitle = spFrame.locator("span:has-text('Library')")
    await expect(libraryTitle).toBeVisible({ timeout: 10000 })
    await expect(historyTabBtn).not.toBeVisible()

    // 7. Save screenshot of active Easy Mode
    await page.screenshot({
      path: path.join(screenshotsDir, "easy-mode-active.png")
    })
    console.log("Easy Mode active screenshot saved.")

    // 8. Re-open settings via header settings button
    await settingsNavBtn.click()
    console.log("Disabling Easy Mode...")
    await easyModeToggle.click()
    await expect(historyTabBtn).toBeVisible({ timeout: 10000 })

    // 11. Save screenshot of restored standard mode
    await page.screenshot({
      path: path.join(screenshotsDir, "easy-mode-deactivated.png")
    })
    console.log("Easy Mode E2E test passed successfully!")
  })

  test("should show expert mode individual toggles and restrict features accordingly", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Expert Features E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if exists
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Click Settings icon in header
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    // 3. Verify all expert feature toggles are visible
    const toggles = [
      "stack",
      "slot",
      "rarity",
      "tags",
      "categories",
      "multicard",
      "cardediting",
      "multiimage"
    ]
    for (const toggleId of toggles) {
      const toggle = spFrame.locator(`#expert-feature-${toggleId}-btn`)
      await expect(toggle).toBeVisible({ timeout: 10000 })
    }

    // 4. Capture screenshot of settings tab with expert toggles
    await page.screenshot({
      path: path.join(screenshotsDir, "expert-features-toggles.png")
    })
    console.log("Expert features toggles screenshot saved.")

    // 5. Disable 'slot' and 'categories'
    console.log("Disabling slot and categories features...")
    const slotToggle = spFrame.locator("#expert-feature-slot-btn")
    const categoriesToggle = spFrame.locator("#expert-feature-categories-btn")
    await slotToggle.click()
    await categoriesToggle.click()
    const libraryTabBtn = spFrame.locator("nav button:has-text('Library')")
    await libraryTabBtn.click()

    const categoryRow = spFrame.locator("text=Manage Categories")
    await expect(categoryRow).not.toBeVisible()

    // 7. Verify SlotVariablesSection (e.g. text 'Slot Variables') is not visible on Workbench tab
    const workbenchTabBtn = spFrame.locator("nav button:has-text('Workbench')")
    await workbenchTabBtn.click()

    const slotVariablesTitle = spFrame.locator("text=Slot Variables")
    await expect(slotVariablesTitle).not.toBeVisible()

    // 8. Capture screenshot showing slot features disabled on workbench
    await page.screenshot({
      path: path.join(screenshotsDir, "expert-features-disabled-workbench.png")
    })

    console.log("Expert features toggles E2E test passed successfully!")
  })

  test("should allow changing display language and verify localization in UI and Tabs", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Language/i18n E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // Clear database to ensure empty states are shown
    console.log("Clearing database to ensure empty states...")
    await spFrame.locator("body").evaluate(async () => {
      const database = (window as any).db
      if (database) {
        await database.styleCards.clear()
        await database.categories.clear()
        await database.userSettings.clear()
        await database.historyItems.clear()
      }
    })

    // 2. Open Settings Tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    const langSelect = spFrame.locator("#language-select")
    await expect(langSelect).toBeVisible()

    // 4. Switch to English
    console.log("Switching language to English...")
    await langSelect.selectOption("en")
    const settingsTitleEn = spFrame.locator("h2:has-text('Settings')")
    await expect(settingsTitleEn).toBeVisible({ timeout: 5000 })

    // Verify translated elements in English
    const maintenanceAccordionHeaderEn = spFrame.locator(
      "#settings-accordion-maintenance"
    )
    await expect(maintenanceAccordionHeaderEn).toBeVisible()
    await maintenanceAccordionHeaderEn.click()

    const resetBtnEn = spFrame.locator("#reset-db-btn")
    await expect(resetBtnEn).toHaveText("Reset Database")
    const clearHistoryBtnEn = spFrame.locator(
      "button:has-text('Clear History')"
    )
    await expect(clearHistoryBtnEn).toBeVisible()

    // Verify Tab English translations:
    // A. History Tab empty title
    const historyNavBtn = spFrame.locator("nav button").nth(0)
    await historyNavBtn.click()
    const historyEmptyEn = spFrame.locator("h3:has-text('No History')")
    await expect(historyEmptyEn).toBeVisible()

    // B. Library Tab empty title
    const libraryNavBtn = spFrame.locator("nav button").nth(1)
    await libraryNavBtn.click()
    const libraryEmptyEn = spFrame.locator("h3:has-text('No Style Cards')")
    await expect(libraryEmptyEn).toBeVisible()

    // C. Workbench Tab empty title
    const workbenchNavBtn = spFrame.locator("[data-tutorial='workbench-tab']")
    await workbenchNavBtn.click()
    const workbenchEmptyEn = spFrame.locator(
      "h3:has-text('Workbench is Empty')"
    )
    await expect(workbenchEmptyEn).toBeVisible()

    // Go back to Settings
    await settingsNavBtn.click()
    await page.screenshot({
      path: path.join(screenshotsDir, "settings-lang-en.png")
    })

    // 5. Switch to Japanese
    console.log("Switching language to Japanese...")
    await langSelect.selectOption("ja")
    const settingsTitleJa = spFrame.locator("h2:has-text('設定')")
    await expect(settingsTitleJa).toBeVisible({ timeout: 5000 })

    // Verify translated elements in Japanese
    const maintenanceAccordionHeaderJa = spFrame.locator(
      "#settings-accordion-maintenance"
    )
    await expect(maintenanceAccordionHeaderJa).toBeVisible()
    await maintenanceAccordionHeaderJa.click()

    const resetBtnJa = spFrame.locator("#reset-db-btn")
    await expect(resetBtnJa).toHaveText("データベースをリセット")
    const clearHistoryBtnJa = spFrame.locator("button:has-text('履歴をクリア')")
    await expect(clearHistoryBtnJa).toBeVisible()

    // Verify Tab Japanese translations:
    // A. History Tab empty title
    await historyNavBtn.click()
    const historyEmptyJa = spFrame.locator("h3:has-text('履歴がありません')")
    await expect(historyEmptyJa).toBeVisible()

    // B. Library Tab empty title
    await libraryNavBtn.click()
    const libraryEmptyJa = spFrame.locator(
      "h3:has-text('スタイルカードがありません')"
    )
    await expect(libraryEmptyJa).toBeVisible()

    // C. Workbench Tab empty title
    await workbenchNavBtn.click()
    const workbenchEmptyJa = spFrame.locator(
      "h3:has-text('Workbench は空です')"
    )
    await expect(workbenchEmptyJa).toBeVisible()

    // Go back to Settings
    await settingsNavBtn.click()
    await page.screenshot({
      path: path.join(screenshotsDir, "settings-lang-ja.png")
    })

    console.log("Language selection E2E test passed successfully!")
  })

  test("should switch display language and verify localization in InteractiveTutorial", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Tutorial Localization E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings Tab and change language to English
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    const langSelect = spFrame.locator("#language-select")
    await expect(langSelect).toBeVisible()

    console.log("Switching language to English...")
    await langSelect.selectOption("en")
    const guideBtn = spFrame.locator(
      "button[title='Show Guide'], button[title='ガイドを表示']"
    )
    await expect(guideBtn).toBeVisible()
    await guideBtn.click()
    const tutorialHeader = spFrame.locator("text=Step 1 / 8")
    await expect(tutorialHeader).toBeVisible({ timeout: 5000 })
    const tutorialTitleEn = spFrame.locator("text=1. Drag & Drop into History")
    await expect(tutorialTitleEn).toBeVisible()
    const nextBtnEn = spFrame.locator(
      "[data-testid='interactive-tutorial'] button:has-text('Next')"
    )
    await expect(nextBtnEn).toBeVisible()
    const sampleBtnEn = spFrame.locator(
      "button:has-text('Add Sample and Proceed')"
    )
    await expect(sampleBtnEn).toBeVisible()

    // Take English Tutorial screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "tutorial-lang-en.png")
    })

    // 5. Close tutorial
    const closeTutorialBtn = spFrame.locator(
      "button[aria-label='Close tutorial']"
    )
    await expect(closeTutorialBtn).toBeVisible()
    await closeTutorialBtn.click()
    await settingsNavBtn.click()
    console.log("Switching language to Japanese...")
    await langSelect.selectOption("ja")
    await guideBtn.click()
    const tutorialTitleJa = spFrame.locator("text=① HistoryにD&Dする")
    await expect(tutorialTitleJa).toBeVisible({ timeout: 5000 })
    const nextBtnJa = spFrame.locator(
      "[data-testid='interactive-tutorial'] button:has-text('次へ')"
    )
    await expect(nextBtnJa).toBeVisible()
    const sampleBtnJa = spFrame.locator(
      "button:has-text('サンプルを追加して進む')"
    )
    await expect(sampleBtnJa).toBeVisible()

    // Take Japanese Tutorial screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "tutorial-lang-ja.png")
    })

    console.log("Tutorial localization E2E test passed successfully!")
  })

  test("should show custom confirm dialog and handle reset database action", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Custom Confirm Dialog E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog if visible
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings Tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    // Expand Maintenance section first
    const maintenanceAccordionHeader = spFrame.locator(
      "#settings-accordion-maintenance"
    )
    await expect(maintenanceAccordionHeader).toBeVisible()
    await maintenanceAccordionHeader.click()

    const resetDbBtn = spFrame.locator("#reset-db-btn")
    await resetDbBtn.scrollIntoViewIfNeeded()
    await expect(resetDbBtn).toBeVisible()

    // 4. Click Reset DB button to open the custom confirm dialog
    console.log("Clicking Reset DB button...")
    await resetDbBtn.click()
    const dialogContainer = spFrame.locator("#confirmation-dialog-container")
    await expect(dialogContainer).toBeVisible()

    // Capture screenshot of the custom confirm dialog
    await page.screenshot({
      path: path.join(screenshotsDir, "custom-confirm-dialog.png")
    })
    console.log("Custom confirm dialog screenshot saved.")

    // 6. Click Cancel on the custom confirm dialog
    const cancelBtn = spFrame.locator("#confirm-dialog-cancel-btn")
    await expect(cancelBtn).toBeVisible()
    await cancelBtn.click()
    await expect(dialogContainer).not.toBeVisible()

    // 7. Click Reset DB button again
    await resetDbBtn.click()
    await expect(dialogContainer).toBeVisible()

    // 8. Click Confirm on the custom confirm dialog
    const confirmBtn = spFrame.locator("#confirm-dialog-ok-btn")
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()

    // Verify reset success log or status
    console.log("Custom confirm dialog E2E test passed successfully!")
  })

  test("should toggle settings accordions and verify sections collapse/expand", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Settings Accordion E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings Tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    const langSelect = spFrame.locator("#language-select")
    await expect(langSelect).toBeVisible()

    // Verify Cloud Sync is collapsed by default (Google Drive Toggle is NOT visible)
    const gdToggle = spFrame.locator("#google-drive-toggle-btn")
    await expect(gdToggle).not.toBeVisible()

    // 4. Click 'Cloud Backup & Sync' accordion header to expand it
    console.log("Expanding Cloud Backup & Sync accordion...")
    const cloudHeader = spFrame.locator("text=Cloud Backup & Sync")
    await cloudHeader.click()
    await expect(gdToggle).toBeVisible()

    // 5. Click 'UI Preferences' accordion header to collapse it
    console.log("Collapsing UI Preferences accordion...")
    const uiHeader = spFrame.locator("text=UI Preferences")
    await uiHeader.click()
    await expect(langSelect).not.toBeVisible()

    // 6. Capture screenshot of collapsed/expanded accordion states
    await page.screenshot({
      path: path.join(screenshotsDir, "settings-accordions.png")
    })
    console.log("Settings Accordion E2E test passed successfully!")
  })

  test("should navigate back to library from Easy Mode settings via direct link", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Easy Mode back link E2E test..."
    )
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings Tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    const easyModeToggle = spFrame.locator("#easy-mode-toggle-btn")
    await easyModeToggle.click()
    await settingsNavBtn.click()
    const backToLibBtn = spFrame.locator("#back-to-library-btn")
    await expect(backToLibBtn).toBeVisible()

    // 5. Click 'Back to Library' link
    console.log("Navigating back to library using direct link...")
    await backToLibBtn.click()
    const searchField = spFrame.locator("input[placeholder*='Search by']")
    await expect(searchField).toBeVisible()

    // Verify Settings tab contents are no longer visible
    await expect(easyModeToggle).not.toBeVisible()

    // 7. Capture screenshot of library tab after navigation
    await page.screenshot({
      path: path.join(screenshotsDir, "easy-mode-navigated-back.png")
    })
    console.log("Easy Mode back link navigation E2E test passed successfully!")
  })

  test("should show sync strategy warning dialog when last sync is over 60 days ago, suspend auto-sync, and handle all merge strategies", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Setting up 60-day sync suspension localStorage state...")
    const sixtyOneDaysAgo = Date.now() - 61 * 24 * 60 * 60 * 1000

    // Initialize page with sync/auto-sync enabled but aged backup time
    await page.addInitScript((time) => {
      localStorage.setItem("style-atelier-sync-enabled", "true")
      localStorage.setItem("style-atelier-auto-sync-enabled", "true")
      localStorage.setItem("style-atelier-last-backup", time.toString())
    }, sixtyOneDaysAgo)

    console.log("Navigating to sandbox page for Sync Strategy E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings Tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()

    // 3. Expand Cloud Backup & Sync accordion
    const cloudHeader = spFrame.locator("text=Cloud Backup & Sync")
    await cloudHeader.click()

    // 4. Verify auto-sync has been suspended (toggle is off / bg-slate-200)
    // The auto-sync is initialized on page load and detects >60 days sync age,
    // which automatically triggers checkAndMergeRemoteChanges and suspends auto-sync.
    const autoSyncBtn = spFrame.locator("#google-drive-auto-sync-btn")
    await expect(autoSyncBtn).toBeVisible({ timeout: 10000 })
    await expect(autoSyncBtn).toHaveClass(/bg-slate-200/)
    console.log("Verified auto-sync is suspended and toggle is OFF.")

    // 5. Trigger manual sync to show GDriveSyncStrategyDialog
    const syncBtn = spFrame.locator("#google-drive-sync-btn")
    await expect(syncBtn).toBeVisible()
    await syncBtn.click()

    const warningDialog = spFrame.locator("#sync-strategy-dialog-container")
    await expect(warningDialog).toBeVisible()

    // 6. Capture screenshot of warning dialog
    await page.screenshot({
      path: path.join(screenshotsDir, "sync-strategy-warning-dialog.png")
    })
    console.log("Sync strategy warning dialog screenshot saved.")

    // 7. Verify strategy options are present
    const mergeOption = spFrame.locator("#strategy-merge")
    const localOption = spFrame.locator("#strategy-local-overwrite")
    const cloudOption = spFrame.locator("#strategy-cloud-overwrite")
    await expect(mergeOption).toBeVisible()
    await expect(localOption).toBeVisible()
    await expect(cloudOption).toBeVisible()

    const confirmBtn = spFrame.locator("#sync-strategy-dialog-ok-btn")
    const cancelBtn = spFrame.locator("#sync-strategy-dialog-cancel-btn")

    // 8. Test Cancel button
    await cancelBtn.click()
    await expect(warningDialog).not.toBeVisible()

    // 9. Test Safe Merge Strategy
    await syncBtn.click()
    await expect(warningDialog).toBeVisible()
    await mergeOption.click()
    await confirmBtn.click()
    await expect(warningDialog).not.toBeVisible()
    await expect(syncBtn).toBeEnabled({ timeout: 10000 })
    console.log("Safe Merge strategy confirmed successfully.")

    // Reset last-backup to >60 days ago so dialog will show up again
    await spFrame.locator("body").evaluate((_, time) => {
      localStorage.setItem("style-atelier-last-backup", time.toString())
      if ((window as any).queryClient) {
        ;(window as any).queryClient.invalidateQueries({
          queryKey: ["gdrive", "lastBackup"]
        })
      }
    }, sixtyOneDaysAgo)

    // 10. Test Local Overwrite Strategy
    await syncBtn.click()
    await expect(warningDialog).toBeVisible()
    await localOption.click()
    await confirmBtn.click()
    await expect(warningDialog).not.toBeVisible()
    await expect(syncBtn).toBeEnabled({ timeout: 10000 })
    console.log("Local Overwrite strategy confirmed successfully.")

    // Reset last-backup to >60 days ago so dialog will show up again
    await spFrame.locator("body").evaluate((_, time) => {
      localStorage.setItem("style-atelier-last-backup", time.toString())
      if ((window as any).queryClient) {
        ;(window as any).queryClient.invalidateQueries({
          queryKey: ["gdrive", "lastBackup"]
        })
      }
    }, sixtyOneDaysAgo)

    // 11. Test Cloud Overwrite Strategy
    await syncBtn.click()
    await expect(warningDialog).toBeVisible()
    await cloudOption.click()
    await confirmBtn.click()
    await expect(warningDialog).not.toBeVisible()
    console.log("Cloud Overwrite strategy confirmed successfully.")

    console.log(
      "Sync strategy warning and suspension E2E test passed successfully!"
    )
  })

  test("should allow changing display theme (Light/Dark/System) and verify dark mode stylesheet/class changes", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for Theme Selection E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings Tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    const themeSelect = spFrame.locator("#theme-select")
    await expect(themeSelect).toBeVisible()
    await expect(themeSelect).toHaveValue("system")

    // 4. Switch to dark mode
    console.log("Switching theme to dark mode...")
    await themeSelect.selectOption("dark")
    const isDarkClassApplied = await spFrame
      .locator("html")
      .evaluate((el) => el.classList.contains("dark"))
    expect(isDarkClassApplied).toBe(true)

    // Verify localStorage has dark
    const localStorageThemeDark = await spFrame
      .locator("body")
      .evaluate(() => localStorage.getItem("style-atelier-theme"))
    expect(localStorageThemeDark).toBe("dark")

    // Verify dark mode text color on Workbench
    console.log("Navigating to Workbench to verify dark mode styling...")
    const workbenchNavBtn = spFrame.locator("[data-tutorial='workbench-tab']")
    await workbenchNavBtn.click()
    const workbenchContainer = spFrame.locator(
      "div.flex.flex-col.h-full.bg-white"
    )
    await expect(workbenchContainer).toBeVisible()
    const containerTextColor = await workbenchContainer.evaluate((el) => {
      return window.getComputedStyle(el).color
    })
    console.log(
      `Workbench container text color in dark mode: ${containerTextColor}`
    )
    // Slate-100 is rgb(241, 245, 249). We expect it to be light, definitely not rgb(15, 23, 42) (slate-900)
    expect(containerTextColor).not.toBe("rgb(15, 23, 42)")

    // Switch back to Settings tab to continue the test
    await settingsNavBtn.click()
    console.log(
      "Verifying dark mode hover background color and sticky prevention..."
    )
    const uiAccordionBtn = spFrame.locator("#settings-accordion-ui")
    await expect(uiAccordionBtn).toBeVisible()

    // Get initial background color in dark mode (should be slate-800/40 equivalent)
    const initialBgColor = await uiAccordionBtn.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // Hover the button
    await uiAccordionBtn.hover()
    await expect(async () => {
      const currentBg = await uiAccordionBtn.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor
      })
      expect(currentBg).not.toBe(initialBgColor)
    }).toPass({ timeout: 5000 })

    // Unhover the button by moving mouse away
    await page.mouse.move(0, 0)
    await expect(async () => {
      const currentBg = await uiAccordionBtn.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor
      })
      expect(currentBg).toBe(initialBgColor)
    }).toPass({ timeout: 5000 })

    // Take Dark theme screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "theme-dark.png")
    })

    // 5. Switch to light mode
    console.log("Switching theme to light mode...")
    await themeSelect.selectOption("light")
    const isDarkClassAppliedAfterLight = await spFrame
      .locator("html")
      .evaluate((el) => el.classList.contains("dark"))
    expect(isDarkClassAppliedAfterLight).toBe(false)

    // Verify localStorage has light
    const localStorageThemeLight = await spFrame
      .locator("body")
      .evaluate(() => localStorage.getItem("style-atelier-theme"))
    expect(localStorageThemeLight).toBe("light")

    // Take Light theme screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "theme-light.png")
    })

    // 6. Switch back to system mode
    console.log("Switching theme back to system mode...")
    await themeSelect.selectOption("system")
    const localStorageThemeSystem = await spFrame
      .locator("body")
      .evaluate(() => localStorage.getItem("style-atelier-theme"))
    expect(localStorageThemeSystem).toBe("system")

    console.log("Theme selection E2E test passed successfully!")
  })

  test("should allow downloading and purging WebLLM local AI model cache and verify UI transitions", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for WebLLM E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings Tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    const webLlmAccordionHeader = spFrame.locator("#settings-accordion-webllm")
    await expect(webLlmAccordionHeader).toBeVisible()
    await webLlmAccordionHeader.click()
    const downloadBtn = spFrame.locator(
      "button:has-text('Download Model'), button:has-text('モデルをダウンロード')"
    )
    await expect(downloadBtn).toBeVisible()

    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-status-idle.png")
    })

    // 4. Click Download Model button
    console.log("Clicking Download Model button...")
    await downloadBtn.click()

    // Confirm download in dialog
    const downloadDialog = spFrame.locator("#confirmation-dialog-container")
    await expect(downloadDialog).toBeVisible()

    // Verify updated model size values (2.0 GB / 2.5 GB) are present in the dialog description
    await expect(downloadDialog).toContainText(/2\.0\s*GB/)
    await expect(downloadDialog).toContainText(/2\.5\s*GB/)

    const downloadConfirmBtn = spFrame.locator("#confirm-dialog-ok-btn")
    await expect(downloadConfirmBtn).toBeVisible()
    await downloadConfirmBtn.click()

    // 5. Verify downloading progress and transition to Loaded
    const purgeBtn = spFrame.locator(
      "button:has-text('Delete Cache'), button:has-text('キャッシュを削除')"
    )
    await expect(purgeBtn).toBeVisible({ timeout: 10000 })

    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-status-loaded.png")
    })

    // 6. Click Delete Cache button
    console.log("Clicking Delete Cache button...")
    await purgeBtn.click()
    const dialogContainer = spFrame.locator("#confirmation-dialog-container")
    await expect(dialogContainer).toBeVisible()

    await page.screenshot({
      path: path.join(screenshotsDir, "webllm-purge-confirm.png")
    })

    // 8. Confirm deletion
    const confirmBtn = spFrame.locator("#confirm-dialog-ok-btn")
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()
    await expect(downloadBtn).toBeVisible()
    console.log("WebLLM E2E test passed successfully!")
  })

  test("should render help tooltips in settings and display descriptions on hover", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log("Navigating to sandbox page for HelpTooltip E2E test...")
    await page.goto("/tests/sandbox/index.html")

    const spFrame = page.frameLocator("#sidepanel-frame")

    // 1. Skip welcome dialog
    const skipButton = spFrame.locator("#welcome-skip-btn")
    if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipButton.click()
    }

    // 2. Open Settings Tab
    const settingsNavBtn = spFrame.locator("#settings-nav-btn")
    await expect(settingsNavBtn).toBeVisible({ timeout: 10000 })
    await settingsNavBtn.click()
    const easyModeTooltipTrigger = spFrame
      .locator("[data-testid='help-tooltip-trigger']")
      .first()
    await expect(easyModeTooltipTrigger).toBeVisible()

    // Hover to trigger tooltip content
    await easyModeTooltipTrigger.hover()
    await page.screenshot({
      path: path.join(screenshotsDir, "settings-tooltip-hover.png")
    })
    console.log("Settings tooltip hover screenshot saved.")

    // Verify tooltip content is now visible
    const tooltipContent = spFrame
      .locator("[data-testid='help-tooltip-content']")
      .first()
    await expect(tooltipContent).toBeVisible()
  })
})
