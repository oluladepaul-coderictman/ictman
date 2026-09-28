import { Router } from "express";
import { requireAuth, getEffectiveCompanyId } from "../lib/auth.js";
import { db } from "@workspace/db";
import { coursesTable, departmentsTable, examsTable, questionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { runInference, extractJson, getModelStatus } from "../lib/paulina-model.js";

const router = Router();
router.use(requireAuth);

const SYSTEM_PROMPT = "You are an expert university exam question writer. Always respond with valid JSON only. Never include markdown fences, explanations, or any text outside the JSON array.";

async function generateQuestionsLocal(topic: string, difficulty: string, count: number): Promise<any[]> {
  const prompt = `Generate exactly ${count} multiple-choice questions about "${topic}" at ${difficulty} difficulty.

Rules:
- Each question has exactly 4 answer options
- One option is clearly correct (correctIndex: 0-3)
- Include a brief explanation for the correct answer

Respond with ONLY a JSON array. Example:
[{"text":"What is X?","options":["A","B","C","D"],"correctIndex":0,"explanation":"A is correct because..."}]

Now generate ${count} questions about "${topic}":`;

  const raw = await runInference(SYSTEM_PROMPT, prompt, Math.min(count * 300, 4096));
  const parsed = extractJson(raw);
  return parsed
    .filter((q: any) => q.text && Array.isArray(q.options) && q.options.length === 4 && typeof q.correctIndex === "number")
    .slice(0, count)
    .map((q: any) => ({
      text: String(q.text),
      options: q.options.map(String),
      correctIndex: Number(q.correctIndex),
      explanation: q.explanation ? String(q.explanation) : null,
    }));
}

router.get("/status", (req, res) => {
  res.json(getModelStatus());
});

router.post("/generate-questions", async (req, res) => {
  const { topic, difficulty, count } = req.body;
  if (!topic || !difficulty || !count) {
    res.status(400).json({ error: "topic, difficulty, and count are required" });
    return;
  }
  const { loaded, loading } = getModelStatus();
  if (!loaded) {
    res.status(503).json({ error: loading ? "AI model is still loading, please wait a moment and try again." : "AI model not available. Please contact your administrator." });
    return;
  }
  const numQuestions = Math.min(Math.max(parseInt(count), 1), 50);
  try {
    const questions = await generateQuestionsLocal(topic, difficulty, numQuestions);
    if (questions.length === 0) {
      res.status(500).json({ error: "AI returned no valid questions. Please try again." });
      return;
    }
    res.json({ questions });
  } catch (err: any) {
    console.error("AI generation error:", err);
    res.status(500).json({ error: "Failed to generate questions. Please try again." });
  }
});

router.post("/set-course-questions", async (req: any, res) => {
  const { courseId, count, difficulty, durationMinutes } = req.body;
  if (!courseId || !count) {
    res.status(400).json({ error: "courseId and count are required" });
    return;
  }

  const { loaded, loading } = getModelStatus();
  if (!loaded) {
    res.status(503).json({ error: loading ? "AI model is still loading, please wait and try again." : "AI model not available." });
    return;
  }

  const numQuestions = Math.min(Math.max(parseInt(count), 1), 100);
  const level = difficulty || "medium";
  const duration = durationMinutes ? parseInt(durationMinutes) : Math.max(numQuestions * 2, 30);

  try {
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }

    const companyId = getEffectiveCompanyId(req) ?? (req as any).userCompanyId;
    let deptName = "";
    if (course.departmentId) {
      const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, course.departmentId)).limit(1);
      if (dept) deptName = dept.name;
    }

    let topic = `${course.title} (${course.code})${deptName ? " — " + deptName : ""}`;
    if (course.syllabus) {
      topic += `\n\nCourse Syllabus:\n${course.syllabus.slice(0, 3000)}`;
    }
    const questions = await generateQuestionsLocal(topic, level, numQuestions);
    if (questions.length === 0) {
      res.status(500).json({ error: "AI returned no valid questions. Please try again." });
      return;
    }

    const existing = await db.select().from(examsTable)
      .where(and(eq(examsTable.courseId, courseId), eq(examsTable.companyId, companyId!))).limit(1);

    let exam: any;
    if (existing.length > 0) {
      [exam] = await db.update(examsTable).set({
        title: `${course.code} — ${course.title}`,
        description: `AI-generated exam for ${course.title}. Semester: ${course.semester || "N/A"}`,
        durationMinutes: duration, isActive: true, isAiGenerated: true, updatedAt: new Date(),
      }).where(eq(examsTable.id, existing[0].id)).returning();
      await db.delete(questionsTable).where(eq(questionsTable.examId, exam.id));
    } else {
      [exam] = await db.insert(examsTable).values({
        title: `${course.code} — ${course.title}`,
        description: `AI-generated exam for ${course.title}. Semester: ${course.semester || "N/A"}`,
        durationMinutes: duration, isActive: true, isAiGenerated: true,
        courseId, companyId: companyId!, createdById: (req as any).userId,
      }).returning();
    }

    await db.insert(questionsTable).values(
      questions.map((q: any, i: number) => ({
        examId: exam.id, text: q.text, options: q.options,
        correctIndex: q.correctIndex, explanation: q.explanation, order: i,
      }))
    );

    res.json({ exam: { ...exam, questionCount: questions.length }, questionsGenerated: questions.length });
  } catch (err: any) {
    console.error("AI set-course-questions error:", err);
    res.status(500).json({ error: "Failed to generate and save questions. Please try again." });
  }
});

export default router;
