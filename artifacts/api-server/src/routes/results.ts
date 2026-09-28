import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, candidatesTable, examsTable, questionsTable, resultsTable, departmentsTable, examSessionsTable } from "@workspace/db/schema";
import { eq, and, inArray, isNotNull } from "drizzle-orm";
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

async function enrichResult(result: any) {
  let user = null;
  let candidate = null;
  if (result.userId) {
    const [u] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, companyId: usersTable.companyId, isActive: usersTable.isActive, createdAt: usersTable.createdAt })
      .from(usersTable).where(eq(usersTable.id, result.userId)).limit(1);
    if (u) user = u;
  }
  if (result.candidateId) {
    const [c] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, result.candidateId)).limit(1);
    if (c) candidate = c;
  }
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, result.examId)).limit(1);
  let enrichedExam = null;
  if (exam) {
    const qs = await db.select().from(questionsTable).where(eq(questionsTable.examId, exam.id));
    enrichedExam = { ...exam, questionCount: qs.length };
  }
  return { ...result, user, candidate, exam: enrichedExam };
}

router.get("/broadsheet", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const examId = req.query.examId ? parseInt(req.query.examId as string) : undefined;
  const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
  if (!examId) { res.status(400).json({ error: "examId is required" }); return; }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId)).limit(1);
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }

  const companyId = getEffectiveCompanyId(req) ?? req.userCompanyId;
  if (req.userRole !== "SuperAdmin" && exam.companyId !== companyId) { res.status(403).json({ error: "Forbidden" }); return; }

  const qs = await db.select().from(questionsTable).where(eq(questionsTable.examId, examId));

  let candidateResults = await db.select().from(resultsTable)
    .where(and(eq(resultsTable.examId, examId), isNotNull(resultsTable.candidateId)));

  let department = null;
  if (departmentId) {
    const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, departmentId)).limit(1);
    if (dept) department = dept;
    const deptCandidates = await db.select().from(candidatesTable).where(eq(candidatesTable.departmentId, departmentId));
    const deptCandidateIds = new Set(deptCandidates.map(c => c.id));
    candidateResults = candidateResults.filter(r => r.candidateId && deptCandidateIds.has(r.candidateId));
  }

  const candidateIds = candidateResults.map(r => r.candidateId!).filter(Boolean);
  let candidates: any[] = [];
  if (candidateIds.length > 0) {
    candidates = await db.select().from(candidatesTable).where(inArray(candidatesTable.id, candidateIds));
  }
  const candidateMap: Record<number, any> = {};
  for (const c of candidates) candidateMap[c.id] = c;

  const rows = candidateResults.map(r => {
    const c = candidateMap[r.candidateId!];
    return {
      candidateId: r.candidateId!,
      resultId: r.id,
      fullName: c?.fullName ?? "Unknown",
      username: c?.username ?? "",
      score: r.score,
      correctAnswers: r.correctAnswers,
      totalQuestions: r.totalQuestions,
      timeTakenSeconds: r.timeTakenSeconds,
      isPublished: r.isPublished,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  }).sort((a, b) => b.score - a.score);

  res.json({ exam: { ...exam, questionCount: qs.length }, department, rows });
});

router.get("/my", async (req, res) => {
  if (!await loadUser(req, res)) return;
  let results;
  if (req.isCandidate) {
    results = await db.select().from(resultsTable)
      .where(and(eq(resultsTable.candidateId, req.userId!), eq(resultsTable.isPublished, true)))
      .orderBy(resultsTable.createdAt);
  } else {
    results = await db.select().from(resultsTable)
      .where(eq(resultsTable.userId, req.userId!)).orderBy(resultsTable.createdAt);
  }
  const enriched = await Promise.all(results.map(enrichResult));
  res.json(enriched);
});

router.get("/", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const companyId = getEffectiveCompanyId(req) ?? req.userCompanyId;
  let results;
  if (req.userRole === "SuperAdmin" && !companyId) {
    results = await db.select().from(resultsTable).orderBy(resultsTable.createdAt);
  } else {
    results = await db.select().from(resultsTable).where(eq(resultsTable.companyId, companyId!)).orderBy(resultsTable.createdAt);
  }
  const enriched = await Promise.all(results.map(enrichResult));
  res.json(enriched);
});

router.post("/publish", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const { resultIds, examId } = req.body;
  const companyId = getEffectiveCompanyId(req) ?? req.userCompanyId!;
  const now = new Date();

  if (examId) {
    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId)).limit(1);
    if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
    if (req.userRole !== "SuperAdmin" && exam.companyId !== companyId) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.update(resultsTable)
      .set({ isPublished: true, publishedAt: now })
      .where(and(eq(resultsTable.examId, examId), eq(resultsTable.companyId, companyId)));
    res.json({ message: "All results for exam published" });
    return;
  }

  if (resultIds?.length) {
    const ids: number[] = resultIds;
    await db.update(resultsTable)
      .set({ isPublished: true, publishedAt: now })
      .where(and(inArray(resultsTable.id, ids), eq(resultsTable.companyId, companyId)));
    res.json({ message: `${ids.length} result(s) published` });
    return;
  }

  res.status(400).json({ error: "Provide resultIds or examId" });
});

router.post("/unpublish", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const { resultIds, examId } = req.body;
  const companyId = getEffectiveCompanyId(req) ?? req.userCompanyId!;

  if (examId) {
    await db.update(resultsTable)
      .set({ isPublished: false, publishedAt: null })
      .where(and(eq(resultsTable.examId, examId), eq(resultsTable.companyId, companyId)));
    res.json({ message: "Results unpublished" });
    return;
  }

  if (resultIds?.length) {
    await db.update(resultsTable)
      .set({ isPublished: false, publishedAt: null })
      .where(and(inArray(resultsTable.id, resultIds), eq(resultsTable.companyId, companyId)));
    res.json({ message: "Results unpublished" });
    return;
  }

  res.status(400).json({ error: "Provide resultIds or examId" });
});

router.get("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  const id = parseInt(req.params.id);
  const [result] = await db.select().from(resultsTable).where(eq(resultsTable.id, id)).limit(1);
  if (!result) { res.status(404).json({ error: "Result not found" }); return; }
  if (req.userRole !== "SuperAdmin" && result.companyId !== req.userCompanyId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (req.isCandidate) {
    if (result.candidateId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (!result.isPublished) { res.status(403).json({ error: "Result not yet published" }); return; }
  }
  res.json(await enrichResult(result));
});

export default router;
