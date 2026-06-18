let deferredPrompt: any = null
let hasPrompted = false

export function initA2HS() {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone
  if (isStandalone) {
    return
  }

  // Dismiss control check
  const dismissedUntil = localStorage.getItem("a2hs-dismissed-until")
  if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
    return
  }

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  // Chrome on iOS contains 'CriOS', Safari on iOS doesn't contain 'Chrome' or 'CriOS'
  const isSafari =
    /Safari/.test(navigator.userAgent) &&
    !/Chrome/.test(navigator.userAgent) &&
    !/CriOS/.test(navigator.userAgent)

  setupA2HSEvents(isIOS, isSafari)
}

function setupA2HSEvents(isIOS: boolean, isSafari: boolean) {
  const androidDialog = document.getElementById("androidInstallDialog")
  const iosTooltip = document.getElementById("iosInstallTooltip")

  // 1. Android/Chrome prompt event listener
  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault()
    deferredPrompt = e
    setTimeout(showAndroidDialog, 3000)
  })

  // 2. iOS/Safari handler
  if (isIOS && isSafari) {
    setTimeout(showIosTooltip, 3000)
  }

  // 3. User interaction (Wow moment: 3D Flip)
  const cardContainer = document.getElementById("cardContainer")
  if (cardContainer) {
    cardContainer.addEventListener("click", () => {
      setTimeout(() => {
        if (deferredPrompt) {
          showAndroidDialog()
        } else if (isIOS && isSafari) {
          showIosTooltip()
        }
      }, 1000)
    })
  }

  setupA2HSControls(androidDialog, iosTooltip)
}

function showAndroidDialog() {
  if (hasPrompted) return
  hasPrompted = true
  const androidDialog = document.getElementById("androidInstallDialog")
  if (androidDialog) {
    androidDialog.style.display = "flex"
    void androidDialog.offsetHeight // force reflow
    androidDialog.classList.add("show")
  }
}

function showIosTooltip() {
  if (hasPrompted) return
  hasPrompted = true
  const iosTooltip = document.getElementById("iosInstallTooltip")
  if (iosTooltip) {
    iosTooltip.style.display = "block"
    void iosTooltip.offsetHeight // force reflow
    iosTooltip.classList.add("show")
  }
}

function setupA2HSControls(
  androidDialog: HTMLElement | null,
  iosTooltip: HTMLElement | null
) {
  const androidInstallBtn = document.getElementById("androidInstallBtn")
  const androidCloseBtn = document.getElementById("androidCloseBtn")
  const androidDismissBtn = document.getElementById("androidDismissBtn")
  const iosCloseBtn = document.getElementById("iosCloseBtn")

  const dismissA2HS = () => {
    const dismissedUntilTime = Date.now() + 14 * 24 * 60 * 60 * 1000
    localStorage.setItem("a2hs-dismissed-until", dismissedUntilTime.toString())

    if (androidDialog) {
      androidDialog.classList.remove("show")
      setTimeout(() => {
        androidDialog.style.display = "none"
      }, 300)
    }
    if (iosTooltip) {
      iosTooltip.classList.remove("show")
      setTimeout(() => {
        iosTooltip.style.display = "none"
      }, 300)
    }
  }

  if (androidInstallBtn) {
    androidInstallBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return
      deferredPrompt.prompt()
      try {
        const { outcome } = await deferredPrompt.userChoice
        console.log(`User response to the install prompt: ${outcome}`)
      } catch (err) {
        console.error("Install prompt error:", err)
      }
      deferredPrompt = null
      if (androidDialog) {
        androidDialog.classList.remove("show")
        androidDialog.style.display = "none"
      }
    })
  }

  if (androidCloseBtn) androidCloseBtn.addEventListener("click", dismissA2HS)
  if (androidDismissBtn)
    androidDismissBtn.addEventListener("click", dismissA2HS)
  if (iosCloseBtn) iosCloseBtn.addEventListener("click", dismissA2HS)
}
