import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, candidatesTable, examsTable, examSessionsTable } from "@workspace/db/schema";
import { eq, and, inArray, or } from "drizzle-orm";
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

router.get("/active", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const companyId = getEffectiveCompanyId(req) ?? req.userCompanyId!;

  const sessions = await db.select().from(examSessionsTable)
    .where(and(eq(examSessionsTable.companyId, companyId), eq(examSessionsTable.status, "active")));

  if (sessions.length === 0) { res.json([]); return; }

  const examIds = [...new Set(sessions.map(s => s.examId))];
  const exams = await db.select().from(examsTable).where(inArray(examsTable.id, examIds));
  const examMap: Record<number, any> = {};
  for (const e of exams) examMap[e.id] = e;

  const candidateIds = sessions.filter(s => s.candidateId).map(s => s.candidateId!);
  const userIds = sessions.filter(s => s.userId).map(s => s.userId!);
  let candidates: any[] = [];
  let users: any[] = [];
  if (candidateIds.length > 0) candidates = await db.select().from(candidatesTable).where(inArray(candidatesTable.id, candidateIds));
  if (userIds.length > 0) users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).where(inArray(usersTable.id, userIds));
  const candidateMap: Record<number, any> = {};
  for (const c of candidates) candidateMap[c.id] = c;
  const userMap: Record<number, any> = {};
  for (const u of users) userMap[u.id] = u;

  const now = Date.now();
  const enriched = sessions.map(s => {
    const exam = examMap[s.examId];
    const startedMs = s.startedAt.getTime();
    const durationMs = (exam?.durationMinutes ?? s.durationMinutes) * 60 * 1000;
    const elapsedMs = now - startedMs;
    const remainingMs = Math.max(0, durationMs - elapsedMs);
    const progressPct = Math.min(100, (elapsedMs / durationMs) * 100);
    const isTimedOut = elapsedMs > durationMs;
    const participant = s.candidateId ? candidateMap[s.candidateId] : userMap[s.userId ?? 0];
    const name = s.candidateId
      ? (candidateMap[s.candidateId]?.fullName ?? "Unknown")
      : (userMap[s.userId ?? 0]?.name ?? "Unknown");
    return {
      sessionId: s.id,
      examId: s.examId,
      examTitle: exam?.title ?? "Unknown",
      candidateId: s.candidateId,
      userId: s.userId,
      participantName: name,
      participantUsername: s.candidateId ? (candidateMap[s.candidateId]?.username ?? "") : (userMap[s.userId ?? 0]?.email ?? ""),
      isCandidate: !!s.candidateId,
      startedAt: s.startedAt.toISOString(),
      lastActiveAt: s.lastActiveAt.toISOString(),
      currentQuestion: s.currentQuestion,
      answersCount: s.answersCount,
      durationMinutes: exam?.durationMinutes ?? s.durationMinutes,
      remainingSeconds: Math.floor(remainingMs / 1000),
      progressPct: Math.round(progressPct),
      isTimedOut,
      status: s.status,
    };
  });

  res.json(enriched);
});

router.patch("/session/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (req.isCandidate) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id);
  const { currentQuestion, answersCount } = req.body;
  await db.update(examSessionsTable)
    .set({ currentQuestion, answersCount, lastActiveAt: new Date() })
    .where(eq(examSessionsTable.id, id));
  res.json({ ok: true });
});

export default router;
