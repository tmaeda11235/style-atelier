
export interface StyleCard {
  // --- Basic Identity ---
  id: string;             // UUID (e.g., "550e8400-e29b...")
  name: string;           // カード名 (e.g., "Neon Cyber Cat")
  createdAt: number;      // Timestamp
  updatedAt: number;      // Timestamp for versioning

  // --- The Recipe (Minting Result) ---
  // プロンプトを「トークン（バブル）」の配列として保持
  promptSegments: PromptSegment[]; 
  
  // パラメータの構造化データ（合成やマスク用）
  parameters: {
    ar?: string;          // Aspect Ratio (e.g., "16:9")
    sref?: string[];      // Style Reference URLs
    cref?: string[];      // Character Reference URLs
    p?: string[];         // Personalization Codes
    stylize?: number;     // --s 0-1000
    chaos?: number;       // --c 0-100
    weird?: number;       // --w 0-3000
    tile?: boolean;       // --tile
    raw?: boolean;        // --style raw
  };

  // --- Security & Privacy (Sealing) ---
  masking: {
    isSrefHidden: boolean; // trueなら共有時にsrefを隠す
    isPHidden: boolean;    // trueならpersonalizeを隠す
  };

  // --- TCG Attributes (Metagame) ---
  tier: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  isFavorite: boolean;
  isPinned?: boolean;      // 手札（Hand）に入っているか
  usageCount: number;     // 熟練度算出用
  tags: string[];         // 検索用タグ (Visual Indexing用)
  dominantColor: string;  // 主要色のHex (e.g., "#FF00FF")

  // --- Visuals (Skin) ---
  thumbnailData: string;  // Base64 (軽量化されたサムネイル)
  frameId: string;        // 適用されているフレームID (e.g., "frame_holo_v1")

  // --- Genealogy (Ancestry) ---
  genealogy: {
    generation: number;       // 世代数 (Gen 1, Gen 2...)
    parentIds: string[];      // 親カードのIDリスト（合成時は複数）
    originCreatorId?: string; // 始祖のID（署名）
    mutationNote?: string;    // "Mixed with Watercolor" などの自動メモ
  };
}

// プロンプトの構成要素（バブル）
export type PromptSegment = 
  | { type: 'text'; value: string }                // 通常テキスト
  | { type: 'slot'; label: string; default: string } // 変数（穴あけ箇所）
  | { type: 'chip'; kind: 'sref' | 'cref'; value: string }; // 参照画像チップ


export interface Deck {
  id: string;
  name: string;        // e.g., "Project: Manga A"
  cardIds: string[];   // カードの並び順も保持
  themeColor?: string; // デッキのアイコン色
  lastUsedAt: number;  // 最近使った順にソートするため
}

export interface HistoryItem {
  id: string;             // Job ID from MJ
  fullCommand: string;    // 生のプロンプト全文
  imageUrl: string;       // 生成画像のURL (CDN)
  localImageBlob?: Blob;  // キャッシュ用（一定期間で削除）
  timestamp: number;
  relatedCardId?: string; // この生成に使われたカードID（あれば）
}

export interface UserSettings {
  userId: string;         // 匿名ID or UUID
  isPro: boolean;         // 課金フラグ
  unlockedSkins: string[]; // 購入済みスキンIDリスト
  branding: {
    enabled: boolean;
    customLogo?: string;  // Base64
    signatureName?: string;
  };
}