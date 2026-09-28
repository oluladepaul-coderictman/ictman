import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, candidatesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, generateToken, requireAuth } from "../lib/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  let passwordValid = false;
  if (user.role === "SuperAdmin") {
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD;
    if (!superAdminPassword) {
      console.error("SUPERADMIN_PASSWORD secret is not set");
      res.status(500).json({ error: "Server misconfiguration: SuperAdmin password not set" });
      return;
    }
    passwordValid = password === superAdminPassword;
  } else {
    passwordValid = user.passwordHash === hashPassword(password);
  }

  if (!passwordValid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (!user.isActive) {
    res.status(401).json({ error: "Account is deactivated" });
    return;
  }
  const token = generateToken(user.id, false);
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

router.post("/candidate-login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }
  const [candidate] = await db.select().from(candidatesTable).where(eq(candidatesTable.username, username.toLowerCase().trim())).limit(1);
  if (!candidate || candidate.password !== password) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  if (!candidate.isActive) {
    res.status(401).json({ error: "Account is deactivated" });
    return;
  }
  const token = generateToken(candidate.id, true);
  const userShape = {
    id: candidate.id,
    email: null,
    name: candidate.fullName,
    role: "Candidate" as const,
    companyId: candidate.companyId,
    isActive: candidate.isActive,
    createdAt: candidate.createdAt.toISOString(),
  };
  res.json({ user: userShape, token });
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/me", requireAuth, async (req, res) => {
  if (req.isCandidate) {
    const [candidate] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, req.userId!)).limit(1);
    if (!candidate) { res.status(404).json({ error: "Candidate not found" }); return; }
    res.json({
      id: candidate.id,
      email: null,
      name: candidate.fullName,
      role: "Candidate",
      companyId: candidate.companyId,
      isActive: candidate.isActive,
      createdAt: candidate.createdAt.toISOString(),
    });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

export default router;
