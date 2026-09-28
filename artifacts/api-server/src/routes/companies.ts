import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, hashPassword } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

async function loadUser(req: any, res: any): Promise<boolean> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return false; }
  req.userRole = user.role;
  req.userCompanyId = user.companyId;
  return true;
}

router.get("/", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (req.userRole !== "SuperAdmin") { res.status(403).json({ error: "Forbidden" }); return; }
  const companies = await db.select().from(companiesTable).orderBy(companiesTable.createdAt);
  res.json(companies);
});

router.post("/", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (req.userRole !== "SuperAdmin") { res.status(403).json({ error: "Forbidden" }); return; }
  const { name, slug, type, logoUrl, primaryColor, adminEmail, adminPassword, adminName } = req.body;
  if (!name || !adminEmail || !adminPassword || !adminName) {
    res.status(400).json({ error: "name, adminEmail, adminPassword, adminName are required" }); return;
  }
  const finalSlug = slug || slugify(name);
  const [company] = await db.insert(companiesTable).values({ name, slug: finalSlug, type: type || "Educational", logoUrl, primaryColor }).returning();
  await db.insert(usersTable).values({
    email: adminEmail.toLowerCase(),
    passwordHash: hashPassword(adminPassword),
    name: adminName,
    role: "CompanyAdmin",
    companyId: company.id,
  });
  res.status(201).json(company);
});

router.get("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  const id = parseInt(req.params.id);
  if (req.userRole !== "SuperAdmin" && req.userCompanyId !== id) { res.status(403).json({ error: "Forbidden" }); return; }
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id)).limit(1);
  if (!company) { res.status(404).json({ error: "Company not found" }); return; }
  res.json(company);
});

router.patch("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  const id = parseInt(req.params.id);
  if (req.userRole !== "SuperAdmin" && req.userCompanyId !== id) { res.status(403).json({ error: "Forbidden" }); return; }
  const allowed = ["name","slug","type","logoUrl","primaryColor","isActive","passMark","gradeScale","timezone","website","address","phone","paulinaPersonality"];
  const updateData: any = { updatedAt: new Date() };
  for (const k of allowed) {
    if (req.body[k] !== undefined) updateData[k] = req.body[k];
  }
  if (req.body.name && !req.body.slug) updateData.slug = slugify(req.body.name);
  const [company] = await db.update(companiesTable).set(updateData).where(eq(companiesTable.id, id)).returning();
  if (!company) { res.status(404).json({ error: "Company not found" }); return; }
  res.json(company);
});

router.put("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  const id = parseInt(req.params.id);
  if (req.userRole !== "SuperAdmin" && req.userCompanyId !== id) { res.status(403).json({ error: "Forbidden" }); return; }
  const { name, slug, type, logoUrl, primaryColor, isActive } = req.body;
  const updateData: any = { updatedAt: new Date() };
  if (name !== undefined) updateData.name = name;
  if (slug !== undefined) updateData.slug = slug;
  else if (name) updateData.slug = slugify(name);
  if (type !== undefined) updateData.type = type;
  if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
  if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
  if (isActive !== undefined) updateData.isActive = isActive;
  const [company] = await db.update(companiesTable).set(updateData).where(eq(companiesTable.id, id)).returning();
  if (!company) { res.status(404).json({ error: "Company not found" }); return; }
  res.json(company);
});

router.delete("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (req.userRole !== "SuperAdmin") { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id);
  await db.delete(companiesTable).where(eq(companiesTable.id, id));
  res.json({ message: "Company deleted" });
});

export default router;
