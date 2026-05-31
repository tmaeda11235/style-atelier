import React, { useState, useEffect } from "react";
import { 
  Cloud, 
  UploadCloud, 
  DownloadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Lock, 
  ShieldCheck, 
  Database, 
  Trash2,
  Settings2,
  Clock
} from "lucide-react";
import { 
  authorize, 
  clearCachedToken,
  fetchUserInfo, 
  uploadBackup, 
  downloadBackup, 
  exportDatabase, 
  importDatabase 
} from "../../lib/google-drive";

interface SettingsTabProps {
  addLog: (log: string) => void;
  onResetDb: () => void;
}

export function SettingsTab({ addLog, onResetDb }: SettingsTabProps) {
  // Sync toggle state
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);

  // Google Auth states
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  // Status logs local view
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" | null }>({
    text: "",
    type: null,
  });

  useEffect(() => {
    // Load last backup time
    const savedLastBackup = localStorage.getItem("style-atelier-last-backup");
    if (savedLastBackup) {
      setLastBackup(new Date(parseInt(savedLastBackup)).toLocaleString());
    }

    // Load sync enabled state
    const savedSyncEnabled = localStorage.getItem("style-atelier-sync-enabled") === "true";
    setIsSyncEnabled(savedSyncEnabled);
  }, []);

  const showStatus = (text: string, type: "success" | "error" | "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage({ text: "", type: null });
    }, 6000);
  };

  const handleToggleSync = (checked: boolean) => {
    setIsSyncEnabled(checked);
    localStorage.setItem("style-atelier-sync-enabled", checked ? "true" : "false");
    addLog(`Google Drive synchronization: ${checked ? "ENABLED" : "DISABLED"}`);
    
    if (!checked) {
      // Clear token and email when turning sync off
      if (accessToken) {
        clearCachedToken(accessToken).catch(console.error);
      }
      setAccessToken(null);
      setUserEmail(null);
    }
  };

  /**
   * Helper to retrieve token from memory or request a new one via Identity flow
   */
  const getOrRequestToken = async (): Promise<string> => {
    if (accessToken) return accessToken;
    
    const token = await authorize(true);
    setAccessToken(token);
    try {
      const userInfo = await fetchUserInfo(token);
      setUserEmail(userInfo.email);
    } catch (e) {
      console.warn("Could not fetch user profile details, token used directly:", e);
    }
    return token;
  };

  const handleBackup = async () => {
    if (!isSyncEnabled) return;

    // Check if backup has been confirmed before
    const isBackupConfirmed = localStorage.getItem("style-atelier-backup-confirmed") === "true";
    if (!isBackupConfirmed) {
      const ok = window.confirm(
        "データをGoogle Driveにバックアップ（保存）します。よろしいですか？\n(※次回以降、この確認画面は表示されずダイレクトに保存されます。)"
      );
      if (!ok) return;
      localStorage.setItem("style-atelier-backup-confirmed", "true");
    }

    setIsBackingUp(true);
    setStatusMessage({ text: "Creating backup and uploading...", type: "info" });
    try {
      const token = await getOrRequestToken();
      const jsonData = await exportDatabase();
      await uploadBackup(token, jsonData);

      const now = Date.now();
      localStorage.setItem("style-atelier-last-backup", now.toString());
      setLastBackup(new Date(now).toLocaleString());

      addLog("Backup uploaded to Google Drive successfully.");
      showStatus("バックアップ完了しました", "success");
    } catch (err: any) {
      console.error(err);
      addLog(`Backup failed: ${err.message || err}`);
      showStatus(`Backup failed: ${err.message || "Unknown error"}`, "error");
      
      // Clear token cache from Chrome
      if (accessToken) {
        await clearCachedToken(accessToken);
      }
      setAccessToken(null);
      setUserEmail(null);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!isSyncEnabled) return;
    
    // Check if restore has been confirmed before
    const isRestoreConfirmed = localStorage.getItem("style-atelier-restore-confirmed") === "true";
    if (!isRestoreConfirmed) {
      const ok = window.confirm(
        "【警告】Google Driveからデータを復元（ロード）します。\n現在のローカルデータ（カード、カテゴリ、設定など）はすべて上書きされ、元に戻せません。よろしいですか？\n(※次回以降、この確認画面は表示されずダイレクトにロードされます。)"
      );
      if (!ok) return;
      localStorage.setItem("style-atelier-restore-confirmed", "true");
    }

    setIsRestoring(true);
    setStatusMessage({ text: "Downloading backup from Google Drive...", type: "info" });
    try {
      const token = await getOrRequestToken();
      const backupData = await downloadBackup(token);
      if (!backupData) {
        showStatus("Backup file (style-atelier-backup.json) not found on Google Drive.", "error");
        addLog("Restore failed: Backup file not found.");
        return;
      }

      await importDatabase(backupData);
      addLog("Database restored from Google Drive successfully.");
      showStatus("データ復元が完了しました！", "success");
    } catch (err: any) {
      console.error(err);
      addLog(`Restore failed: ${err.message || err}`);
      showStatus(`Restore failed: ${err.message || "Unknown error"}`, "error");
      
      if (accessToken) {
        await clearCachedToken(accessToken);
      }
      setAccessToken(null);
      setUserEmail(null);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Title block */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-blue-500/10 rounded-lg">
          <Settings2 className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-base font-bold text-slate-800">Settings</h2>
      </div>

      {/* Google Drive Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-xl ${isSyncEnabled ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-slate-50 text-slate-400 border border-slate-100"}`}>
            <Cloud className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Google Drive Cloud Sync
              {isSyncEnabled && userEmail && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                  <ShieldCheck className="w-3 h-3 mr-0.5" /> Active
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Backup your local style cards and binders to Google Drive. Keep your decks safe and load them on other devices.
            </p>
          </div>
        </div>

        {/* Sync Toggle Switch */}
        <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100/80 rounded-xl px-4 py-3 mb-4 transition-all hover:bg-slate-50">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-700">Google Drive同期を有効にする</span>
            <p className="text-[10px] text-slate-400">バックアップ・復元用のボタンが活性化します</p>
          </div>
          <button
            type="button"
            onClick={() => handleToggleSync(!isSyncEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isSyncEnabled ? "bg-blue-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isSyncEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Status / Message Display */}
        {statusMessage.text && (
          <div className={`mt-3 mb-4 px-3 py-2.5 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in duration-200 ${
            statusMessage.type === "success" ? "bg-green-50 text-green-800 border-green-200" :
            statusMessage.type === "error" ? "bg-red-50 text-red-800 border-red-200" :
            "bg-blue-50 text-blue-800 border-blue-200"
          }`}>
            {statusMessage.type === "success" && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
            {statusMessage.type === "error" && <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
            {statusMessage.type === "info" && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleBackup}
              disabled={!isSyncEnabled || isBackingUp || isRestoring}
              className="py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isBackingUp ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Backing up...
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  Backup Data
                </>
              )}
            </button>
            <button
              onClick={handleRestore}
              disabled={!isSyncEnabled || isBackingUp || isRestoring}
              className="py-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 disabled:opacity-30 disabled:hover:bg-white text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <DownloadCloud className="w-3.5 h-3.5" />
                  Restore Data
                </>
              )}
            </button>
          </div>

          {/* Sync Account Details & Last Backup Time */}
          {(userEmail || lastBackup) && (
            <div className="flex flex-col items-center justify-center gap-1 border-t border-slate-100 pt-3">
              {userEmail && (
                <div className="text-[10px] text-slate-500 font-semibold truncate max-w-full">
                  連携アカウント: {userEmail}
                </div>
              )}
              {lastBackup && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  <Clock className="w-3 h-3" />
                  <span>最終バックアップ: {lastBackup}</span>
                </div>
              )}
            </div>
          )}

          {/* Security note */}
          <div className="flex items-start gap-1.5 bg-blue-50/40 rounded-xl p-3 border border-blue-100/50">
            <Lock className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
              認証情報は拡張機能には一切保存されません。バックアップ・復元操作時の一時的なアクセス（Google Drive内の自身が作成したバックアップファイル）にのみ使用されます。
            </p>
          </div>
        </div>
      </div>

      {/* Dangerous Operations (Reset DB) */}
      <div className="bg-red-50/20 border border-red-200/50 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-xl">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="text-xs font-bold text-red-900">Danger Zone</h3>
            <p className="text-[10px] text-red-600/80 leading-relaxed">
              Reset the database to its pristine state. This will delete all style cards, binders, histories, and categories locally. This action is irreversible unless you have a Google Drive backup.
            </p>
            <button
              onClick={onResetDb}
              className="mt-2 px-3 py-2 bg-red-600 hover:bg-red-700 hover:shadow-sm text-white text-[10px] font-bold rounded-xl transition-all duration-150 flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              Reset Local Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
