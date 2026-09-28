import * as React from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { getPendingResults, syncPendingResults } from "@/lib/offline-exam";
import { getQueue, flushQueue } from "@/lib/offline-queue";
export function OfflineBanner() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [syncing, setSyncing] = React.useState(false);
  const [syncMsg, setSyncMsg] = React.useState("");
  const pendingCount = getPendingResults().length + getQueue().length;

  React.useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const syncNow = async () => {
    setSyncing(true);
    const token = localStorage.getItem("cbt_token") ?? "";
    const base = "";
    try {
      const r1 = await syncPendingResults(base, token);
      const r2 = await flushQueue(base, token);
      setSyncMsg(`Synced ${r1.synced + r2.flushed} items`);
      setTimeout(() => setSyncMsg(""), 3000);
    } catch { setSyncMsg("Sync failed"); setTimeout(() => setSyncMsg(""), 3000); }
    setSyncing(false);
  };

  if (isOnline && pendingCount === 0 && !syncMsg) return null;

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-full shadow-lg text-sm font-medium transition-all ${isOnline ? "bg-green-600 text-white" : "bg-gray-900 text-white"}`}>
      {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      {!isOnline && <span>Offline Mode — changes will sync when connected</span>}
      {isOnline && pendingCount > 0 && (
        <>
          <span>{pendingCount} pending {pendingCount === 1 ? "item" : "items"} to sync</span>
          <button onClick={syncNow} disabled={syncing} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        </>
      )}
      {syncMsg && <><CheckCircle2 className="w-4 h-4" /><span>{syncMsg}</span></>}
    </div>
  );
}
