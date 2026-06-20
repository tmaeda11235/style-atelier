import React from "react"
import { useTranslation } from "react-i18next"

import { IconButton } from "../atoms/IconButton"
import { Tooltip } from "../atoms/Tooltip"
import {
  DeleteIcon,
  EditIcon,
  InjectIcon,
  PinIcon,
  PinnedIcon,
  QuickSendIcon,
  ShareIcon
} from "./CardThumbnailIcons"
import { MoreMenuButton } from "./CardThumbnailMoreMenu"

interface IconButtonWithTooltipProps {
  show: boolean
  content: string
  variant: "blue" | "white" | "yellow" | "slate"
  onClick: (e: React.MouseEvent) => void
  icon: React.ReactNode
  className?: string
  dataTestId?: string
}

function IconButtonWithTooltip({
  show,
  content,
  variant,
  onClick,
  icon,
  className = "hide-on-narrow",
  dataTestId
}: IconButtonWithTooltipProps) {
  if (!show) return null
  return (
    <Tooltip content={content} position="top" className={className}>
      <IconButton
        variant={variant}
        size="sm"
        onClick={onClick}
        data-testid={dataTestId}
        className="shadow-md hover:scale-110 active:scale-95 transition-transform duration-200"
        title="">
        {icon}
      </IconButton>
    </Tooltip>
  )
}

interface CardThumbnailActionsProps {
  isPinned?: boolean
  onPinClick?: (e: React.MouseEvent) => void
  onQuickSendClick?: (e: React.MouseEvent) => void
  onDeleteClick?: (e: React.MouseEvent) => void
  onInjectClick?: (e: React.MouseEvent) => void
  onEditClick?: (e: React.MouseEvent) => void
  onShareClick?: (e: React.MouseEvent) => void
}

interface ButtonConfigItem {
  show: boolean
  content: string
  variant: "blue" | "white" | "yellow" | "slate"
  click: (e: React.MouseEvent) => void
  dataId?: string
  icon: React.ReactNode
}

function getButtonsConfig(
  t: any,
  props: CardThumbnailActionsProps
): ButtonConfigItem[] {
  return [
    {
      show: !!props.onInjectClick,
      content: t("libraryTab.tooltips.inject"),
      variant: "blue",
      click: props.onInjectClick!,
      dataId: "inject-card-button",
      icon: InjectIcon
    },
    {
      show: !!props.onShareClick,
      content: t("libraryTab.tooltips.share"),
      variant: "white",
      click: props.onShareClick!,
      dataId: "share-card-button",
      icon: ShareIcon
    },
    {
      show: !!props.onEditClick,
      content: t("libraryTab.tooltips.edit"),
      variant: "white",
      click: props.onEditClick!,
      dataId: "edit-card-button",
      icon: EditIcon
    },
    {
      show: !!props.onQuickSendClick,
      content: t("libraryTab.tooltips.quickSend"),
      variant: "blue",
      click: props.onQuickSendClick!,
      dataId: "quick-send-button",
      icon: QuickSendIcon
    }
  ]
}

function PinButton({ props }: { props: CardThumbnailActionsProps }) {
  const { t } = useTranslation() as any
  return (
    <IconButtonWithTooltip
      show={!!props.onPinClick}
      content={
        props.isPinned
          ? t("libraryTab.tooltips.unpin")
          : t("libraryTab.tooltips.pin")
      }
      variant={props.isPinned ? "yellow" : "white"}
      onClick={props.onPinClick!}
      className=""
      dataTestId="pin-card-button"
      icon={props.isPinned ? PinnedIcon : PinIcon}
    />
  )
}

function DeleteButton({
  onClick
}: {
  onClick?: (e: React.MouseEvent) => void
}) {
  if (!onClick) return null
  return (
    <IconButton
      variant="slate"
      size="xs"
      onClick={onClick}
      className="opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-transform duration-200">
      {DeleteIcon}
    </IconButton>
  )
}

export function CardThumbnailActions(props: CardThumbnailActionsProps) {
  const { t } = useTranslation() as any
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const buttons = getButtonsConfig(t, props)

  return (
    <div className="absolute bottom-1 right-1 flex gap-1.5 items-center z-20">
      {buttons.map(
        (btn, i) =>
          btn.show && (
            <IconButtonWithTooltip
              key={i}
              show={btn.show}
              content={btn.content}
              variant={btn.variant}
              onClick={btn.click}
              dataTestId={btn.dataId}
              icon={btn.icon}
            />
          )
      )}
      <MoreMenuButton
        props={props}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />
      <PinButton props={props} />
      <DeleteButton onClick={props.onDeleteClick} />
    </div>
  )
}
