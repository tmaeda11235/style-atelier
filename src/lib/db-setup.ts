import Dexie, { type Table } from "dexie"

import type {
  CustomCategory,
  HistoryItem,
  ImageSyncState,
  ParameterAlias,
  ParameterFolder,
  RecipeHistoryItem,
  SlotHistoryItem,
  StyleCard,
  UserSettings
} from "./db-schema"
import { setupMigrations } from "./db/migrations"

export {
  upgradeToVersion6,
  upgradeToVersion8,
  upgradeToVersion10,
  upgradeToVersion11
} from "./db/migrations"

export class StyleAtelierDatabaseBase extends Dexie {
  styleCards!: Table<StyleCard, string>
  historyItems!: Table<HistoryItem, string>
  userSettings!: Table<UserSettings, string>
  categories!: Table<CustomCategory, string>
  slotHistory!: Table<SlotHistoryItem, string>
  parameterAliases!: Table<ParameterAlias, string>
  parameterFolders!: Table<ParameterFolder, string>
  imageSyncStates!: Table<ImageSyncState, string>
  recipeHistory!: Table<RecipeHistoryItem, string>

  constructor() {
    super("StyleAtelierDatabase")
    setupMigrations(this)
  }
}
