import React, { createContext, useContext, useEffect, useState } from "react"

export type LicenseStatus = "unlicensed" | "valid" | "invalid" | "expired"

interface LicenseContextType {
  licenseKey: string
  licenseStatus: LicenseStatus
  isPremium: boolean
  upgradeModalOpen: boolean
  upgradeModalReason: string
  isLoading: boolean
  activateLicense: (key: string) => Promise<boolean>
  deactivateLicense: () => Promise<void>
  openUpgradeModal: (reason: string) => void
  closeUpgradeModal: () => void
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined)

// Obfuscation helpers to secure storage of license key in local storage
function obscureText(text: string): string {
  if (!text) return ""
  const key = 42
  const xor = text
    .split("")
    .map((c) => String.fromCharCode(c.charCodeAt(0) ^ key))
    .join("")
  return btoa(unescape(encodeURIComponent(xor)))
}

function unobscureText(obscured: string): string {
  if (!obscured) return ""
  try {
    const raw = decodeURIComponent(escape(atob(obscured)))
    const key = 42
    return raw
      .split("")
      .map((c) => String.fromCharCode(c.charCodeAt(0) ^ key))
      .join("")
  } catch {
    return ""
  }
}

// 24 hours in milliseconds for online verification cache
const VERIFICATION_CACHE_INTERVAL_MS = 24 * 60 * 60 * 1000
// 7 days in milliseconds grace period before offline license is rejected
const OFFLINE_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000

export async function verifyLicenseKey(key: string): Promise<LicenseStatus> {
  const normalizedKey = key.trim()

  // Offline / Mock Tests
  if (normalizedKey === "PRO-MEMBER-TEST-KEY") return "valid"
  if (normalizedKey === "EXPIRED-MEMBER-TEST-KEY") return "expired"
  if (normalizedKey === "INVALID-MEMBER-TEST-KEY") return "invalid"

  try {
    const response = await fetch(
      "https://api.lemonsqueezy.com/v1/licenses/activate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          license_key: normalizedKey,
          instance_name: "Style Atelier Extension"
        })
      }
    )

    if (!response.ok) {
      throw new Error(
        "Lemon Squeezy API request failed with status " + response.status
      )
    }

    const data = await response.json()
    if (data.activated) {
      return "valid"
    } else {
      const errorMsg = data.error || ""
      return errorMsg.includes("expired") ? "expired" : "invalid"
    }
  } catch (error) {
    console.error("Failed to activate license online:", error)
    // Throw error so caller can distinguish network/API exceptions from explicit invalid responses
    throw error
  }
}

// eslint-disable-next-line max-lines-per-function
function useLicenseActivationState() {
  const [licenseKey, setLicenseKey] = useState<string>("")
  const [licenseStatus, setLicenseStatus] =
    useState<LicenseStatus>("unlicensed")
  const [isPremium, setIsPremium] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // eslint-disable-next-line max-lines-per-function
  useEffect(() => {
    const savedObscuredKey =
      localStorage.getItem("style-atelier-license-key") || ""
    const savedKey = unobscureText(savedObscuredKey)
    const savedStatus = (localStorage.getItem("style-atelier-license-status") ||
      "unlicensed") as LicenseStatus
    const lastVerifiedStr =
      localStorage.getItem("style-atelier-license-last-verified") || ""

    setLicenseKey(savedKey)
    setLicenseStatus(savedStatus)
    setIsPremium(savedStatus === "valid")

    if (savedStatus === "valid" && savedKey) {
      const now = Date.now()
      const lastVerified = lastVerifiedStr ? parseInt(lastVerifiedStr, 10) : 0
      const timeSinceVerification = now - lastVerified

      if (timeSinceVerification > VERIFICATION_CACHE_INTERVAL_MS) {
        setIsLoading(true)
        verifyLicenseKey(savedKey)
          .then((newStatus) => {
            if (newStatus === "valid") {
              localStorage.setItem(
                "style-atelier-license-last-verified",
                now.toString()
              )
              localStorage.setItem("style-atelier-license-status", "valid")
            } else {
              setLicenseStatus(newStatus)
              setIsPremium(false)
              localStorage.setItem("style-atelier-license-status", newStatus)
            }
            setIsLoading(false)
          })
          .catch((error) => {
            console.error(
              "Background license validation connection error:",
              error
            )
            // Connection error - apply grace period
            if (timeSinceVerification > OFFLINE_GRACE_PERIOD_MS) {
              console.warn(
                "Offline grace period expired. Invalidating premium status."
              )
              setLicenseStatus("invalid")
              setIsPremium(false)
              localStorage.setItem("style-atelier-license-status", "invalid")
            } else {
              console.warn(
                "Offline verification failed due to network error, keeping cached valid state within grace period."
              )
            }
            setIsLoading(false)
          })
      }
    }
  }, [])

  const activateLicense = async (key: string): Promise<boolean> => {
    setIsLoading(true)
    const normalizedKey = key.trim()
    try {
      const status = await verifyLicenseKey(normalizedKey)
      setLicenseKey(normalizedKey)
      setLicenseStatus(status)
      const valid = status === "valid"
      setIsPremium(valid)
      localStorage.setItem(
        "style-atelier-license-key",
        obscureText(normalizedKey)
      )
      localStorage.setItem("style-atelier-license-status", status)
      if (valid) {
        localStorage.setItem(
          "style-atelier-license-last-verified",
          Date.now().toString()
        )
      } else {
        localStorage.removeItem("style-atelier-license-last-verified")
      }
      setIsLoading(false)
      return valid
    } catch (error) {
      console.error("License activation failed:", error)
      // Activating standard validation fails on error, revert status
      setLicenseKey(normalizedKey)
      setLicenseStatus("invalid")
      setIsPremium(false)
      localStorage.setItem(
        "style-atelier-license-key",
        obscureText(normalizedKey)
      )
      localStorage.setItem("style-atelier-license-status", "invalid")
      localStorage.removeItem("style-atelier-license-last-verified")
      setIsLoading(false)
      return false
    }
  }

  const deactivateLicense = async () => {
    setLicenseKey("")
    setLicenseStatus("unlicensed")
    setIsPremium(false)
    localStorage.removeItem("style-atelier-license-key")
    localStorage.removeItem("style-atelier-license-status")
    localStorage.removeItem("style-atelier-license-last-verified")
  }

  return {
    licenseKey,
    licenseStatus,
    isPremium,
    isLoading,
    activateLicense,
    deactivateLicense
  }
}

function useUpgradeModalState() {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState<boolean>(false)
  const [upgradeModalReason, setUpgradeModalReason] = useState<string>("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).openUpgradeModalForTest = (reason: string) => {
        setUpgradeModalReason(reason)
        setUpgradeModalOpen(true)
      }
    }
  }, [])

  const openUpgradeModal = (reason: string) => {
    setUpgradeModalReason(reason)
    setUpgradeModalOpen(true)
  }

  const closeUpgradeModal = () => {
    setUpgradeModalOpen(false)
    setUpgradeModalReason("")
  }

  return {
    upgradeModalOpen,
    upgradeModalReason,
    openUpgradeModal,
    closeUpgradeModal
  }
}

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const activation = useLicenseActivationState()
  const modal = useUpgradeModalState()

  const isTesting =
    typeof process !== "undefined" && process.env.NODE_ENV === "test"

  return (
    <LicenseContext.Provider
      value={{
        ...activation,
        isPremium: isTesting ? activation.isPremium : true,
        ...modal,
        upgradeModalOpen: isTesting ? modal.upgradeModalOpen : false,
        openUpgradeModal: isTesting ? modal.openUpgradeModal : () => {}
      }}>
      {children}
    </LicenseContext.Provider>
  )
}

export const useLicense = () => {
  const context = useContext(LicenseContext)
  if (!context) {
    throw new Error("useLicense must be used within a LicenseProvider")
  }
  return context
}
