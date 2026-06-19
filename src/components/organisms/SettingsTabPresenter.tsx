import { Settings2 } from "lucide-react"
import React from "react"

import { useWebLlm } from "../../hooks/useWebLlm"
import { AiStatusBadge } from "../atoms/AiStatusBadge"
import { GDriveSyncStrategyDialog } from "../molecules/GDriveSyncStrategyDialog"
import { SettingsAccordionItem } from "../molecules/SettingsAccordionItem"
import { P2PSyncUI } from "../P2PSyncUI"
import { CloudSyncSection } from "./CloudSyncSection"
import { LicenseSettingsSection } from "./LicenseSettingsSection"
import { MaintenanceContent } from "./MaintenanceContent"
import { UiPreferencesSection } from "./UiPreferencesSection"
import { WebLlmSettingsSection } from "./WebLlmSettingsSection"

interface SettingsTabPresenterProps {
  t: any
  currentEasyMode: boolean
  openSections: Record<string, boolean>
  onToggleUi: () => void
  onToggleCloud: () => void
  onToggleMaintenance: () => void
  onToggleWebLlm: () => void
  onToggleLicense: () => void
  uiProps: any
  cloudProps: any
  maintenanceProps: any
  isWarningOpen: boolean
  handleConfirmSyncStrategy: (strategy: any) => void
  setIsWarningOpen: (open: boolean) => void
}

function SettingsTabHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 bg-blue-500/10 rounded-lg">
        <Settings2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>
      <h2 className="text-base font-bold text-text-primary">{title}</h2>
    </div>
  )
}

function UiAccordionItem({ isOpen, onToggle, title, uiProps }: any) {
  return (
    <SettingsAccordionItem
      id="settings-accordion-ui"
      title={title}
      isOpen={isOpen}
      onToggle={onToggle}>
      <UiPreferencesSection {...uiProps} />
    </SettingsAccordionItem>
  )
}

function CloudSyncAccordionItem({ isOpen, onToggle, title, cloudProps }: any) {
  return (
    <SettingsAccordionItem
      id="settings-accordion-cloud"
      title={title}
      isOpen={isOpen}
      onToggle={onToggle}>
      <div className="p-5 space-y-6 animate-in slide-in-from-top-2 duration-250">
        <CloudSyncSection {...cloudProps} />
      </div>
    </SettingsAccordionItem>
  )
}

function P2PSyncAccordionItem({ isOpen, onToggle, title, tP2p }: any) {
  return (
    <SettingsAccordionItem
      id="settings-accordion-p2p"
      title={title}
      isOpen={isOpen}
      onToggle={onToggle}>
      <div className="p-5 animate-in slide-in-from-top-2 duration-250">
        <P2PSyncUI t={tP2p} />
      </div>
    </SettingsAccordionItem>
  )
}

function MaintenanceAccordionItem({
  isOpen,
  onToggle,
  title,
  maintenanceProps
}: any) {
  return (
    <SettingsAccordionItem
      id="settings-accordion-maintenance"
      title={title}
      isOpen={isOpen}
      onToggle={onToggle}>
      <MaintenanceContent {...maintenanceProps} />
    </SettingsAccordionItem>
  )
}

function WebLlmAccordionItem({ isOpen, onToggle, title }: any) {
  const { status } = useWebLlm()
  return (
    <SettingsAccordionItem
      id="settings-accordion-webllm"
      title={title}
      isOpen={isOpen}
      onToggle={onToggle}
      headerAccessory={
        <AiStatusBadge status={status} className="normal-case" />
      }>
      <div id="webllm-settings-section-wrapper">
        <WebLlmSettingsSection />
      </div>
    </SettingsAccordionItem>
  )
}

function LicenseAccordionItem({ isOpen, onToggle, title }: any) {
  return (
    <SettingsAccordionItem
      id="settings-accordion-license"
      title={title}
      isOpen={isOpen}
      onToggle={onToggle}>
      <LicenseSettingsSection />
    </SettingsAccordionItem>
  )
}

function AccordionSections({
  openSections,
  onToggleUi,
  onToggleCloud,
  onToggleMaintenance,
  onToggleWebLlm,
  onToggleLicense,
  uiProps,
  cloudProps,
  maintenanceProps,
  p2pOpen,
  setP2pOpen,
  t
}: any) {
  return (
    <>
      <UiAccordionItem
        isOpen={openSections.ui}
        onToggle={onToggleUi}
        title={t.uiGroupTitle}
        uiProps={uiProps}
      />
      <LicenseAccordionItem
        isOpen={openSections.license}
        onToggle={onToggleLicense}
        title={t.premiumGroupTitle}
      />
      <CloudSyncAccordionItem
        isOpen={openSections.cloud}
        onToggle={onToggleCloud}
        title={t.cloudGroupTitle}
        cloudProps={cloudProps}
      />
      <P2PSyncAccordionItem
        isOpen={p2pOpen}
        onToggle={() => setP2pOpen(!p2pOpen)}
        title={t.p2pGroupTitle || "📲 Local P2P Sync (Direct)"}
        tP2p={t.p2p}
      />
      <MaintenanceAccordionItem
        isOpen={openSections.maintenance}
        onToggle={onToggleMaintenance}
        title={t.maintenanceGroupTitle}
        maintenanceProps={maintenanceProps}
      />
      <WebLlmAccordionItem
        isOpen={openSections.webllm}
        onToggle={onToggleWebLlm}
        title={t.webLlmGroupTitle}
      />
    </>
  )
}

export function SettingsTabPresenter(props: SettingsTabPresenterProps) {
  const [p2pOpen, setP2pOpen] = React.useState(false)
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {!props.currentEasyMode && <SettingsTabHeader title={props.t.title} />}
      <AccordionSections {...props} p2pOpen={p2pOpen} setP2pOpen={setP2pOpen} />
      <GDriveSyncStrategyDialog
        isOpen={props.isWarningOpen}
        onConfirm={props.handleConfirmSyncStrategy}
        onCancel={() => props.setIsWarningOpen(false)}
        t={props.t}
      />
    </div>
  )
}
