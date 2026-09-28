import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, examsTable, resultsTable, candidatesTable, companiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

async function loadUser(req: any, res: any): Promise<boolean> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return false; }
  req.userRole = user.role;
  req.userCompanyId = user.companyId;
  return true;
}

router.get("/company", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }

  const companyId = req.userCompanyId!;

  const users = await db.select().from(usersTable).where(eq(usersTable.companyId, companyId));
  const exams = await db.select().from(examsTable).where(eq(examsTable.companyId, companyId));
  const results = await db.select().from(resultsTable).where(eq(resultsTable.companyId, companyId));

  const totalResults = results.length;
  const averageScore = totalResults > 0 ? results.reduce((sum, r) => sum + r.score, 0) / totalResults : 0;

  const examStats = exams.map(exam => {
    const examResults = results.filter(r => r.examId === exam.id);
    const attempts = examResults.length;
    const avgScore = attempts > 0 ? examResults.reduce((sum, r) => sum + r.score, 0) / attempts : 0;
    const passRate = attempts > 0 ? (examResults.filter(r => r.score >= 50).length / attempts) * 100 : 0;
    return {
      examId: exam.id,
      examTitle: exam.title,
      attempts,
      averageScore: avgScore,
      passRate,
    };
  });

  res.json({
    totalExams: exams.length,
    totalUsers: users.length,
    totalResults,
    averageScore,
    examStats,
  });
});

router.get("/platform", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user || user.role !== "SuperAdmin") { res.status(403).json({ error: "Forbidden" }); return; }
    const [examsCount] = await db.select({ count: sql<number>`count(*)` }).from(examsTable);
    const [resultsCount] = await db.select({ count: sql<number>`count(*)` }).from(resultsTable);
    const [companiesCount] = await db.select({ count: sql<number>`count(*)` }).from(companiesTable);
    const [candidatesCount] = await db.select({ count: sql<number>`count(*)` }).from(candidatesTable);
    res.json({
      totalExams: Number(examsCount.count),
      totalResults: Number(resultsCount.count),
      totalCompanies: Number(companiesCount.count),
      totalCandidates: Number(candidatesCount.count),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
