const QUEUE_KEY = "cbt_offline_queue";
const CACHE_KEY = "cbt_offline_cache";

export interface QueuedRequest {
  id: string;
  method: string;
  path: string;
  body?: any;
  timestamp: number;
  retries: number;
}

export interface OfflineCache {
  [key: string]: { data: any; timestamp: number; ttl: number };
}

export function getQueue(): QueuedRequest[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]"); } catch { return []; }
}

export function addToQueue(method: string, path: string, body?: any) {
  const queue = getQueue();
  queue.push({ id: `${Date.now()}-${Math.random()}`, method, path, body, timestamp: Date.now(), retries: 0 });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeFromQueue(id: string) {
  const queue = getQueue().filter(q => q.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueueCount(): number { return getQueue().length; }

export function cacheData(key: string, data: any, ttlSeconds = 3600) {
  const cache: OfflineCache = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  cache[key] = { data, timestamp: Date.now(), ttl: ttlSeconds * 1000 };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function getCached<T>(key: string): T | null {
  try {
    const cache: OfflineCache = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) return null;
    return entry.data as T;
  } catch { return null; }
}

export function clearCache() { localStorage.removeItem(CACHE_KEY); }
export function clearQueue() { localStorage.removeItem(QUEUE_KEY); }

export async function flushQueue(apiBase: string, token: string | null): Promise<{ flushed: number; failed: number }> {
  const queue = getQueue();
  if (queue.length === 0) return { flushed: 0, failed: 0 };
  let flushed = 0; let failed = 0;
  for (const req of queue) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${apiBase}${req.path}`, {
        method: req.method, headers,
        body: req.body ? JSON.stringify(req.body) : undefined,
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) { removeFromQueue(req.id); flushed++; }
      else failed++;
    } catch { failed++; }
  }
  return { flushed, failed };
}
