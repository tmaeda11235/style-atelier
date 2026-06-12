import { MoreHorizontal } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"

import { IconButton } from "../atoms/IconButton"
import { Tooltip } from "../atoms/Tooltip"
import {
  EditMenuIcon,
  QuickSendMenuIcon,
  ShareMenuIcon
} from "./CardThumbnailIcons"

interface MenuItemProps {
  onClick: (e: React.MouseEvent) => void
  label: string
  testId: string
  icon: React.ReactNode
}

function MenuItem({ onClick, label, testId, icon }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-[11px] text-slate-700 hover:bg-slate-50 transition-colors">
      {icon}
      {label}
    </button>
  )
}

interface MoreMenuProps {
  isMenuOpen: boolean
  setIsMenuOpen: (open: boolean) => void
  onQuickSendClick?: (e: React.MouseEvent) => void
  onEditClick?: (e: React.MouseEvent) => void
  onShareClick?: (e: React.MouseEvent) => void
}

interface MenuConfigItem {
  show: boolean
  click?: (e: React.MouseEvent) => void
  label: string
  id: string
  icon: React.ReactNode
}

function getMenuItemsConfig(
  t: (key: string) => string,
  onQuickSendClick?: (e: React.MouseEvent) => void,
  onEditClick?: (e: React.MouseEvent) => void,
  onShareClick?: (e: React.MouseEvent) => void
): MenuConfigItem[] {
  return [
    {
      show: !!onQuickSendClick,
      click: onQuickSendClick,
      label: t("libraryTab.tooltips.quickSend"),
      id: "more-quick-send-button",
      icon: QuickSendMenuIcon
    },
    {
      show: !!onEditClick,
      click: onEditClick,
      label: t("libraryTab.tooltips.edit"),
      id: "more-edit-card-button",
      icon: EditMenuIcon
    },
    {
      show: !!onShareClick,
      click: onShareClick,
      label: t("libraryTab.tooltips.share"),
      id: "more-share-card-button",
      icon: ShareMenuIcon
    }
  ]
}

function MoreMenu(props: MoreMenuProps) {
  const { t } = useTranslation()
  if (!props.isMenuOpen) return null
  const items = getMenuItemsConfig(
    t,
    props.onQuickSendClick,
    props.onEditClick,
    props.onShareClick
  )
  const close = () => props.setIsMenuOpen(false)
  return (
    <>
      <div
        className="fixed inset-0 z-30"
        onClick={(e) => {
          e.stopPropagation()
          close()
        }}
      />
      <div className="absolute bottom-8 right-0 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-36 z-40 animate-in fade-in zoom-in-95 duration-100">
        {items.map(
          (item) =>
            item.show && (
              <MenuItem
                key={item.id}
                label={item.label}
                testId={item.id}
                icon={item.icon}
                onClick={(e) => {
                  e.stopPropagation()
                  item.click!(e)
                  close()
                }}
              />
            )
        )}
      </div>
    </>
  )
}

interface MoreMenuButtonProps {
  isPinned?: boolean
  onPinClick?: (e: React.MouseEvent) => void
  onQuickSendClick?: (e: React.MouseEvent) => void
  onDeleteClick?: (e: React.MouseEvent) => void
  onInjectClick?: (e: React.MouseEvent) => void
  onEditClick?: (e: React.MouseEvent) => void
  onShareClick?: (e: React.MouseEvent) => void
}

export function MoreMenuButton({
  props,
  isMenuOpen,
  setIsMenuOpen
}: {
  props: MoreMenuButtonProps
  isMenuOpen: boolean
  setIsMenuOpen: (open: boolean) => void
}) {
  const { t } = useTranslation()
  if (!props.onShareClick && !props.onEditClick && !props.onQuickSendClick)
    return null
  return (
    <div className="show-on-narrow relative">
      <Tooltip content={t("libraryTab.tooltips.more")} position="top">
        <IconButton
          variant="white"
          size="sm"
          data-testid="more-actions-button"
          onClick={(e) => {
            e.stopPropagation()
            setIsMenuOpen(!isMenuOpen)
          }}
          className="shadow-md hover:scale-110 active:scale-95 transition-transform duration-200"
          title="">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </IconButton>
      </Tooltip>
      <MoreMenu
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        onQuickSendClick={props.onQuickSendClick}
        onEditClick={props.onEditClick}
        onShareClick={props.onShareClick}
      />
    </div>
  )
}
