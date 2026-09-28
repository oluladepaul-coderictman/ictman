/**
 * Self-ping keepalive — prevents Replit from sleeping the server.
 * Pings /health every 55 seconds.
 */
export function startKeepalive(port: number) {
  const url = `http://localhost:${port}/health`;
  setInterval(async () => {
    try {
      await fetch(url);
    } catch {
      // ignore — server may be briefly busy
    }
  }, 55_000);
  console.log("[Keepalive] Self-ping started — server will stay awake 24/7");
}
