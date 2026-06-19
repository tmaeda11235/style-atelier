import React, { useEffect, useState } from "react"

import {
  getNotionCredentials,
  saveNotionCredentials,
  validateNotionConnection
} from "../../../lib/notion/client"

export async function testConnection(
  apiKey: string,
  databaseId: string,
  t: any
): Promise<{ type: "success" | "error"; message: string }> {
  const success = await validateNotionConnection({
    apiKey: apiKey.trim(),
    databaseId: databaseId.trim()
  })
  return {
    type: success ? "success" : "error",
    message: success
      ? t.lang === "ja"
        ? "接続確認に成功しました。"
        : "Notion connection verified successfully."
      : t.lang === "ja"
        ? "接続に失敗しました。API キーとデータベース ID を確認してください。"
        : "Connection failed. Please check your API Key and Database ID."
  }
}

export async function saveSettings(
  apiKey: string,
  databaseId: string,
  t: any
): Promise<{ type: "success" | "error"; message: string }> {
  try {
    await saveNotionCredentials({
      apiKey: apiKey.trim(),
      databaseId: databaseId.trim()
    })
    return {
      type: "success",
      message:
        t.lang === "ja"
          ? "Notion 連携設定を保存しました。"
          : "Notion integration settings saved."
    }
  } catch {
    return {
      type: "error",
      message:
        t.lang === "ja" ? "保存に失敗しました。" : "Failed to save settings."
    }
  }
}

export function useNotionSettingsSection(t: any) {
  const [apiKey, setApiKey] = useState("")
  const [databaseId, setDatabaseId] = useState("")
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })

  useEffect(() => {
    getNotionCredentials().then((creds) => {
      if (creds) {
        setApiKey(creds.apiKey)
        setDatabaseId(creds.databaseId)
      }
    })
  }, [])

  const handleTest = async () => {
    setIsTesting(true)
    setFeedback({ type: null, message: "" })
    const res = await testConnection(apiKey, databaseId, t)
    setFeedback(res)
    setIsTesting(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFeedback({ type: null, message: "" })
    const res = await saveSettings(apiKey, databaseId, t)
    setFeedback(res)
    setIsSaving(false)
  }

  return {
    apiKey,
    setApiKey,
    databaseId,
    setDatabaseId,
    isTesting,
    isSaving,
    feedback,
    handleTest,
    handleSave
  }
}
