import { pgTable, serial, timestamp, integer, real, jsonb, boolean, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { examsTable } from "./exams";
import { candidatesTable } from "./candidates";

export const resultsTable = pgTable("results", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  candidateId: integer("candidate_id").references(() => candidatesTable.id),
  examId: integer("exam_id").notNull().references(() => examsTable.id),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  score: real("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  timeTakenSeconds: integer("time_taken_seconds").notNull(),
  answers: jsonb("answers").$type<{ questionId: number; selectedIndex: number; isCorrect: boolean }[]>(),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const examSessionsTable = pgTable("exam_sessions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => examsTable.id),
  candidateId: integer("candidate_id").references(() => candidatesTable.id),
  userId: integer("user_id"),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at").notNull().defaultNow(),
  currentQuestion: integer("current_question").notNull().default(0),
  answersCount: integer("answers_count").notNull().default(0),
  status: text("status").notNull().default("active"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
});

export const insertResultSchema = createInsertSchema(resultsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertResult = z.infer<typeof insertResultSchema>;
export type Result = typeof resultsTable.$inferSelect;
