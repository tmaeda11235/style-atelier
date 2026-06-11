import React, { useEffect, useState } from "react"

import type { HistoryItem } from "../../lib/db-schema"
import { Button } from "../atoms/Button"

/**
 * プロンプトの実行履歴を表示するカードコンポーネント。
 *
 * @param {Object} props
 * @param {HistoryItem} props.item - 履歴データ
 * @param {(item: HistoryItem) => void} props.onMintClick - ミンティング開始ボタンクリック時のハンドラ
 * @param {string} [props.className=''] - 追加のカスタムクラス
 */
interface HistoryCardProps {
  item: HistoryItem
  onMintClick: (item: HistoryItem) => void
  onImageCached?: (id: string, blob: Blob) => Promise<any>
  className?: string
}

export function HistoryCard({
  item,
  onMintClick,
  onImageCached,
  className = ""
}: HistoryCardProps) {
  const [imgSrc, setImgSrc] = useState<string>(item.imageUrl)

  useEffect(() => {
    let objectUrl: string | null = null

    if (item.localImageBlob) {
      objectUrl = URL.createObjectURL(item.localImageBlob)
      setImgSrc(objectUrl)
    } else {
      setImgSrc(item.imageUrl)

      const fetchAndCacheImage = async () => {
        try {
          const response = await fetch(item.imageUrl)
          if (response.ok) {
            const blob = await response.blob()
            if (onImageCached) {
              await onImageCached(item.id, blob)
            }
          }
        } catch (err) {
          console.error("Failed to dynamically cache history image:", err)
        }
      }

      fetchAndCacheImage()
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [item.localImageBlob, item.imageUrl, item.id, onImageCached])

  return (
    <div
      className={`bg-surface border border-border-primary rounded-lg shadow-sm flex gap-3 p-2 ${className}`}>
      <img
        src={imgSrc}
        alt={item.id}
        className="w-24 h-24 rounded object-cover"
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-xs text-text-secondary line-clamp-3 my-1"
          title={item.fullCommand}>
          {item.fullCommand}
        </p>
        <Button
          variant="primary"
          size="xs"
          onClick={() => onMintClick(item)}
          className="mt-2">
          Mint Card
        </Button>
      </div>
    </div>
  )
}
