import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, candidatesTable, examsTable, questionsTable, resultsTable, candidateExamAssignmentsTable, examSessionsTable } from "@workspace/db/schema";
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

router.get("/", async (req, res) => {
  if (!await loadUser(req, res)) return;
  let exams;
  if (req.userRole === "SuperAdmin") {
    const companyId = getEffectiveCompanyId(req);
    exams = companyId
      ? await db.select().from(examsTable).where(eq(examsTable.companyId, companyId)).orderBy(examsTable.createdAt)
      : await db.select().from(examsTable).orderBy(examsTable.createdAt);
  } else {
    exams = await db.select().from(examsTable).where(eq(examsTable.companyId, req.userCompanyId!)).orderBy(examsTable.createdAt);
  }
  const examIds = exams.map(e => e.id);
  let questionCounts: Record<number, number> = {};
  if (examIds.length > 0) {
    const qs = await db.select().from(questionsTable).where(inArray(questionsTable.examId, examIds));
    for (const q of qs) questionCounts[q.examId] = (questionCounts[q.examId] || 0) + 1;
  }
  res.json(exams.map(e => ({ ...e, questionCount: questionCounts[e.id] || 0 })));
});

router.post("/", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const { title, description, durationMinutes, isActive, isAiGenerated, courseId, questions } = req.body;
  if (!title || !durationMinutes || !questions?.length) {
    res.status(400).json({ error: "title, durationMinutes, questions are required" }); return;
  }
  const companyId = getEffectiveCompanyId(req) ?? req.userCompanyId!;
  const [exam] = await db.insert(examsTable).values({
    title, description, durationMinutes, isActive: isActive ?? true,
    isAiGenerated: isAiGenerated ?? false, courseId: courseId ?? null,
    companyId, createdById: req.isCandidate ? undefined : req.userId,
  }).returning();
  const questionRows = questions.map((q: any, i: number) => ({
    examId: exam.id, text: q.text, options: q.options, correctIndex: q.correctIndex,
    explanation: q.explanation ?? null, order: q.order ?? i,
  }));
  await db.insert(questionsTable).values(questionRows);
  res.status(201).json({ ...exam, questionCount: questionRows.length });
});

router.get("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  const id = parseInt(req.params.id);
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, id)).limit(1);
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
  if (req.userRole !== "SuperAdmin" && exam.companyId !== req.userCompanyId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (req.userRole === "Candidate") {
    // Course-linked exams are open to all candidates from the same company (public portal)
    if (!exam.courseId) {
      const assigned = await db.select().from(candidateExamAssignmentsTable)
        .where(and(eq(candidateExamAssignmentsTable.candidateId, req.userId!), eq(candidateExamAssignmentsTable.examId, id))).limit(1);
      if (assigned.length === 0) { res.status(403).json({ error: "This exam is not assigned to you" }); return; }
    }
  }
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, id)).orderBy(questionsTable.order);
  const safeQuestions = (req.userRole === "Staff" || req.userRole === "Candidate")
    ? questions.map(({ correctIndex: _, ...q }) => ({ ...q, correctIndex: -1 }))
    : questions;

  if (req.userRole === "Candidate" || req.userRole === "Staff") {
    const existingSessions = await db.select().from(examSessionsTable)
      .where(and(
        eq(examSessionsTable.examId, id),
        req.isCandidate ? eq(examSessionsTable.candidateId, req.userId!) : eq(examSessionsTable.userId, req.userId!),
        eq(examSessionsTable.status, "active")
      )).limit(1);
    if (existingSessions.length === 0) {
      await db.insert(examSessionsTable).values({
        examId: id,
        candidateId: req.isCandidate ? req.userId! : null,
        userId: req.isCandidate ? null : req.userId!,
        companyId: exam.companyId,
        durationMinutes: exam.durationMinutes,
        status: "active",
      });
    } else {
      await db.update(examSessionsTable)
        .set({ lastActiveAt: new Date() })
        .where(eq(examSessionsTable.id, existingSessions[0].id));
    }
  }

  res.json({ ...exam, questions: safeQuestions });
});

router.patch("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(examsTable).where(eq(examsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Exam not found" }); return; }
  const companyId = getEffectiveCompanyId(req);
  if (req.userRole !== "SuperAdmin" && existing.companyId !== companyId) { res.status(403).json({ error: "Forbidden" }); return; }
  const updates: any = { updatedAt: new Date() };
  const allowed = ["title","description","durationMinutes","isActive","passMark","shuffleQuestions","allowReview","startDate","endDate","maxAttempts","courseId"];
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k] === "" ? null : req.body[k];
  }
  const [exam] = await db.update(examsTable).set(updates).where(eq(examsTable.id, id)).returning();
  const allQ = await db.select().from(questionsTable).where(eq(questionsTable.examId, id));
  res.json({ ...exam, questionCount: allQ.length });
});

router.put("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(examsTable).where(eq(examsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Exam not found" }); return; }
  const companyId = getEffectiveCompanyId(req);
  if (req.userRole !== "SuperAdmin" && existing.companyId !== companyId) { res.status(403).json({ error: "Forbidden" }); return; }
  const { title, description, durationMinutes, isActive, isAiGenerated, courseId, questions } = req.body;
  const [exam] = await db.update(examsTable)
    .set({ title, description, durationMinutes, isActive, isAiGenerated, courseId: courseId ?? null, updatedAt: new Date() })
    .where(eq(examsTable.id, id)).returning();
  if (questions) {
    await db.delete(questionsTable).where(eq(questionsTable.examId, id));
    if (questions.length > 0) {
      await db.insert(questionsTable).values(questions.map((q: any, i: number) => ({
        examId: id, text: q.text, options: q.options, correctIndex: q.correctIndex,
        explanation: q.explanation ?? null, order: q.order ?? i,
      })));
    }
  }
  const allQuestions = await db.select().from(questionsTable).where(eq(questionsTable.examId, id));
  res.json({ ...exam, questionCount: allQuestions.length });
});

router.delete("/:id", async (req, res) => {
  if (!await loadUser(req, res)) return;
  if (!["SuperAdmin", "CompanyAdmin"].includes(req.userRole!)) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(examsTable).where(eq(examsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Exam not found" }); return; }
  const companyId = getEffectiveCompanyId(req);
  if (req.userRole !== "SuperAdmin" && existing.companyId !== companyId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(examsTable).where(eq(examsTable.id, id));
  res.json({ message: "Exam deleted" });
});

router.post("/:id/submit", async (req, res) => {
  if (!await loadUser(req, res)) return;
  const examId = parseInt(req.params.id);
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId)).limit(1);
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
  if (exam.companyId !== req.userCompanyId) { res.status(403).json({ error: "Forbidden" }); return; }
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, examId));
  const { answers, timeTakenSeconds } = req.body;
  let correctAnswers = 0;
  const gradedAnswers = (answers || []).map((a: { questionId: number; selectedIndex: number }) => {
    const q = questions.find(q => q.id === a.questionId);
    const isCorrect = q ? q.correctIndex === a.selectedIndex : false;
    if (isCorrect) correctAnswers++;
    return { ...a, isCorrect };
  });
  const score = questions.length > 0 ? (correctAnswers / questions.length) * 100 : 0;
  const [result] = await db.insert(resultsTable).values({
    userId: req.isCandidate ? null : req.userId!,
    candidateId: req.isCandidate ? req.userId! : null,
    examId,
    companyId: exam.companyId,
    score,
    totalQuestions: questions.length,
    correctAnswers,
    timeTakenSeconds: timeTakenSeconds || 0,
    answers: gradedAnswers,
    isPublished: false,
  }).returning();

  await db.update(examSessionsTable)
    .set({ status: "submitted", lastActiveAt: new Date() })
    .where(and(
      eq(examSessionsTable.examId, examId),
      req.isCandidate ? eq(examSessionsTable.candidateId, req.userId!) : eq(examSessionsTable.userId, req.userId!),
      eq(examSessionsTable.status, "active")
    ));

  if (req.isCandidate) {
    res.json({
      resultId: result.id,
      submitted: true,
      message: "Your exam has been submitted successfully. Results will be available once your lecturer releases them.",
    });
    return;
  }

  // Staff: show immediate result slip
  const enrichedQuestions = questions.map(q => {
    const submitted = (answers || []).find((a: any) => a.questionId === q.id);
    return {
      id: q.id,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      selectedIndex: submitted?.selectedIndex ?? -1,
      isCorrect: submitted ? q.correctIndex === submitted.selectedIndex : false,
    };
  });

  res.json({
    ...result,
    exam: { id: exam.id, title: exam.title, durationMinutes: exam.durationMinutes },
    gradedQuestions: enrichedQuestions,
    passed: score >= 50,
  });
});

export default router;
