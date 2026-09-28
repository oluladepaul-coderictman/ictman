import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, coursesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, getEffectiveCompanyId } from "../lib/auth.js";

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
  const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
  const companyId = getEffectiveCompanyId(req) ?? (req.userRole !== "SuperAdmin" ? req.userCompanyId : undefined);

  let courses;
  if (departmentId) {
    courses = await db.select().from(coursesTable).where(eq(coursesTable.departmentId, departmentId)).orderBy(coursesTable.title);
  } else if (companyId) {
    courses = await db.select().from(coursesTable).where(eq(coursesTable.companyId, companyId)).orderBy(coursesTable.title);
  } else {
    courses = await db.select().from(coursesTable).orderBy(coursesTable.title);
  }
  res.json(courses);
});

router.post("/", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const { title, code, semester, departmentId, companyId: bodyCompanyId } = req.body;
  if (!title || !code || !departmentId) { res.status(400).json({ error: "title, code, departmentId are required" }); return; }
  const companyId = getEffectiveCompanyId(req) ?? bodyCompanyId ?? req.userCompanyId;
  const [course] = await db.insert(coursesTable).values({ title, code: code.toUpperCase(), semester, departmentId, companyId }).returning();
  res.status(201).json(course);
});

router.get("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  const id = parseInt(req.params.id);
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, id)).limit(1);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  res.json(course);
});

router.put("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id);
  const { title, code, semester } = req.body;
  const updateData: any = { updatedAt: new Date() };
  if (title) updateData.title = title;
  if (code) updateData.code = code.toUpperCase();
  if (semester !== undefined) updateData.semester = semester;
  const [course] = await db.update(coursesTable).set(updateData).where(eq(coursesTable.id, id)).returning();
  res.json(course);
});

router.delete("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id);
  await db.delete(coursesTable).where(eq(coursesTable.id, id));
  res.json({ message: "Course deleted" });
});

export default router;
