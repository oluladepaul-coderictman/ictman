import { pgTable, serial, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { usersTable } from "./users";
import { coursesTable } from "./courses";

export const examsTable = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  isActive: boolean("is_active").notNull().default(true),
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  courseId: integer("course_id").references(() => coursesTable.id),
  createdById: integer("created_by_id").references(() => usersTable.id),
  passMark: integer("pass_mark").default(50),
  shuffleQuestions: boolean("shuffle_questions").notNull().default(false),
  allowReview: boolean("allow_review").notNull().default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  maxAttempts: integer("max_attempts").default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  options: jsonb("options").notNull().$type<string[]>(),
  correctIndex: integer("correct_index").notNull(),
  explanation: text("explanation"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExamSchema = createInsertSchema(examsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof examsTable.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
