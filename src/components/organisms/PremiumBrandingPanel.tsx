import { Globe, ImageIcon, Lock, ShoppingBag, Trash2 } from "lucide-react"
import React from "react"

import { SocialLinksForm } from "../../features/premium/components/SocialLinksForm"
import type { UserSettings } from "../../shared/lib/db-schema"
import { Button } from "../atoms/Button"
import { Input } from "../atoms/Input"

interface PremiumBrandingPanelProps {
  isPremium: boolean
  userSettings: UserSettings | null
  onUpdateBranding: (changes: Partial<UserSettings["branding"]>) => void
  onUpgrade: () => void
}

function UpgradeBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div
      onClick={onUpgrade}
      className="cursor-pointer border border-dashed border-border-primary rounded-lg p-4 bg-muted hover:bg-surface-hover transition-colors flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden group"
      data-testid="premium-branding-upgrade-banner">
      <Lock className="w-5 h-5 text-text-secondary group-hover:text-blue-500 transition-colors" />
      <span className="text-xs font-bold text-text-primary">
        Premium Custom Branding (Pro Only)
      </span>
      <span className="text-[10px] text-text-secondary max-w-[200px]">
        Upload custom logo, add social links, and opt-out of default branding.
      </span>
    </div>
  )
}

function readAndSetLogo(
  file: File | undefined,
  onUpdateBranding: (changes: Partial<UserSettings["branding"]>) => void
) {
  if (!file) return
  if (file.size > 1024 * 1024) {
    alert("Image size must be less than 1MB.")
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === "string") {
      onUpdateBranding({ customLogo: reader.result })
    }
  }
  reader.readAsDataURL(file)
}

interface ActiveLogoDisplayProps {
  customLogo: string
  onRemove: () => void
}

function ActiveLogoDisplay({ customLogo, onRemove }: ActiveLogoDisplayProps) {
  return (
    <div className="flex items-center justify-between p-2 bg-surface border border-border-primary rounded-lg">
      <div className="flex items-center gap-2">
        <div
          style={{ backgroundImage: `url(${customLogo})` }}
          className="h-6 w-16 bg-contain bg-no-repeat bg-center border border-border-primary rounded"
          aria-label="Custom brand logo"
        />
        <span className="text-[10px] text-text-secondary">Active</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
        data-testid="delete-custom-logo-button">
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

interface LogoUploaderProps {
  customLogo?: string
  onUpdateBranding: (changes: Partial<UserSettings["branding"]>) => void
}

function LogoUploader({ customLogo, onUpdateBranding }: LogoUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false)

  if (customLogo) {
    return (
      <ActiveLogoDisplay
        customLogo={customLogo}
        onRemove={() => onUpdateBranding({ customLogo: undefined })}
      />
    )
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        readAndSetLogo(e.dataTransfer.files?.[0], onUpdateBranding)
      }}
      className={`border border-dashed rounded-lg p-3 bg-surface hover:bg-surface-hover transition-colors flex flex-col items-center justify-center text-center gap-1 cursor-pointer relative ${
        isDragging
          ? "border-blue-500 bg-blue-50/10 dark:bg-blue-950/10"
          : "border-border-primary"
      }`}
      data-testid="logo-dropzone">
      <Input
        type="file"
        variant="unstyled"
        accept="image/*"
        onChange={(e) => {
          setIsDragging(false)
          readAndSetLogo(e.target.files?.[0], onUpdateBranding)
        }}
        className="absolute inset-0 opacity-0 cursor-pointer"
        data-testid="logo-file-input"
      />
      <span className="text-[10px] font-medium text-text-secondary">
        Drag & drop logo, or{" "}
        <span className="text-blue-500 font-bold">browse</span>
      </span>
    </div>
  )
}

export function PremiumBrandingPanel({
  isPremium,
  userSettings,
  onUpdateBranding,
  onUpgrade
}: PremiumBrandingPanelProps) {
  const branding = userSettings?.branding || { enabled: false }

  if (!isPremium) {
    return <UpgradeBanner onUpgrade={onUpgrade} />
  }

  return (
    <div
      className="border border-border-primary rounded-lg p-4 bg-muted flex flex-col gap-4"
      data-testid="premium-branding-panel">
      <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 border-b border-border-primary pb-2">
        <ImageIcon className="w-4 h-4 text-blue-500" />
        <span>Branding Options</span>
      </h4>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-text-secondary">
          Custom Logo (Max 1MB)
        </span>
        <LogoUploader
          customLogo={branding.customLogo}
          onUpdateBranding={onUpdateBranding}
        />
      </div>

      <SocialLinksForm
        branding={branding}
        onUpdateBranding={onUpdateBranding}
      />
    </div>
  )
}
