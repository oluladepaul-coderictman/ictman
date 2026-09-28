import { db } from "@workspace/db";
import { usersTable, companiesTable, examsTable, questionsTable } from "@workspace/db/schema";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "cbt-salt-2024").digest("hex");
}

async function seed() {
  console.log("Seeding database...");

  const existingSuper = await db.select().from(usersTable).limit(1);
  if (existingSuper.length > 0) {
    console.log("Database already seeded. Skipping.");
    process.exit(0);
  }

  const [superAdmin] = await db.insert(usersTable).values({
    email: "super@admin.com",
    passwordHash: hashPassword("admin123"),
    name: "Super Administrator",
    role: "SuperAdmin",
    companyId: null,
  }).returning();
  console.log("Created SuperAdmin:", superAdmin.email);

  const [company1] = await db.insert(companiesTable).values({
    name: "TechCorp Solutions",
    logoUrl: null,
    primaryColor: "#3b82f6",
  }).returning();

  const [company2] = await db.insert(companiesTable).values({
    name: "EduFirst Academy",
    logoUrl: null,
    primaryColor: "#10b981",
  }).returning();
  console.log("Created companies:", company1.name, company2.name);

  const [admin1] = await db.insert(usersTable).values({
    email: "admin@techcorp.com",
    passwordHash: hashPassword("admin123"),
    name: "TechCorp Admin",
    role: "CompanyAdmin",
    companyId: company1.id,
  }).returning();

  const [admin2] = await db.insert(usersTable).values({
    email: "admin@edufirst.com",
    passwordHash: hashPassword("admin123"),
    name: "EduFirst Admin",
    role: "CompanyAdmin",
    companyId: company2.id,
  }).returning();

  await db.insert(usersTable).values([
    { email: "john@techcorp.com", passwordHash: hashPassword("staff123"), name: "John Smith", role: "Staff", companyId: company1.id },
    { email: "jane@techcorp.com", passwordHash: hashPassword("staff123"), name: "Jane Doe", role: "Staff", companyId: company1.id },
    { email: "alice@edufirst.com", passwordHash: hashPassword("staff123"), name: "Alice Johnson", role: "Staff", companyId: company2.id },
  ]);
  console.log("Created admin and staff users");

  const [exam1] = await db.insert(examsTable).values({
    title: "JavaScript Fundamentals",
    description: "Test your knowledge of core JavaScript concepts",
    durationMinutes: 30,
    isActive: true,
    companyId: company1.id,
    createdById: admin1.id,
  }).returning();

  await db.insert(questionsTable).values([
    { examId: exam1.id, text: "What is the output of typeof null in JavaScript?", options: ["null", "object", "undefined", "string"], correctIndex: 1, order: 0 },
    { examId: exam1.id, text: "Which method is used to add an element to the end of an array?", options: ["push()", "pop()", "shift()", "unshift()"], correctIndex: 0, order: 1 },
    { examId: exam1.id, text: "What does === check in JavaScript?", options: ["Value only", "Type only", "Value and type", "None of the above"], correctIndex: 2, order: 2 },
    { examId: exam1.id, text: "What is a closure in JavaScript?", options: ["A loop construct", "A function with access to outer scope", "A class definition", "An async operation"], correctIndex: 1, order: 3 },
    { examId: exam1.id, text: "Which keyword declares a block-scoped variable?", options: ["var", "let", "both var and let", "function"], correctIndex: 1, order: 4 },
  ]);

  const [exam2] = await db.insert(examsTable).values({
    title: "React Basics Assessment",
    description: "Evaluate understanding of React core concepts",
    durationMinutes: 20,
    isActive: true,
    companyId: company1.id,
    createdById: admin1.id,
  }).returning();

  await db.insert(questionsTable).values([
    { examId: exam2.id, text: "What is JSX in React?", options: ["A JavaScript extension for XML", "A database query language", "A CSS preprocessor", "A testing framework"], correctIndex: 0, order: 0 },
    { examId: exam2.id, text: "What hook is used for side effects in React?", options: ["useState", "useEffect", "useContext", "useReducer"], correctIndex: 1, order: 1 },
    { examId: exam2.id, text: "How do you pass data to a child component in React?", options: ["Through state", "Through props", "Through context only", "Direct DOM manipulation"], correctIndex: 1, order: 2 },
  ]);

  const [exam3] = await db.insert(examsTable).values({
    title: "Mathematics Proficiency Test",
    description: "Basic mathematics skills assessment",
    durationMinutes: 45,
    isActive: true,
    companyId: company2.id,
    createdById: admin2.id,
  }).returning();

  await db.insert(questionsTable).values([
    { examId: exam3.id, text: "What is the square root of 144?", options: ["10", "11", "12", "13"], correctIndex: 2, order: 0 },
    { examId: exam3.id, text: "If x + 5 = 12, what is x?", options: ["5", "6", "7", "8"], correctIndex: 2, order: 1 },
    { examId: exam3.id, text: "What is 15% of 200?", options: ["25", "30", "35", "40"], correctIndex: 1, order: 2 },
    { examId: exam3.id, text: "What is the area of a circle with radius 7 (use π ≈ 3.14)?", options: ["153.86", "43.96", "21.98", "219.8"], correctIndex: 0, order: 3 },
  ]);

  console.log("Created exams and questions");
  console.log("\n=== SEED COMPLETE ===");
  console.log("Login credentials:");
  console.log("  SuperAdmin: super@admin.com / admin123");
  console.log("  TechCorp Admin: admin@techcorp.com / admin123");
  console.log("  EduFirst Admin: admin@edufirst.com / admin123");
  console.log("  Staff (TechCorp): john@techcorp.com / staff123");
  console.log("  Staff (EduFirst): alice@edufirst.com / staff123");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
