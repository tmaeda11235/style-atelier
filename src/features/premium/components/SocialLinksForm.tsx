import { Globe, ShoppingBag } from "lucide-react"
import React from "react"

import { Input } from "../../../components/atoms/Input"
import type { UserSettings } from "../../../shared/lib/db-schema"

interface SocialLinkInputProps {
  icon: React.ReactNode
  placeholder: string
  value: string
  onChange: (val: string) => void
  testId: string
}

function SocialLinkInput({
  icon,
  placeholder,
  value,
  onChange,
  testId
}: SocialLinkInputProps) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1"
        size="sm"
        data-testid={testId}
      />
    </div>
  )
}

interface SocialDisplaySelectProps {
  value: string
  onChange: (val: any) => void
  t?: any
}

function SocialDisplaySelect({ value, onChange, t }: SocialDisplaySelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[10px] font-bold text-text-secondary"
        htmlFor="social-display-select">
        {t?.socialLinksDisplayLabel || "Social Links Display"}
      </label>
      <select
        id="social-display-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 text-xs bg-surface border border-border-primary rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-text-primary"
        data-testid="social-display-select">
        <option value="none">{t?.socialDisplayNone || "None (Hide)"}</option>
        <option value="text">{t?.socialDisplayText || "Show as Text"}</option>
        <option value="qr">{t?.socialDisplayQr || "Show as QR Codes"}</option>
      </select>
    </div>
  )
}

interface SocialLinksFormProps {
  branding: Exclude<UserSettings["branding"], undefined>
  onUpdateBranding: (changes: Partial<UserSettings["branding"]>) => void
  t?: any
}

export function SocialLinksForm({
  branding,
  onUpdateBranding,
  t
}: SocialLinksFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <span className="text-[10px] font-bold text-text-secondary">
          {t?.socialLinksSectionTitle || "Social Links"}
        </span>

        <SocialLinkInput
          icon={<Globe className="w-4 h-4 text-text-secondary flex-shrink-0" />}
          placeholder={t?.twitterPlaceholder || "Twitter/X username"}
          value={branding.twitter || ""}
          onChange={(val) => onUpdateBranding({ twitter: val })}
          testId="twitter-input"
        />

        <SocialLinkInput
          icon={
            <ShoppingBag className="w-4 h-4 text-text-secondary flex-shrink-0" />
          }
          placeholder={t?.etsyPlaceholder || "Etsy shop name"}
          value={branding.etsy || ""}
          onChange={(val) => onUpdateBranding({ etsy: val })}
          testId="etsy-input"
        />
      </div>

      <SocialDisplaySelect
        value={branding.socialDisplayType || "none"}
        onChange={(val) => onUpdateBranding({ socialDisplayType: val })}
        t={t}
      />
    </div>
  )
}
