/* eslint-disable max-lines-per-function */
import React, { useEffect, useState } from "react"

import { LandingPage } from "./components/LandingPage"
import { MobilePwaViewer } from "./components/MobilePwaViewer"
import { PrivacyPolicy } from "./components/PrivacyPolicy"

type ViewType = "lp" | "pwa" | "privacy"

export const App: React.FC = () => {
  const [view, setView] = useState<ViewType>(() => {
    if (typeof window === "undefined") return "lp"

    // 1. Check URL hash
    const hash = window.location.hash
    if (hash === "#privacy") return "privacy"
    if (hash === "#pwa") return "pwa"
    if (hash === "#lp") return "lp"

    // 2. Check URL parameters (card data or pwa flag or mock flag)
    const params = new URLSearchParams(window.location.search)
    if (
      params.get("p") ||
      params.get("data") ||
      params.get("pwa") === "true" ||
      params.get("mock") === "true"
    ) {
      return "pwa"
    }

    // 3. Fallback based on device screen width
    return window.innerWidth < 480 ? "pwa" : "lp"
  })

  // Synchronize hash with view state
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash === "#privacy") {
        setView("privacy")
      } else if (hash === "#pwa") {
        setView("pwa")
      } else if (hash === "#lp") {
        setView("lp")
      }
    }

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  const navigateTo = (newView: ViewType) => {
    setView(newView)
    if (newView === "lp") {
      window.location.hash = "#lp"
    } else if (newView === "pwa") {
      window.location.hash = "#pwa"
    } else if (newView === "privacy") {
      window.location.hash = "#privacy"
    }
  }

  switch (view) {
    case "privacy":
      return (
        <PrivacyPolicy
          onBack={() => navigateTo("lp")}
          onTryPwa={() => navigateTo("pwa")}
        />
      )
    case "pwa":
      return <MobilePwaViewer onBackToLp={() => navigateTo("lp")} />
    case "lp":
    default:
      return (
        <LandingPage
          onTryPwa={() => navigateTo("pwa")}
          onViewPrivacy={() => navigateTo("privacy")}
        />
      )
  }
}
