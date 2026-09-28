import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, candidatesTable, departmentsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, getEffectiveCompanyId } from "../lib/auth.js";

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
  const companyId = getEffectiveCompanyId(req) ?? (req.userRole !== "SuperAdmin" ? req.userCompanyId : undefined);
  let depts;
  if (companyId) {
    depts = await db.select().from(departmentsTable).where(eq(departmentsTable.companyId, companyId)).orderBy(departmentsTable.name);
  } else {
    depts = await db.select().from(departmentsTable).orderBy(departmentsTable.name);
  }
  res.json(depts);
});

router.post("/", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const { name, slug, companyId: bodyCompanyId } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const companyId = getEffectiveCompanyId(req) ?? bodyCompanyId ?? req.userCompanyId;
  if (!companyId) { res.status(400).json({ error: "companyId is required" }); return; }
  const [dept] = await db.insert(departmentsTable).values({ name, slug: slug || slugify(name), companyId }).returning();
  res.status(201).json(dept);
});

router.get("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  const id = parseInt(req.params.id);
  const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, id)).limit(1);
  if (!dept) { res.status(404).json({ error: "Department not found" }); return; }
  res.json(dept);
});

router.put("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id);
  const { name, slug } = req.body;
  const updateData: any = { updatedAt: new Date() };
  if (name) { updateData.name = name; updateData.slug = slug || slugify(name); }
  if (slug) updateData.slug = slug;
  const [dept] = await db.update(departmentsTable).set(updateData).where(eq(departmentsTable.id, id)).returning();
  res.json(dept);
});

router.delete("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id);
  await db.delete(departmentsTable).where(eq(departmentsTable.id, id));
  res.json({ message: "Department deleted" });
});

export default router;
