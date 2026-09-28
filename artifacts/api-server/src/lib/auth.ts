import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "cbt-salt-2024").digest("hex");
}

export function generateToken(userId: number, isCandidate = false): string {
  const payload = { userId, isCandidate, ts: Date.now() };
  const data = JSON.stringify(payload);
  const sig = crypto.createHash("sha256").update(data + "cbt-token-secret").digest("hex");
  return Buffer.from(data).toString("base64") + "." + sig;
}

export function verifyToken(token: string): { userId: number; isCandidate: boolean } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const data = Buffer.from(parts[0], "base64").toString("utf-8");
    const expectedSig = crypto.createHash("sha256").update(data + "cbt-token-secret").digest("hex");
    if (parts[1] !== expectedSig) return null;
    const parsed = JSON.parse(data);
    return { userId: parsed.userId, isCandidate: parsed.isCandidate ?? false };
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: string;
      userCompanyId?: number | null;
      isCandidate?: boolean;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  req.userId = payload.userId;
  req.isCandidate = payload.isCandidate;
  next();
}

export function getEffectiveCompanyId(req: Request): number | null {
  if (req.userRole === "SuperAdmin") {
    const override = req.headers["x-company-override"];
    if (override && typeof override === "string") {
      const id = parseInt(override);
      if (!isNaN(id)) return id;
    }
  }
  return req.userCompanyId ?? null;
}
