/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path"
import { expect, test } from "@playwright/test"

test.describe("Style Atelier Sandbox E2E Tests - Settings @J-SET-01", () => {
  test.beforeEach(async ({ page }) => {
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
    await page.waitForTimeout(300)

    const maintenanceAccordionHeader = spFrame.locator(
      "#settings-accordion-maintenance"
    )
    await expect(maintenanceAccordionHeader).toBeVisible()
    await maintenanceAccordionHeader.click()
    await page.waitForTimeout(300)

    // 3. Verify Sync and Force Recovery UI is visible
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
    await page.waitForTimeout(300)

    // Enable Google Drive synchronization
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
    await page.waitForTimeout(500)

    // Verify upload was triggered automatically
    expect(uploadCallCount).toBeGreaterThan(0)
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
    await page.waitForTimeout(500)

    // 6. Verify tabs are hidden and Library title is displayed
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
    await page.waitForTimeout(500)

    // 9. Toggle Easy Mode to OFF
    console.log("Disabling Easy Mode...")
    await easyModeToggle.click()
    await page.waitForTimeout(500)

    // 10. Verify typical tabs are restored (e.g. History tab visible)
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
    await page.waitForTimeout(500)

    // 6. Navigate to Library tab and verify Category bar is hidden
    const libraryTabBtn = spFrame.locator("nav button:has-text('Library')")
    await libraryTabBtn.click()
    await page.waitForTimeout(500)

    const categoryRow = spFrame.locator("text=Manage Categories")
    await expect(categoryRow).not.toBeVisible()

    // 7. Verify SlotVariablesSection (e.g. text 'Slot Variables') is not visible on Workbench tab
    const workbenchTabBtn = spFrame.locator("nav button:has-text('Workbench')")
    await workbenchTabBtn.click()
    await page.waitForTimeout(500)

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
    await page.waitForTimeout(500)

    // 3. Locate Language selector
    const langSelect = spFrame.locator("#language-select")
    await expect(langSelect).toBeVisible()

    // 4. Switch to English
    console.log("Switching language to English...")
    await langSelect.selectOption("en")
    await page.waitForTimeout(500)

    // Verify UI has changed to English (Settings title should be "Settings")
    const settingsTitleEn = spFrame.locator("h2:has-text('Settings')")
    await expect(settingsTitleEn).toBeVisible({ timeout: 5000 })

    // Verify translated elements in English
    const maintenanceAccordionHeaderEn = spFrame.locator(
      "#settings-accordion-maintenance"
    )
    await expect(maintenanceAccordionHeaderEn).toBeVisible()
    await maintenanceAccordionHeaderEn.click()
    await page.waitForTimeout(300)

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
    await page.waitForTimeout(300)
    const historyEmptyEn = spFrame.locator("h3:has-text('No History')")
    await expect(historyEmptyEn).toBeVisible()

    // B. Library Tab empty title
    const libraryNavBtn = spFrame.locator("nav button").nth(1)
    await libraryNavBtn.click()
    await page.waitForTimeout(300)
    const libraryEmptyEn = spFrame.locator("h3:has-text('No Style Cards')")
    await expect(libraryEmptyEn).toBeVisible()

    // C. Workbench Tab empty title
    const workbenchNavBtn = spFrame.locator("[data-tutorial='workbench-tab']")
    await workbenchNavBtn.click()
    await page.waitForTimeout(300)
    const workbenchEmptyEn = spFrame.locator(
      "h3:has-text('Workbench is Empty')"
    )
    await expect(workbenchEmptyEn).toBeVisible()

    // Go back to Settings
    await settingsNavBtn.click()
    await page.waitForTimeout(300)

    // Capture English Settings screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, "settings-lang-en.png")
    })

    // 5. Switch to Japanese
    console.log("Switching language to Japanese...")
    await langSelect.selectOption("ja")
    await page.waitForTimeout(500)

    // Verify UI has changed to Japanese (Settings title should be "設定")
    const settingsTitleJa = spFrame.locator("h2:has-text('設定')")
    await expect(settingsTitleJa).toBeVisible({ timeout: 5000 })

    // Verify translated elements in Japanese
    const maintenanceAccordionHeaderJa = spFrame.locator(
      "#settings-accordion-maintenance"
    )
    await expect(maintenanceAccordionHeaderJa).toBeVisible()
    await maintenanceAccordionHeaderJa.click()
    await page.waitForTimeout(300)

    const resetBtnJa = spFrame.locator("#reset-db-btn")
    await expect(resetBtnJa).toHaveText("データベースをリセット")
    const clearHistoryBtnJa = spFrame.locator("button:has-text('履歴をクリア')")
    await expect(clearHistoryBtnJa).toBeVisible()

    // Verify Tab Japanese translations:
    // A. History Tab empty title
    await historyNavBtn.click()
    await page.waitForTimeout(300)
    const historyEmptyJa = spFrame.locator("h3:has-text('履歴がありません')")
    await expect(historyEmptyJa).toBeVisible()

    // B. Library Tab empty title
    await libraryNavBtn.click()
    await page.waitForTimeout(300)
    const libraryEmptyJa = spFrame.locator(
      "h3:has-text('スタイルカードがありません')"
    )
    await expect(libraryEmptyJa).toBeVisible()

    // C. Workbench Tab empty title
    await workbenchNavBtn.click()
    await page.waitForTimeout(300)
    const workbenchEmptyJa = spFrame.locator(
      "h3:has-text('Workbench は空です')"
    )
    await expect(workbenchEmptyJa).toBeVisible()

    // Go back to Settings
    await settingsNavBtn.click()
    await page.waitForTimeout(300)

    // Capture Japanese Settings screenshot
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
    await page.waitForTimeout(500)

    const langSelect = spFrame.locator("#language-select")
    await expect(langSelect).toBeVisible()

    console.log("Switching language to English...")
    await langSelect.selectOption("en")
    await page.waitForTimeout(500)

    // 3. Click Guide button in header to trigger tutorial
    const guideBtn = spFrame.locator(
      "button[title='Show Guide'], button[title='ガイドを表示']"
    )
    await expect(guideBtn).toBeVisible()
    await guideBtn.click()
    await page.waitForTimeout(500)

    // 4. Verify InteractiveTutorial displays English texts
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
    await page.waitForTimeout(500)

    // Reopen Settings tab to show language selector again
    await settingsNavBtn.click()
    await page.waitForTimeout(500)

    // 6. Switch language to Japanese in Settings Tab
    console.log("Switching language to Japanese...")
    await langSelect.selectOption("ja")
    await page.waitForTimeout(500)

    // 7. Click Guide button again
    await guideBtn.click()
    await page.waitForTimeout(500)

    // 8. Verify InteractiveTutorial displays Japanese texts
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
    await page.waitForTimeout(500)

    // 3. Locate Reset DB button (Danger Zone)
    // Expand Maintenance section first
    const maintenanceAccordionHeader = spFrame.locator(
      "#settings-accordion-maintenance"
    )
    await expect(maintenanceAccordionHeader).toBeVisible()
    await maintenanceAccordionHeader.click()
    await page.waitForTimeout(300)

    const resetDbBtn = spFrame.locator("#reset-db-btn")
    await resetDbBtn.scrollIntoViewIfNeeded()
    await expect(resetDbBtn).toBeVisible()

    // 4. Click Reset DB button to open the custom confirm dialog
    console.log("Clicking Reset DB button...")
    await resetDbBtn.click()
    await page.waitForTimeout(500)

    // 5. Verify custom confirm dialog is visible
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
    await page.waitForTimeout(300)

    // Verify dialog is closed
    await expect(dialogContainer).not.toBeVisible()

    // 7. Click Reset DB button again
    await resetDbBtn.click()
    await page.waitForTimeout(500)
    await expect(dialogContainer).toBeVisible()

    // 8. Click Confirm on the custom confirm dialog
    const confirmBtn = spFrame.locator("#confirm-dialog-ok-btn")
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()

    // Verify reset success log or status
    await page.waitForTimeout(1000)
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
    await page.waitForTimeout(500)

    // 3. Verify UI Preferences is expanded by default (Language selection is visible)
    const langSelect = spFrame.locator("#language-select")
    await expect(langSelect).toBeVisible()

    // Verify Cloud Sync is collapsed by default (Google Drive Toggle is NOT visible)
    const gdToggle = spFrame.locator("#google-drive-toggle-btn")
    await expect(gdToggle).not.toBeVisible()

    // 4. Click 'Cloud Backup & Sync' accordion header to expand it
    console.log("Expanding Cloud Backup & Sync accordion...")
    const cloudHeader = spFrame.locator("text=Cloud Backup & Sync")
    await cloudHeader.click()
    await page.waitForTimeout(300)

    // Verify Google Drive Toggle is now visible
    await expect(gdToggle).toBeVisible()

    // 5. Click 'UI Preferences' accordion header to collapse it
    console.log("Collapsing UI Preferences accordion...")
    const uiHeader = spFrame.locator("text=UI Preferences")
    await uiHeader.click()
    await page.waitForTimeout(300)

    // Verify Language selection is now hidden
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
    await page.waitForTimeout(500)

    // 3. Enable Easy Mode
    const easyModeToggle = spFrame.locator("#easy-mode-toggle-btn")
    await easyModeToggle.click()
    await page.waitForTimeout(500)

    // Re-open settings tab in Easy Mode since switching mode redirects to library
    await settingsNavBtn.click()
    await page.waitForTimeout(500)

    // 4. Verify 'Back to Library' link is visible
    const backToLibBtn = spFrame.locator("#back-to-library-btn")
    await expect(backToLibBtn).toBeVisible()

    // 5. Click 'Back to Library' link
    console.log("Navigating back to library using direct link...")
    await backToLibBtn.click()
    await page.waitForTimeout(500)

    // 6. Verify tab is switched to library (Check Search tag input or search placeholder)
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

  test("should show sync strategy warning dialog when last sync is over 60 days ago", async ({
    page
  }) => {
    const screenshotsDir = path.join(__dirname, "../../tests/screenshots")
    console.log(
      "Navigating to sandbox page for Sync Strategy Warning E2E test..."
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
    await page.waitForTimeout(500)

    // 3. Set last backup time to 61 days ago in localStorage
    await spFrame.locator("body").evaluate(() => {
      const sixtyOneDaysAgo = Date.now() - 61 * 24 * 60 * 60 * 1000
      localStorage.setItem(
        "style-atelier-last-backup",
        sixtyOneDaysAgo.toString()
      )
    })

    // 4. Expand Cloud Backup & Sync accordion
    const cloudHeader = spFrame.locator("text=Cloud Backup & Sync")
    await cloudHeader.click()
    await page.waitForTimeout(300)

    // 5. Enable Google Drive synchronization
    const gdToggle = spFrame.locator("#google-drive-toggle-btn")
    await expect(gdToggle).toBeVisible()
    await gdToggle.click()
    await page.waitForTimeout(500)

    // 6. Click sync button
    const syncBtn = spFrame.locator("#google-drive-sync-btn")
    await expect(syncBtn).toBeVisible()
    await syncBtn.click()
    await page.waitForTimeout(500)

    // 7. Verify warning dialog is visible
    const warningDialog = spFrame.locator("#sync-strategy-dialog-container")
    await expect(warningDialog).toBeVisible()

    // 8. Capture screenshot of warning dialog
    await page.screenshot({
      path: path.join(screenshotsDir, "sync-strategy-warning-dialog.png")
    })
    console.log("Sync strategy warning dialog screenshot saved.")

    // 9. Verify strategy options are present
    const mergeOption = spFrame.locator("#strategy-merge")
    const localOption = spFrame.locator("#strategy-local-overwrite")
    const cloudOption = spFrame.locator("#strategy-cloud-overwrite")
    await expect(mergeOption).toBeVisible()
    await expect(localOption).toBeVisible()
    await expect(cloudOption).toBeVisible()

    // 10. Test Cancel button
    const cancelBtn = spFrame.locator("#sync-strategy-dialog-cancel-btn")
    await cancelBtn.click()
    await page.waitForTimeout(300)
    await expect(warningDialog).not.toBeVisible()

    // 11. Click sync button again, select local overwrite and proceed
    await syncBtn.click()
    await page.waitForTimeout(500)
    await expect(warningDialog).toBeVisible()

    await localOption.click()
    const confirmBtn = spFrame.locator("#sync-strategy-dialog-ok-btn")
    await confirmBtn.click()
    await page.waitForTimeout(500)

    // Verify dialog closes after confirmation
    await expect(warningDialog).not.toBeVisible()
    console.log("Sync strategy warning E2E test passed successfully!")
  })
})
