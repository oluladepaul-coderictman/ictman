import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, Info, AlertTriangle, X, BellOff } from "lucide-react";
import { format } from "date-fns";

interface Notification {
  id: string;
  type: "info" | "success" | "warning";
  title: string;
  message: string;
  time: Date;
  read: boolean;
}

const STORAGE_KEY = "cbt_notifications";

function loadNotifications(): Notification[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function saveNotifications(ns: Notification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ns));
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<Notification[]>(loadNotifications);

  const markRead = (id: string) => {
    setNotifications(prev => { const n = prev.map(x => x.id === id ? { ...x, read: true } : x); saveNotifications(n); return n; });
  };
  const markAllRead = () => {
    setNotifications(prev => { const n = prev.map(x => ({ ...x, read: true })); saveNotifications(n); return n; });
  };
  const dismiss = (id: string) => {
    setNotifications(prev => { const n = prev.filter(x => x.id !== id); saveNotifications(n); return n; });
  };
  const clearAll = () => { setNotifications([]); saveNotifications([]); };

  const unread = notifications.filter(n => !n.read).length;

  const iconMap = {
    info: <Info className="w-4 h-4 text-blue-500" />,
    success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-7 h-7" /> Notifications
            {unread > 0 && <span className="text-sm bg-red-500 text-white rounded-full px-2 py-0.5">{unread}</span>}
          </h1>
          <p className="text-gray-500 mt-1">System and activity notifications</p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && <Button size="sm" variant="outline" onClick={markAllRead}>Mark all read</Button>}
          {notifications.length > 0 && <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={clearAll}>Clear all</Button>}
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BellOff className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No notifications</p>
            <p className="text-gray-400 text-sm mt-1">You're all caught up! New activity will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${n.read ? "border-gray-100 bg-white" : "border-blue-100 bg-blue-50/50"}`}
              onClick={() => markRead(n.id)}
            >
              <div className="shrink-0 mt-0.5">{iconMap[n.type]}</div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.read ? "text-gray-700" : "text-gray-900 font-semibold"}`}>{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{format(new Date(n.time), "dd MMM yyyy, HH:mm")}</p>
              </div>
              {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />}
              <button onClick={e => { e.stopPropagation(); dismiss(n.id); }} className="shrink-0 text-gray-300 hover:text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function addNotification(type: "info" | "success" | "warning", title: string, message: string) {
  const existing = loadNotifications();
  const n: Notification = { id: Date.now().toString(), type, title, message, time: new Date(), read: false };
  saveNotifications([n, ...existing].slice(0, 50));
}
