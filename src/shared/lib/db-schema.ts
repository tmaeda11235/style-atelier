export interface CustomCategory {
  id: string // UUID or unique slug (e.g. "style")
  name: string // Category Name (e.g., "Style", "Cyberpunk")
  iconEmoji?: string // Default emoji icon (e.g. "🎨")
  iconUrl?: string // Custom base64 image URL selected from Library card
  iconCardId?: string // Reference to original source card
  createdAt: number
  updatedAt?: number // Timestamp for versioning/sync
  isDeleted?: boolean // Soft delete flag (Tombstone). Synchronizes deletions across devices. Subject to a 60-day sync window, after which it is purged.
  parentId?: string // Parent category ID for hierarchical folders
  coverImageUrl?: string // Custom cover image URL
  coverImagePath?: string // OPFS path to cover image
  theme?: string // Skin theme (e.g., classic, magic, cyberpunk, minimal)
}

export interface CardVersion {
  id: string // バージョンのユニークID (e.g. UUID)
  timestamp: number // 保存された日時
  promptSegments: PromptSegment[]
  parameters: StyleCard["parameters"]
  name: string // 保存時のカード名
}

export interface StyleCard {
  // --- Basic Identity ---
  id: string // UUID (e.g., "550e8400-e29b...")
  name: string // カード名 (e.g., "Neon Cyber Cat")
  createdAt: number // Timestamp
  updatedAt: number // Timestamp for versioning
  isDeleted?: boolean // Soft delete flag (Tombstone). Synchronizes deletions across devices. Subject to a 60-day sync window, after which it is purged.

  // --- The Recipe (Minting Result) ---
  // プロンプトを「トークン（バブル）」の配列として保持
  promptSegments: PromptSegment[]

  // パラメータの構造化データ（合成やマスク用）
  parameters: {
    ar?: string // Aspect Ratio (e.g., "16:9")
    sref?: string[] // Style Reference URLs
    cref?: string[] // Character Reference URLs
    p?: string[] // Personalization Codes
    imagePrompts?: string[] // Image Prompt URLs
    stylize?: number // --s 0-1000
    chaos?: number // --c 0-100
    weird?: number // --w 0-3000
    tile?: boolean // --tile
    raw?: boolean // --style raw
    version?: string // --v or --version
    niji?: string // --niji
  }

  // --- Security & Privacy (Sealing) ---
  masking: {
    isSrefHidden: boolean // trueなら共有時にsrefを隠す
    isPHidden: boolean // trueならpersonalizeを隠す
  }

  // --- TCG Attributes (Metagame) ---
  tier: "Common" | "Rare" | "Epic" | "Legendary"
  isFavorite: boolean
  isPinned?: boolean // 手札（Hand）に入っているか
  usageCount: number // 熟練度算出用
  tags: string[] // 検索用タグ (Visual Indexing用)
  category?: string // 選択されたカテゴリID
  dominantColor: string // 主要色のHex (e.g., "#FF00FF")
  accentColor?: string // アクセント色のHex (e.g., "#00FF00")

  // --- Visuals (Skin) ---
  thumbnailData?: string // Base64 (軽量化されたサムネイル)
  thumbnailPath?: string // OPFS path to thumbnail image
  frameId: string // 適用されているフレームID (e.g., "frame_holo_v1")

  // --- Genealogy (Ancestry) ---
  genealogy: {
    generation: number // 世代数 (Gen 1, Gen 2...)
    parentIds: string[] // 親カードのIDリスト（合成時は複数）
    originCreatorId?: string // 始祖のID（署名）
    mutationNote?: string // "Mixed with Watercolor" などの自動メモ
  }
  isVariable?: boolean // 変数カード（手札一時保持用）フラグ
  jobId?: string // Midjourney Job ID (for drag-and-drop merging)
  associatedJobIds?: string[] // Merged Midjourney Job IDs
  images?: string[] // Associated image URLs
  selectedThumbnails?: string[] // Selected image URLs for thumbnail display (up to 2)
  versionHistory?: CardVersion[] // 過去のプロンプト・パラメータ変更履歴（最大10件）
  weight?: number // 調合割合の重み (0.1 - 2.0)
  sortIndex?: number // バインダー内での並び順インデックス
}

// プロンプトの構成要素（バブル）
export type PromptSegment =
  | { type: "text"; value: string; weight?: number } // 通常テキスト
  | { type: "slot"; label: string; default: string; weight?: number } // 変数（穴あけ箇所）
  | { type: "chip"; kind: "sref" | "cref"; value: string; weight?: number } // 参照画像チップ

export interface HistoryItem {
  id: string // Job ID from MJ
  fullCommand: string // 生のプロンプト全文
  imageUrl: string // 生成画像のURL (CDN)
  localImageBlob?: Blob // キャッシュ用（一定期間で削除）
  timestamp: number
  relatedCardId?: string // この生成に使われたカードID（あれば）
}

export interface UserSettings {
  userId: string // 匿名ID or UUID
  isPro: boolean // 課金フラグ
  unlockedSkins: string[] // 購入済みスキンIDリスト
  branding: {
    enabled: boolean
    customLogo?: string // Base64
    signatureName?: string
    twitter?: string
    etsy?: string
    socialDisplayType?: "text" | "qr" | "none"
  }
}

export interface SlotHistoryItem {
  label: string // Variable label/name (e.g. "subject")
  values: string[] // Array of input values (up to 10)
  updatedAt: number // Timestamp for syncing
}

export interface ParameterAlias {
  id: string
  paramType: "p" | "sref" | "cref" | "imagePrompts"
  value: string
  alias: string
  folderId?: string // null / undefined for root
  createdAt: number
  updatedAt: number
}

export interface ParameterFolder {
  id: string
  name: string
  parentId?: string // null / undefined for root
  createdAt: number
}

export interface ImageSyncState {
  filePath: string // OPFS path (e.g., "images/cards/{id}.png")
  cardId?: string
  categoryId?: string
  hash: string
  cloudFileId?: string
  syncStatus: "synced" | "pending" | "deleted"
  updatedAt: number
}

export interface RecipeHistoryItem {
  id: string
  name: string
  timestamp: number
  cards: {
    id: string
    name: string
    weight: number
  }[]
  parameters: {
    ar?: string
    sref?: string[]
    cref?: string[]
    p?: string[]
    imagePrompts?: string[]
    stylize?: number
    chaos?: number
    weird?: number
    tile?: boolean
    raw?: boolean
    version?: string
    niji?: string
  }
  slotValues?: Record<string, string>
}

export interface NotionSyncState {
  cardId: string
  notionPageId: string
  lastSyncedAt: number
  lastSyncedHash: string
}

export interface NotionSyncQueueItem {
  cardId: string
  status: "pending" | "processing" | "completed" | "failed"
  retryCount: number
  error?: string
  createdAt: number
  updatedAt: number
}
