import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, candidatesTable, candidateExamAssignmentsTable, examsTable, questionsTable } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, getEffectiveCompanyId } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

async function loadUser(req: any, res: any): Promise<boolean> {
  if (req.isCandidate) {
    const [candidate] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, req.userId!)).limit(1);
    if (!candidate) { res.status(401).json({ error: "Unauthorized" }); return false; }
    req.userRole = "Candidate";
    req.userCompanyId = candidate.companyId;
    return true;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return false; }
  req.userRole = user.role;
  req.userCompanyId = user.companyId;
  return true;
}

async function getExamsForIds(examIds: number[]) {
  if (examIds.length === 0) return [];
  const exams = await db.select().from(examsTable).where(inArray(examsTable.id, examIds));
  const examIdSet = examIds;
  const qs = await db.select().from(questionsTable).where(inArray(questionsTable.examId, examIdSet));
  const qCounts: Record<number, number> = {};
  for (const q of qs) qCounts[q.examId] = (qCounts[q.examId] || 0) + 1;
  return exams.map(e => ({ ...e, questionCount: qCounts[e.id] || 0 }));
}

router.get("/my-exams", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (req.userRole !== "Candidate") { res.status(403).json({ error: "Candidates only" }); return; }
  const assignments = await db.select().from(candidateExamAssignmentsTable).where(eq(candidateExamAssignmentsTable.candidateId, req.userId!));
  const examIds = assignments.map(a => a.examId);
  res.json(await getExamsForIds(examIds));
});

router.get("/", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const companyId = getEffectiveCompanyId(req);
  let candidates;
  if (req.userRole === "SuperAdmin" && !companyId) {
    candidates = await db.select().from(candidatesTable).orderBy(candidatesTable.createdAt);
  } else {
    candidates = await db.select().from(candidatesTable).where(eq(candidatesTable.companyId, companyId!)).orderBy(candidatesTable.createdAt);
  }
  res.json(candidates);
});

router.post("/", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const { fullName, username, password, companyId: bodyCompanyId } = req.body;
  if (!fullName || !username || !password) {
    res.status(400).json({ error: "fullName, username, password are required" }); return;
  }
  const { departmentId } = req.body;
  const effectiveCompanyId = getEffectiveCompanyId(req) ?? bodyCompanyId;
  if (!effectiveCompanyId) { res.status(400).json({ error: "companyId is required" }); return; }
  const existing = await db.select().from(candidatesTable).where(eq(candidatesTable.username, username)).limit(1);
  if (existing.length > 0) { res.status(400).json({ error: "Username already taken" }); return; }
  const [candidate] = await db.insert(candidatesTable).values({ fullName, username, password, companyId: effectiveCompanyId, departmentId: departmentId ?? null }).returning();
  res.status(201).json(candidate);
});

router.get("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id);
  const [candidate] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, id)).limit(1);
  if (!candidate) { res.status(404).json({ error: "Candidate not found" }); return; }
  const companyId = getEffectiveCompanyId(req);
  if (req.userRole !== "SuperAdmin" && candidate.companyId !== companyId) { res.status(403).json({ error: "Forbidden" }); return; }
  const assignments = await db.select().from(candidateExamAssignmentsTable).where(eq(candidateExamAssignmentsTable.candidateId, id));
  const examIds = assignments.map(a => a.examId);
  const assignedExams = await getExamsForIds(examIds);
  res.json({ ...candidate, assignedExams });
});

router.put("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Candidate not found" }); return; }
  const companyId = getEffectiveCompanyId(req);
  if (req.userRole !== "SuperAdmin" && existing.companyId !== companyId) { res.status(403).json({ error: "Forbidden" }); return; }
  const { fullName, username, password, isActive, departmentId } = req.body;
  const updateData: any = { updatedAt: new Date() };
  if (fullName !== undefined) updateData.fullName = fullName;
  if (username !== undefined) updateData.username = username;
  if (password !== undefined) updateData.password = password;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (departmentId !== undefined) updateData.departmentId = departmentId;
  const [candidate] = await db.update(candidatesTable).set(updateData).where(eq(candidatesTable.id, id)).returning();
  res.json(candidate);
});

router.delete("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Candidate not found" }); return; }
  const companyId = getEffectiveCompanyId(req);
  if (req.userRole !== "SuperAdmin" && existing.companyId !== companyId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(candidatesTable).where(eq(candidatesTable.id, id));
  res.json({ message: "Candidate deleted" });
});

router.post("/:id/assign-exams", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Candidate not found" }); return; }
  const companyId = getEffectiveCompanyId(req);
  if (req.userRole !== "SuperAdmin" && existing.companyId !== companyId) { res.status(403).json({ error: "Forbidden" }); return; }
  const { examIds } = req.body;
  if (!Array.isArray(examIds)) { res.status(400).json({ error: "examIds must be an array" }); return; }
  await db.delete(candidateExamAssignmentsTable).where(eq(candidateExamAssignmentsTable.candidateId, id));
  if (examIds.length > 0) {
    await db.insert(candidateExamAssignmentsTable).values(examIds.map((examId: number) => ({ candidateId: id, examId })));
  }
  res.json({ message: `Assigned ${examIds.length} exam(s)` });
});

export default router;
