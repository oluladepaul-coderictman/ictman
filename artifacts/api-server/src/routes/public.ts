import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable, departmentsTable, coursesTable, examsTable, questionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// Department-level portal: list all courses with active exams
router.get("/org/:companySlug/:deptSlug", async (req, res) => {
  const { companySlug, deptSlug } = req.params;

  const [company] = await db.select().from(companiesTable)
    .where(eq(companiesTable.slug, companySlug)).limit(1);
  if (!company) { res.status(404).json({ error: "Company not found" }); return; }

  const [department] = await db.select().from(departmentsTable)
    .where(and(eq(departmentsTable.slug, deptSlug), eq(departmentsTable.companyId, company.id))).limit(1);
  if (!department) { res.status(404).json({ error: "Department not found" }); return; }

  const courses = await db.select().from(coursesTable)
    .where(eq(coursesTable.departmentId, department.id))
    .orderBy(coursesTable.title);

  // For each course, find if there is an active exam
  const coursesWithExams = await Promise.all(courses.map(async (course) => {
    const [exam] = await db.select().from(examsTable)
      .where(and(eq(examsTable.courseId, course.id), eq(examsTable.isActive, true))).limit(1);
    let examInfo = null;
    if (exam) {
      const qs = await db.select().from(questionsTable).where(eq(questionsTable.examId, exam.id));
      examInfo = { id: exam.id, title: exam.title, durationMinutes: exam.durationMinutes, questionCount: qs.length };
    }
    return { ...course, exam: examInfo };
  }));

  res.json({ company, department, courses: coursesWithExams });
});

// Course-level portal: get exam for a specific course
router.get("/org/:companySlug/:deptSlug/:courseCode", async (req, res) => {
  const { companySlug, deptSlug, courseCode } = req.params;

  const [company] = await db.select().from(companiesTable)
    .where(eq(companiesTable.slug, companySlug)).limit(1);
  if (!company) { res.status(404).json({ error: "Company not found" }); return; }

  const [department] = await db.select().from(departmentsTable)
    .where(and(eq(departmentsTable.slug, deptSlug), eq(departmentsTable.companyId, company.id))).limit(1);
  if (!department) { res.status(404).json({ error: "Department not found" }); return; }

  const [course] = await db.select().from(coursesTable)
    .where(and(eq(coursesTable.code, courseCode.toUpperCase()), eq(coursesTable.departmentId, department.id))).limit(1);
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  let exam = null;
  const exams = await db.select().from(examsTable)
    .where(and(eq(examsTable.courseId, course.id), eq(examsTable.isActive, true))).limit(1);

  if (exams.length > 0) {
    const e = exams[0];
    const qs = await db.select().from(questionsTable).where(eq(questionsTable.examId, e.id));
    exam = { ...e, questionCount: qs.length };
  }

  res.json({ company, department, course, exam });
});

export default router;
