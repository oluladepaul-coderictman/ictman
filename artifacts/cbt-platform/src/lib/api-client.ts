/**
 * Central API client — always uses relative URLs since the app is hosted on Replit.
 * The Express API server is mounted at /api via the shared proxy.
 */
export async function apiClient<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("cbt_token");
  const impersonateRaw = sessionStorage.getItem("cbt_impersonate");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (impersonateRaw) {
    try {
      const imp = JSON.parse(impersonateRaw);
      if (imp?.id) headers["X-Company-Override"] = String(imp.id);
    } catch { }
  }

  // Always relative — /api/... works both in dev and on Replit hosting
  const url = path.startsWith("http") ? path : path;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") throw new Error("Request timed out — please check your internet connection");
    throw err;
  }
}
