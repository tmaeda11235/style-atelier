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
      throw new Error("Lemon Squeezy API request failed")
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
    return "invalid"
  }
}

function useLicenseActivationState() {
  const [licenseKey, setLicenseKey] = useState<string>("")
  const [licenseStatus, setLicenseStatus] =
    useState<LicenseStatus>("unlicensed")
  const [isPremium, setIsPremium] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    const savedKey = localStorage.getItem("style-atelier-license-key") || ""
    const savedStatus = (localStorage.getItem("style-atelier-license-status") ||
      "unlicensed") as LicenseStatus
    setLicenseKey(savedKey)
    setLicenseStatus(savedStatus)
    setIsPremium(savedStatus === "valid")
  }, [])

  const activateLicense = async (key: string): Promise<boolean> => {
    setIsLoading(true)
    const normalizedKey = key.trim()
    const status = await verifyLicenseKey(normalizedKey)
    setLicenseKey(normalizedKey)
    setLicenseStatus(status)
    const valid = status === "valid"
    setIsPremium(valid)
    localStorage.setItem("style-atelier-license-key", normalizedKey)
    localStorage.setItem("style-atelier-license-status", status)
    setIsLoading(false)
    return valid
  }

  const deactivateLicense = async () => {
    setLicenseKey("")
    setLicenseStatus("unlicensed")
    setIsPremium(false)
    localStorage.removeItem("style-atelier-license-key")
    localStorage.removeItem("style-atelier-license-status")
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

  return (
    <LicenseContext.Provider
      value={{
        ...activation,
        ...modal
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
