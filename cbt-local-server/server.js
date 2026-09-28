/**
 * CBT Bulldozer — Standalone Local Server
 * Run with: node server.js
 * Or use the START-WINDOWS.ps1 / START-LINUX-MAC.sh scripts
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    server: "CBT Bulldozer Local Server",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? "connected" : "not configured",
  });
});

// ─── Proxy to main API server ──────────────────────────────────────────────────
// This local server proxies all /api/* requests to the actual CBT API
// Configure API_TARGET in .env to point to your Replit deployment
const API_TARGET = process.env.API_TARGET || null;

if (API_TARGET) {
  const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

  app.all("/api/*", async (req, res) => {
    try {
      const targetUrl = `${API_TARGET}${req.url}`;
      const headers = { ...req.headers, host: new URL(API_TARGET).host };
      delete headers["content-length"];

      const proxyRes = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
        signal: AbortSignal.timeout(30000),
      });

      res.status(proxyRes.status);
      proxyRes.headers.forEach((val, key) => {
        if (!["transfer-encoding", "connection"].includes(key.toLowerCase())) res.setHeader(key, val);
      });
      const data = await proxyRes.text();
      res.send(data);
    } catch (e) {
      res.status(502).json({ error: `Proxy error: ${e.message}` });
    }
  });

  console.log(`[Proxy] API requests → ${API_TARGET}`);
} else {
  app.all("/api/*", (req, res) => {
    res.status(503).json({
      error: "API_TARGET not configured in .env. Set it to your CBT API server URL.",
      hint: "Example: API_TARGET=https://your-replit-app.repl.co"
    });
  });
}

// ─── Serve static frontend (if built) ─────────────────────────────────────────
const staticDir = path.join(__dirname, "public");
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get("*", (req, res) => {
    if (!req.url.startsWith("/api")) {
      res.sendFile(path.join(staticDir, "index.html"));
    }
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  const os = require("os");
  const nets = os.networkInterfaces();
  let localIp = "localhost";
  for (const n of Object.values(nets)) {
    for (const addr of n) {
      if (addr.family === "IPv4" && !addr.internal) { localIp = addr.address; break; }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("  CBT Bulldozer Local Server — RUNNING");
  console.log("=".repeat(50));
  console.log(`  Local:    http://localhost:${PORT}`);
  console.log(`  Network:  http://${localIp}:${PORT}`);
  console.log("");
  console.log(`  Phone APK server address:`);
  console.log(`  → http://${localIp}:${PORT}`);
  console.log("");
  console.log("  Keep this window open to keep server running!");
  console.log("=".repeat(50) + "\n");
});

process.on("SIGTERM", () => { console.log("\nServer stopped."); process.exit(0); });
process.on("SIGINT", () => { console.log("\nServer stopped."); process.exit(0); });
