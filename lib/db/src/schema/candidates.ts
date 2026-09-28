import { pgTable, serial, text, boolean, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { examsTable } from "./exams";
import { departmentsTable } from "./departments";

export const candidatesTable = pgTable("candidates", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  departmentId: integer("department_id").references(() => departmentsTable.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const candidateExamAssignmentsTable = pgTable("candidate_exam_assignments", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull().references(() => candidatesTable.id, { onDelete: "cascade" }),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
});

export const insertCandidateSchema = createInsertSchema(candidatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCandidateExamAssignmentSchema = createInsertSchema(candidateExamAssignmentsTable).omit({
  id: true,
  assignedAt: true,
});

export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidatesTable.$inferSelect;
export type CandidateExamAssignment = typeof candidateExamAssignmentsTable.$inferSelect;
