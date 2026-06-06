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
  getBackupMetadata,
  GDriveTimeoutError
} from "../../lib/google-drive";
import { useStorageEstimate } from "../../hooks/useStorageEstimate";
import { db } from "../../lib/db";
import { useLanguage } from "../../contexts/LanguageContext";
import type { Language } from "../../lib/i18n";

interface SettingsTabProps {
  addLog: (log: string) => void;
  onResetDb: () => void;
  isEasyMode?: boolean;
  onToggleEasyMode?: (checked: boolean) => void;
}

export function SettingsTab({ 
  addLog, 
  onResetDb, 
  isEasyMode = false, 
  onToggleEasyMode = () => {} 
}: SettingsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { estimate, checkStorage } = useStorageEstimate();
  const { lang, changeLanguage, t: i18n } = useLanguage();
  const t = i18n.settings;

  // Sync toggle state
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);

  // Google Auth states
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [cloudBackup, setCloudBackup] = useState<{ modifiedTime: string; size: string } | null>(null);
  const [isLoadingCloudBackup, setIsLoadingCloudBackup] = useState(false);
  const [syncProgress, setSyncProgress] = useState<number | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<number | null>(null);

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
          getBackupMetadata(token, setAccessToken)
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

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const showStatus = (text: string, type: "success" | "error" | "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage({ text: "", type: null });
    }, 6000);
  };

  const handleCancelSync = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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
        const meta = await getBackupMetadata(token, setAccessToken);
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

  const handleSync = async () => {
    if (!isSyncEnabled) return;

    setIsSyncing(true);
    setSyncProgress(0);
    setStatusMessage({ text: t.syncingStart, type: "info" });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = await getOrRequestToken();
      
      // 1. Download existing backup (if any)
      setStatusMessage({ text: t.syncingFetch, type: "info" });
      const backupData = await downloadBackup(token, setAccessToken, (percent) => {
        setSyncProgress(Math.round(percent * 0.5)); // 0-50%
        setStatusMessage({ text: `${t.syncingProgress} (${percent}%)...`, type: "info" });
      }, undefined, { signal: controller.signal });

      if (backupData) {
        setStatusMessage({ text: t.syncingMerge, type: "info" });
        await importDatabase(backupData, "merge");
      } else {
        addLog("No existing backup found. Uploading local data as new backup.");
      }

      // 2. Export and Upload current merged state
      setStatusMessage({ text: t.syncingPrepare, type: "info" });
      const jsonData = await exportDatabase();

      setStatusMessage({ text: `${t.syncingText} (50%)...`, type: "info" });
      await uploadBackup(token, jsonData, setAccessToken, (percent) => {
        setSyncProgress(50 + Math.round(percent * 0.5)); // 50-100%
        setStatusMessage({ text: `${t.syncingUpload} (${percent}%)...`, type: "info" });
      }, { signal: controller.signal });

      const now = Date.now();
      localStorage.setItem("style-atelier-last-backup", now.toString());
      setLastBackup(new Date(now).toLocaleString());

      // Fetch updated metadata
      const meta = await getBackupMetadata(token, setAccessToken, undefined, { signal: controller.signal });
      if (meta) {
        const dateStr = new Date(meta.modifiedTime).toLocaleString();
        const sizeKB = (parseInt(meta.size) / 1024).toFixed(1);
        setCloudBackup({
          modifiedTime: dateStr,
          size: `${sizeKB} KB`
        });
      }

      addLog("Google Drive synchronization completed successfully.");
      showStatus(t.syncSuccess, "success");
      checkStorage();
    } catch (err: any) {
      if (err.name === "AbortError") {
        addLog("Sync cancelled by user.");
        showStatus(t.syncCancelled, "info");
      } else if (err instanceof GDriveTimeoutError) {
        addLog("Sync failed: Connection timed out.");
        showStatus(t.syncTimeout, "error");
      } else {
        console.error(err);
        addLog(`Sync failed: ${err.message || err}`);
        showStatus(`${t.syncFailed}: ${err.message || "Unknown error"}`, "error");
      }
      
      // Clear token cache from Chrome on unexpected failure
      if (err.name !== "AbortError" && accessToken) {
        await clearCachedToken(accessToken).catch(console.error);
        setAccessToken(null);
      }
    } finally {
      setIsSyncing(false);
      abortControllerRef.current = null;
      setSyncProgress(null);
    }
  };

  const handleForceRecovery = async () => {
    if (!isSyncEnabled || isSyncing || isRestoring) return;
    
    setIsRestoring(true);
    setStatusMessage({ text: t.loadingCloudBackup, type: "info" });
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = await getOrRequestToken();
      
      // Fetch latest backup metadata before confirmation to ensure accuracy
      const meta = await getBackupMetadata(token, setAccessToken, undefined, { signal: controller.signal });
      let currentBackup = cloudBackup;
      if (meta) {
        const dateStr = new Date(meta.modifiedTime).toLocaleString();
        const sizeKB = (parseInt(meta.size) / 1024).toFixed(1);
        currentBackup = {
          modifiedTime: dateStr,
          size: `${sizeKB} KB`
        };
        setCloudBackup(currentBackup);
      } else {
        setCloudBackup(null);
        currentBackup = null;
      }

      let confirmMsg = t.restoreConfirmMsg;
      if (currentBackup) {
        confirmMsg += `\n\n${t.restoreConfirmHeader}\n${t.restoreConfirmTime}${currentBackup.modifiedTime}\n${t.restoreConfirmSize}${currentBackup.size}`;
      }
      
      setStatusMessage({ text: "", type: null });
      const ok = window.confirm(confirmMsg);
      if (!ok) return;

      setRestoreProgress(0);
      setStatusMessage({ text: `${t.restoreLoading} (0%)...`, type: "info" });
      
      const backupData = await downloadBackup(token, setAccessToken, (percent) => {
        setRestoreProgress(percent);
        setStatusMessage({ text: `${t.restoreProgress} (${percent}%)...`, type: "info" });
      }, undefined, { signal: controller.signal });
      if (!backupData) {
        showStatus(t.noCloudBackup, "error");
        addLog("Force recovery failed: Backup file not found.");
        return;
      }

      await importDatabase(backupData, "replace");
      addLog("Database recovered from Google Drive successfully.");
      showStatus(t.restoreSuccess, "success");
      checkStorage();
    } catch (err: any) {
      if (err.name === "AbortError") {
        addLog("Force recovery cancelled by user.");
        showStatus(t.restoreCancelled, "info");
      } else if (err instanceof GDriveTimeoutError) {
        addLog("Force recovery failed: Connection timed out.");
        showStatus(t.syncTimeout, "error");
      } else {
        console.error(err);
        addLog(`Force recovery failed: ${err.message || err}`);
        showStatus(`${t.restoreFailed}: ${err.message || "Unknown error"}`, "error");
      }
      
      if (err.name !== "AbortError" && accessToken) {
        await clearCachedToken(accessToken).catch(console.error);
        setAccessToken(null);
      }
    } finally {
      setIsRestoring(false);
      abortControllerRef.current = null;
      setRestoreProgress(null);
    }
  };

  const handleLocalExport = async () => {
    try {
      setStatusMessage({ text: t.readingFile, type: "info" });
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
      showStatus(t.importSuccess, "success");
    } catch (err: any) {
      console.error(err);
      addLog(`Export failed: ${err.message || err}`);
      showStatus(`${t.importFailed}: ${err.message || "Unknown error"}`, "error");
    }
  };

  const handleLocalImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    const confirmMsg = t.importConfirm;
      
    const ok = window.confirm(confirmMsg);
    if (!ok) {
      e.target.value = "";
      return;
    }
    
    setStatusMessage({ text: t.readingFile, type: "info" });
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          throw new Error("File is empty.");
        }
        
        await importDatabase(text, "merge");
        addLog("Database restored from local JSON file successfully.");
        showStatus(t.importSuccess, "success");
        checkStorage();
      } catch (err: any) {
        console.error(err);
        addLog(`Import failed: ${err.message || err}`);
        showStatus(`${t.importFailed}: ${err.message || "Unknown error"}`, "error");
      } finally {
        e.target.value = "";
      }
    };
    
    reader.onerror = () => {
      addLog("Import failed: File reading error.");
      showStatus(`${t.importFailed}: File reading error.`, "error");
      e.target.value = "";
    };
    
    reader.readAsText(file);
  };

  const handleResetDbClick = async () => {
    const ok = window.confirm(t.resetConfirm);
    if (!ok) return;

    await onResetDb();
    showStatus(t.resetSuccess, "success");
    checkStorage();
  };

  const handleClearHistory = async () => {
    const ok = window.confirm(t.clearHistoryConfirm);
    if (!ok) return;

    try {
      await db.historyItems.clear();
      addLog("Prompt history cleared successfully.");
      showStatus(t.clearHistorySuccess, "success");
      checkStorage();
    } catch (err: any) {
      console.error(err);
      addLog(`Failed to clear history: ${err.message || err}`);
      showStatus(`${t.clearHistoryFailed}: ${err.message || "Unknown error"}`, "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Title block */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-blue-500/10 rounded-lg">
          <Settings2 className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-base font-bold text-slate-800">{t.title}</h2>
      </div>

      {/* Language Settings */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-100">
            <span className="text-xl">🌐</span>
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-slate-800">
              {t.languageLabel}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.languageDesc}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100/80 rounded-xl px-4 py-3 transition-all hover:bg-slate-50">
          <span className="text-xs font-bold text-slate-700">{t.languageLabel}</span>
          <select
            value={lang}
            onChange={(e) => changeLanguage(e.target.value as Language)}
            className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            id="language-select"
          >
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </div>
      </div>

      {/* Interface Mode Settings (Easy Mode Toggle) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-xl ${isEasyMode ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-slate-50 text-slate-400 border border-slate-100"}`}>
            <Settings2 className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              {t.easyModeLabel}
              {isEasyMode && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                  Active
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.easyModeDesc}
            </p>
          </div>
        </div>

        {/* Easy Mode Toggle Switch */}
        <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100/80 rounded-xl px-4 py-3 transition-all hover:bg-slate-50">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-700">{t.easyModeToggleLabel}</span>
            <p className="text-[10px] text-slate-400">{t.easyModeToggleSub}</p>
          </div>
          <button
            type="button"
            id="easy-mode-toggle-btn"
            onClick={() => onToggleEasyMode(!isEasyMode)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isEasyMode ? "bg-blue-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isEasyMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
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
              {t.gdriveSyncLabel}
              {isSyncEnabled && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                  <ShieldCheck className="w-3 h-3 mr-0.5" /> Active
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.gdriveSyncDesc}
            </p>
          </div>
        </div>

        {/* Sync Toggle Switch */}
        <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100/80 rounded-xl px-4 py-3 mb-4 transition-all hover:bg-slate-50">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-700">{t.googleDriveToggleLabel}</span>
            <p className="text-[10px] text-slate-400">{t.googleDriveToggleSub}</p>
          </div>
          <button
            type="button"
            id="google-drive-toggle-btn"
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
          <div className={`mt-3 mb-4 px-3 py-2.5 rounded-xl text-xs flex items-center justify-between border animate-in fade-in duration-200 ${
            statusMessage.type === "success" ? "bg-green-50 text-green-800 border-green-200" :
            statusMessage.type === "error" ? "bg-red-50 text-red-800 border-red-200" :
            "bg-blue-50 text-blue-800 border-blue-200"
          }`}>
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
              {statusMessage.type === "error" && <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
              {statusMessage.type === "info" && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
            {statusMessage.type === "info" && (isSyncing || isRestoring) && (
              <button
                type="button"
                onClick={handleCancelSync}
                className="ml-2 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-bold rounded-lg transition-colors border border-red-200/50"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {/* Progress Bar (Only during Sync or Force Recovering) */}
        {(isSyncing || isRestoring) && (
          <div className="mt-2 mb-4 w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
            <div 
              className="h-full transition-all duration-300 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 animate-pulse" 
              style={{ width: `${isSyncing ? (syncProgress ?? 0) : (restoreProgress ?? 0)}%` }} 
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 space-y-4">
          <button
            onClick={handleSync}
            disabled={!isSyncEnabled || isSyncing || isRestoring}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
            id="google-drive-sync-btn"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {t.syncingText} {syncProgress !== null ? `${syncProgress}%` : ""}
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                {t.syncButtonText}
              </>
            )}
          </button>

          {/* Last Backup Time & Cloud Backup Preview */}
          {(lastBackup || cloudBackup || isLoadingCloudBackup) && (
            <div className="flex flex-col items-center justify-center gap-1.5 border-t border-slate-100 pt-3">
              {lastBackup && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t.lastBackupLabel} {lastBackup}</span>
                </div>
              )}
              {isLoadingCloudBackup ? (
                <div className="flex items-center gap-1 text-[10px] text-blue-400 font-medium animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.loadingCloudBackup}</span>
                </div>
              ) : cloudBackup ? (
                <div className="flex flex-col items-center gap-0.5 text-[10px] text-slate-500 font-medium bg-slate-50 rounded-lg py-1.5 px-3 border border-slate-100 w-full text-center">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Cloud Backup Preview</span>
                  <span>{t.restoreConfirmTime} {cloudBackup.modifiedTime}</span>
                  <span>{t.restoreConfirmSize} {cloudBackup.size}</span>
                </div>
              ) : isSyncEnabled && (
                <div className="text-[10px] text-slate-400 font-medium">
                  {t.noCloudBackup}
                </div>
              )}
            </div>
          )}
           {/* Security note */}
          <div className="flex items-start gap-1.5 bg-blue-50/40 rounded-xl p-3 border border-blue-100/50">
            <Lock className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
              {t.securityNote}
            </p>
          </div>
        </div>
      </div>

      {/* Storage Management Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-100">
            <Database className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              {t.storageTitle}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.storageDesc}
            </p>
          </div>
        </div>

        {/* Progress Bar & Status Text */}
        {estimate ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{t.storageUsage}: {estimate.usageFormatted} / {estimate.quotaFormatted}</span>
              <span>{estimate.percentage}%</span>
            </div>
            
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  estimate.percentage >= 90 ? "bg-gradient-to-r from-rose-500 to-red-500" :
                  estimate.percentage >= 80 ? "bg-gradient-to-r from-amber-500 to-yellow-500" :
                  "bg-gradient-to-r from-blue-500 to-indigo-500"
                }`}
                style={{ width: `${estimate.percentage}%` }}
              />
            </div>

            {/* Warnings */}
            {estimate.percentage >= 90 ? (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200/60 rounded-xl p-3 text-red-800 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{t.storageWarning90Title}</span>
                  <p className="text-[10px] text-red-700/90 mt-0.5 leading-relaxed">
                    {t.storageWarning90Desc}
                  </p>
                </div>
              </div>
            ) : estimate.percentage >= 80 ? (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200/60 rounded-xl p-3 text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{t.storageWarning80Title}</span>
                  <p className="text-[10px] text-amber-700/90 mt-0.5 leading-relaxed">
                    {t.storageWarning80Desc}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-xs text-slate-400 animate-pulse">
            {t.storageLoading}
          </div>
        )}

        {/* Action button & Optimization description */}
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">{t.cleanupHistoryLabel}</span>
            <button
              onClick={handleClearHistory}
              className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t.clearHistoryBtn || "Clear History"}
            </button>
          </div>
          
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-500 leading-relaxed font-medium">
            <p>{lang === "ja" ? "※ ストレージの空き容量を増やすには、カード一覧から不要なスタイルカードの削除も効果的です。特に高解像度な画像が紐づくカードは容量を消費します。" : "* Removing unused Style Cards from the library can also free up significant storage, especially for cards with high-resolution images."}</p>
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
              {t.localBackupTitle}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.localBackupDesc}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleLocalExport}
              disabled={isSyncing || isRestoring}
              className="py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              {t.exportBtn}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isSyncing || isRestoring}
              className="py-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 disabled:opacity-30 disabled:hover:bg-white text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              {t.importBtn}
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
              {t.privacyNote}
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
            <h3 className="text-xs font-bold text-red-900">{t.dangerZoneTitle}</h3>
            <p className="text-[10px] text-red-600/80 leading-relaxed">
              {t.dangerZoneDesc}
            </p>
            <div className="flex flex-col gap-2 mt-2">
              {isSyncEnabled && (
                <div className="text-[10px] text-slate-500 font-medium mb-1 flex items-center gap-1">
                  {isLoadingCloudBackup ? (
                    <span className="text-blue-500 animate-pulse flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {t.loadingCloudBackup}
                    </span>
                  ) : cloudBackup ? (
                    <span>
                      {t.cloudBackupLabel}{cloudBackup.modifiedTime} ({cloudBackup.size})
                    </span>
                  ) : (
                    <span className="text-slate-400">{t.noCloudBackup}</span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleResetDbClick}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 hover:shadow-sm text-white text-[10px] font-bold rounded-xl transition-all duration-150 flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" />
                  {t.resetBtn}
                </button>
                <button
                  onClick={handleForceRecovery}
                  disabled={!isSyncEnabled || isSyncing || isRestoring}
                  className="px-3 py-2 bg-white hover:bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold rounded-xl transition-all duration-150 flex items-center gap-1.5 disabled:opacity-30"
                  id="force-recovery-btn"
                >
                  <DownloadCloud className="w-3.5 h-3.5 text-red-500" />
                  {t.restoreBtnText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
