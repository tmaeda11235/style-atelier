import React, { useState, useEffect, useRef } from "react";
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
  Clock,
  FileJson,
  Download,
  Upload
} from "lucide-react";
import { 
  authorize, 
  clearCachedToken,
  uploadBackup, 
  downloadBackup, 
  exportDatabase, 
  importDatabase,
  getBackupMetadata
} from "../../lib/google-drive";

interface SettingsTabProps {
  addLog: (log: string) => void;
  onResetDb: () => void;
}

export function SettingsTab({ addLog, onResetDb }: SettingsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync toggle state
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);

  // Google Auth states
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [cloudBackup, setCloudBackup] = useState<{ modifiedTime: string; size: string } | null>(null);
  const [isLoadingCloudBackup, setIsLoadingCloudBackup] = useState(false);

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

    if (savedSyncEnabled) {
      // Silently authorize and get backup metadata
      authorize(false)
        .then((token) => {
          setAccessToken(token);
          setIsLoadingCloudBackup(true);
          getBackupMetadata(token)
            .then((meta) => {
              if (meta) {
                const dateStr = new Date(meta.modifiedTime).toLocaleString();
                const sizeKB = (parseInt(meta.size) / 1024).toFixed(1);
                setCloudBackup({
                  modifiedTime: dateStr,
                  size: `${sizeKB} KB`
                });
              } else {
                setCloudBackup(null);
              }
            })
            .catch((err) => console.error(err))
            .finally(() => setIsLoadingCloudBackup(false));
        })
        .catch((err) => {
          console.log("Silent authorization failed:", err.message);
        });
    }
  }, []);

  const showStatus = (text: string, type: "success" | "error" | "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage({ text: "", type: null });
    }, 6000);
  };

  const handleToggleSync = async (checked: boolean) => {
    setIsSyncEnabled(checked);
    localStorage.setItem("style-atelier-sync-enabled", checked ? "true" : "false");
    addLog(`Google Drive synchronization: ${checked ? "ENABLED" : "DISABLED"}`);
    
    if (!checked) {
      // Clear token when turning sync off
      if (accessToken) {
        clearCachedToken(accessToken).catch(console.error);
      }
      setAccessToken(null);
      setCloudBackup(null);
    } else {
      // When turning sync on, fetch metadata using interactive authorization
      try {
        const token = await authorize(true);
        setAccessToken(token);
        setIsLoadingCloudBackup(true);
        const meta = await getBackupMetadata(token);
        if (meta) {
          const dateStr = new Date(meta.modifiedTime).toLocaleString();
          const sizeKB = (parseInt(meta.size) / 1024).toFixed(1);
          setCloudBackup({
            modifiedTime: dateStr,
            size: `${sizeKB} KB`
          });
        } else {
          setCloudBackup(null);
        }
      } catch (err: any) {
        console.error(err);
        addLog(`Sync authorization failed: ${err.message || err}`);
        showStatus(`Authorization failed: ${err.message || "Unknown error"}`, "error");
        setIsSyncEnabled(false);
        localStorage.setItem("style-atelier-sync-enabled", "false");
      } finally {
        setIsLoadingCloudBackup(false);
      }
    }
  };

  /**
   * Helper to retrieve token from memory or request a new one via Identity flow
   */
  const getOrRequestToken = async (): Promise<string> => {
    if (accessToken) return accessToken;
    
    const token = await authorize(true);
    setAccessToken(token);
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

      // Fetch updated metadata
      const meta = await getBackupMetadata(token);
      if (meta) {
        const dateStr = new Date(meta.modifiedTime).toLocaleString();
        const sizeKB = (parseInt(meta.size) / 1024).toFixed(1);
        setCloudBackup({
          modifiedTime: dateStr,
          size: `${sizeKB} KB`
        });
      }

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
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!isSyncEnabled) return;
    
    // Always display confirmation dialog
    let confirmMsg = "Google Driveからデータを復元（ロード）し、マージします。\n同じIDのデータはバックアップの内容で上書きされますがよろしいですか？";
    if (cloudBackup) {
      confirmMsg += `\n\n【クラウド上のバックアップ情報】\n更新日時: ${cloudBackup.modifiedTime}\nサイズ: ${cloudBackup.size}`;
    }
    
    const ok = window.confirm(confirmMsg);
    if (!ok) return;

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
    } finally {
      setIsRestoring(false);
    }
  };

  const handleLocalExport = async () => {
    try {
      setStatusMessage({ text: "Exporting database...", type: "info" });
      const jsonData = await exportDatabase();
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.href = url;
      link.download = `style-atelier-backup-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      addLog("Database exported to local JSON file successfully.");
      showStatus("エクスポートが完了しました", "success");
    } catch (err: any) {
      console.error(err);
      addLog(`Export failed: ${err.message || err}`);
      showStatus(`Export failed: ${err.message || "Unknown error"}`, "error");
    }
  };

  const handleLocalImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    const ok = window.confirm(
      "ローカルファイルからデータを復元し、マージします。\n同じIDのデータはインポートする内容で上書きされますがよろしいですか？"
    );
    if (!ok) {
      e.target.value = "";
      return;
    }
    
    setStatusMessage({ text: "Reading file...", type: "info" });
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          throw new Error("File is empty.");
        }
        
        await importDatabase(text);
        addLog("Database restored from local JSON file successfully.");
        showStatus("インポートが完了しました！", "success");
      } catch (err: any) {
        console.error(err);
        addLog(`Import failed: ${err.message || err}`);
        showStatus(`Import failed: ${err.message || "Unknown error"}`, "error");
      } finally {
        e.target.value = "";
      }
    };
    
    reader.onerror = () => {
      addLog("Import failed: File reading error.");
      showStatus("Import failed: File reading error.", "error");
      e.target.value = "";
    };
    
    reader.readAsText(file);
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
              {isSyncEnabled && (
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

          {/* Last Backup Time & Cloud Backup Preview */}
          {(lastBackup || cloudBackup || isLoadingCloudBackup) && (
            <div className="flex flex-col items-center justify-center gap-1.5 border-t border-slate-100 pt-3">
              {lastBackup && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>ローカル最終バックアップ: {lastBackup}</span>
                </div>
              )}
              {isLoadingCloudBackup ? (
                <div className="flex items-center gap-1 text-[10px] text-blue-400 font-medium animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>クラウド情報を取得中...</span>
                </div>
              ) : cloudBackup ? (
                <div className="flex flex-col items-center gap-0.5 text-[10px] text-slate-500 font-medium bg-slate-50 rounded-lg py-1.5 px-3 border border-slate-100 w-full text-center">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Cloud Backup Preview</span>
                  <span>更新日時: {cloudBackup.modifiedTime}</span>
                  <span>サイズ: {cloudBackup.size}</span>
                </div>
              ) : isSyncEnabled && (
                <div className="text-[10px] text-slate-400 font-medium">
                  クラウド上のバックアップファイルが見つかりません
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

      {/* Local File Backup Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <FileJson className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Local File Backup (Offline)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export your style cards and binders to a local JSON file, or restore from a previously exported backup file. Perfect for offline migrations or keeping absolute privacy.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleLocalExport}
              disabled={isBackingUp || isRestoring}
              className="py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isBackingUp || isRestoring}
              className="py-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 disabled:opacity-30 disabled:hover:bg-white text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              Import JSON
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLocalImport}
              accept=".json"
              className="hidden"
            />
          </div>

          {/* Privacy Note */}
          <div className="flex items-start gap-1.5 bg-indigo-50/40 rounded-xl p-3 border border-indigo-100/50">
            <Lock className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-indigo-700 leading-relaxed font-medium">
              データは完全にブラウザとローカル環境のみで処理されます。外部サーバーに送信されることはなく、完全なオフライン環境でも動作します。
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
