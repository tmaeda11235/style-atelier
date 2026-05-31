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
  Key, 
  ChevronDown, 
  ChevronUp, 
  Trash2,
  Settings2,
  LogOut,
  Clock
} from "lucide-react";
import { 
  authorize, 
  fetchUserInfo, 
  uploadBackup, 
  downloadBackup, 
  exportDatabase, 
  importDatabase, 
  getClientId, 
  DEFAULT_CLIENT_ID 
} from "../../lib/google-drive";
import { db } from "../../lib/db";

interface SettingsTabProps {
  addLog: (log: string) => void;
  onResetDb: () => void;
}

export function SettingsTab({ addLog, onResetDb }: SettingsTabProps) {
  // Google Auth states
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  // Custom Client ID states
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customClientId, setCustomClientId] = useState("");
  const [clientIdSaved, setClientIdSaved] = useState(false);

  // Status logs local view
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" | null }>({
    text: "",
    type: null,
  });

  useEffect(() => {
    // Load last backup time from localStorage
    const savedLastBackup = localStorage.getItem("style-atelier-last-backup");
    if (savedLastBackup) {
      setLastBackup(new Date(parseInt(savedLastBackup)).toLocaleString());
    }

    // Load custom client ID
    const savedClientId = localStorage.getItem("style-atelier-custom-client-id") || "";
    setCustomClientId(savedClientId);
  }, []);

  const showStatus = (text: string, type: "success" | "error" | "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage({ text: "", type: null });
    }, 6000);
  };

  const handleConnect = async (force = false) => {
    setIsConnecting(true);
    setStatusMessage({ text: "Connecting to Google Drive...", type: "info" });
    try {
      const token = await authorize(force);
      setAccessToken(token);
      
      const userInfo = await fetchUserInfo(token);
      setUserEmail(userInfo.email);
      addLog(`Connected to Google Drive: ${userInfo.email}`);
      showStatus(`Successfully connected to ${userInfo.email}!`, "success");
    } catch (err: any) {
      console.error(err);
      addLog(`Google Drive connection error: ${err.message || err}`);
      showStatus(err.message || "Failed to authorize Google account.", "error");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setAccessToken(null);
    setUserEmail(null);
    addLog("Disconnected from Google Drive.");
    showStatus("Google Drive connection disconnected.", "info");
  };

  const handleBackup = async () => {
    if (!accessToken) return;
    setIsBackingUp(true);
    setStatusMessage({ text: "Creating backup and uploading...", type: "info" });
    try {
      const jsonData = await exportDatabase();
      await uploadBackup(accessToken, jsonData);

      const now = Date.now();
      localStorage.setItem("style-atelier-last-backup", now.toString());
      setLastBackup(new Date(now).toLocaleString());

      addLog("Backup uploaded to Google Drive successfully.");
      showStatus("Database backup uploaded successfully!", "success");
    } catch (err: any) {
      console.error(err);
      addLog(`Backup failed: ${err.message || err}`);
      showStatus(`Backup failed: ${err.message || "Unknown error"}`, "error");
      
      // If token expired, try to reconnect
      if (err.message && (err.message.includes("401") || err.message.includes("Unauthorized"))) {
        handleConnect(true);
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!accessToken) return;
    
    const confirmRestore = window.confirm(
      "【警告】Google Driveからデータを復元します。\n現在のローカルデータ（カード、カテゴリ、設定など）はすべて上書きされますがよろしいですか？"
    );
    if (!confirmRestore) return;

    setIsRestoring(true);
    setStatusMessage({ text: "Downloading backup from Google Drive...", type: "info" });
    try {
      const backupData = await downloadBackup(accessToken);
      if (!backupData) {
        showStatus("Backup file (style-atelier-backup.json) not found on Google Drive.", "error");
        addLog("Restore failed: Backup file not found.");
        return;
      }

      await importDatabase(backupData);
      addLog("Database restored from Google Drive successfully.");
      showStatus("Data successfully restored! Please reload the page if changes don't reflect immediately.", "success");
    } catch (err: any) {
      console.error(err);
      addLog(`Restore failed: ${err.message || err}`);
      showStatus(`Restore failed: ${err.message || "Unknown error"}`, "error");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSaveClientId = () => {
    localStorage.setItem("style-atelier-custom-client-id", customClientId);
    setClientIdSaved(true);
    addLog(`Saved custom OAuth Client ID: ${customClientId.substring(0, 15)}...`);
    showStatus("Custom Client ID saved. Connect again to apply changes.", "success");
    setTimeout(() => setClientIdSaved(false), 3000);
  };

  const handleResetClientId = () => {
    localStorage.removeItem("style-atelier-custom-client-id");
    setCustomClientId("");
    addLog("OAuth Client ID reset to default.");
    showStatus("OAuth Client ID reset to default.", "info");
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

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${userEmail ? "bg-green-50 text-green-600 border border-green-100" : "bg-slate-50 text-slate-400 border border-slate-100"}`}>
            <Cloud className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Google Drive Cloud Sync
              {userEmail && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                  <ShieldCheck className="w-3 h-3 mr-0.5" /> Synchronized
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Backup your local style cards and binders to Google Drive. Keep your decks safe and load them on other devices.
            </p>
          </div>
        </div>

        {/* Status / Message Display */}
        {statusMessage.text && (
          <div className={`mt-4 px-3 py-2.5 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in duration-200 ${
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
        <div className="mt-5 space-y-4">
          {!userEmail ? (
            <button
              onClick={() => handleConnect(false)}
              disabled={isConnecting}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  Connect Google Account
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              {/* Account Identity and disconnect */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs">
                <span className="font-semibold text-slate-600 truncate mr-2" title={userEmail}>
                  {userEmail}
                </span>
                <button
                  onClick={handleDisconnect}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex items-center gap-1 font-bold text-[10px]"
                  title="Disconnect account"
                >
                  <LogOut className="w-3.5 h-3.5" /> Disconnect
                </button>
              </div>

              {/* Sync Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleBackup}
                  disabled={isBackingUp || isRestoring}
                  className="py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
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
                  disabled={isBackingUp || isRestoring}
                  className="py-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
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
            </div>
          )}

          {/* Last Backup Label */}
          {lastBackup && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Last backed up: {lastBackup}</span>
            </div>
          )}

          {/* User requested security note */}
          <div className="flex items-start gap-1.5 bg-blue-50/40 rounded-xl p-3 border border-blue-100/50">
            <Lock className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
              認証情報は拡張機能には一切保存されません。バックアップ・復元操作時の一時的なアクセス（Google Drive内の自身が作成したバックアップファイル）にのみ使用されます。
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Settings Accordion */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-5 py-4 flex justify-between items-center text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Key className="w-4 h-4 text-slate-500" />
            Advanced OAuth2 Configuration
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showAdvanced && (
          <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Custom Google OAuth Client ID
              </label>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                By default, the extension uses a shared Client ID. If you hit Google Drive API limits, or want to host your own backup configuration, input your personal Client ID here.
              </p>
              <textarea
                value={customClientId}
                onChange={(e) => setCustomClientId(e.target.value)}
                placeholder={DEFAULT_CLIENT_ID}
                className="w-full text-xs font-mono p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none h-20 resize-none"
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              {customClientId && (
                <button
                  onClick={handleResetClientId}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-[10px] font-bold rounded-lg text-slate-500 transition-colors"
                >
                  Reset to Default
                </button>
              )}
              <button
                onClick={handleSaveClientId}
                className={`px-4 py-1.5 text-[10px] font-bold rounded-lg shadow-sm transition-all duration-200 ${
                  clientIdSaved ? "bg-green-600 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                {clientIdSaved ? "Saved!" : "Save Client ID"}
              </button>
            </div>
          </div>
        )}
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
