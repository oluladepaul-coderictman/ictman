import { pgTable, serial, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug"),
  type: text("type").default("Educational"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  passMark: integer("pass_mark").default(50),
  gradeScale: jsonb("grade_scale").$type<Record<string, number>>(),
  timezone: text("timezone").default("Africa/Lagos"),
  website: text("website"),
  address: text("address"),
  phone: text("phone"),
  // Paulina AI personality — each company can customise who Paulina is for them
  paulinaPersonality: text("paulina_personality"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
