import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, hashPassword, getEffectiveCompanyId } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

async function loadUser(req: any, res: any): Promise<boolean> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return false; }
  req.userRole = user.role;
  req.userCompanyId = user.companyId;
  return true;
}

router.get("/", async (req, res) => {
  if (!await loadUser(req, res)) return;
  let users;
  if (req.userRole === "SuperAdmin") {
    const companyId = getEffectiveCompanyId(req);
    if (companyId) {
      users = await db.select().from(usersTable).where(eq(usersTable.companyId, companyId)).orderBy(usersTable.createdAt);
    } else {
      users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
    }
  } else if (req.userRole === "CompanyAdmin") {
    users = await db.select().from(usersTable).where(eq(usersTable.companyId, req.userCompanyId!)).orderBy(usersTable.createdAt);
  } else {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  res.json(users.map(({ passwordHash: _, ...u }) => u));
});

router.post("/", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const { email, password, name, role, companyId } = req.body;
  if (!email || !password || !name || !role) {
    res.status(400).json({ error: "email, password, name, role are required" }); return;
  }
  const effectiveCompanyId = req.userRole === "SuperAdmin" ? companyId : req.userCompanyId;
  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    name,
    role,
    companyId: effectiveCompanyId,
  }).returning();
  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json(safeUser);
});

router.get("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  const id = parseInt(req.params.id);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (req.userRole !== "SuperAdmin" && user.companyId !== req.userCompanyId) { res.status(403).json({ error: "Forbidden" }); return; }
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

router.patch("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  const id = parseInt(req.params.id);
  const existing = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing[0]) { res.status(404).json({ error: "User not found" }); return; }
  const isSelf = req.userId === id;
  if (!isSelf && req.userRole !== "SuperAdmin" && existing[0].companyId !== req.userCompanyId) { res.status(403).json({ error: "Forbidden" }); return; }
  const { name, email, role, isActive } = req.body;
  const updateData: any = { updatedAt: new Date() };
  if (name) updateData.name = name;
  if (email) updateData.email = email.toLowerCase();
  if (role && ["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) updateData.role = role;
  if (isActive !== undefined && ["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) updateData.isActive = isActive;
  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

router.post("/:id/password", async (req, res) => {
  if (!await loadUser(req, res)) return;
  const id = parseInt(req.params.id);
  if (req.userId !== id && req.userRole !== "SuperAdmin") { res.status(403).json({ error: "Forbidden" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) { res.status(400).json({ error: "New password must be at least 6 characters" }); return; }
  if (req.userId === id) {
    const current = hashPassword(oldPassword ?? "");
    if (current !== user.passwordHash) { res.status(401).json({ error: "Current password is incorrect" }); return; }
  }
  await db.update(usersTable).set({ passwordHash: hashPassword(newPassword), updatedAt: new Date() }).where(eq(usersTable.id, id));
  res.json({ message: "Password changed successfully" });
});

router.put("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  const id = parseInt(req.params.id);
  const existing = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing[0]) { res.status(404).json({ error: "User not found" }); return; }
  if (req.userRole !== "SuperAdmin" && existing[0].companyId !== req.userCompanyId) { res.status(403).json({ error: "Forbidden" }); return; }
  const { email, name, role, isActive, password } = req.body;
  const updateData: any = { updatedAt: new Date() };
  if (email) updateData.email = email.toLowerCase();
  if (name) updateData.name = name;
  if (role) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (password) updateData.passwordHash = hashPassword(password);
  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

router.delete("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  const id = parseInt(req.params.id);
  const existing = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!existing[0]) { res.status(404).json({ error: "User not found" }); return; }
  if (req.userRole !== "SuperAdmin" && existing[0].companyId !== req.userCompanyId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ message: "User deleted" });
});

export default router;
