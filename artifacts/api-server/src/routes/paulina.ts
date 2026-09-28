import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import { db } from "@workspace/db";
import { usersTable, paulinaMessagesTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import multer from "multer";
import { runActiveChat } from "./ai-provider.js";

const router = Router();
router.use(requireAuth);

const WORKSPACE_ROOT = path.resolve("/home/runner/workspace");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ─── Role Guard ────────────────────────────────────────────────────────────────
async function getUser(req: any) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  return user ?? null;
}

async function guardNonCandidate(req: any, res: any): Promise<string | null> {
  const user = await getUser(req);
  if (!user || (user.role as string) === "Candidate") {
    res.status(403).json({ error: "Access denied" });
    return null;
  }
  return user.role;
}

// ─── Safe file path ────────────────────────────────────────────────────────────
function safePath(filePath: string): string {
  const resolved = path.resolve(WORKSPACE_ROOT, filePath.replace(/^\/+/, ""));
  if (!resolved.startsWith(WORKSPACE_ROOT)) throw new Error("Path outside workspace boundary");
  return resolved;
}

// ─── Tool execution ────────────────────────────────────────────────────────────
async function executeTool(cmd: any): Promise<{ result: string; toolEntry: any }> {
  if (cmd.action === "read") {
    const fp = safePath(cmd.path);
    const content = await fs.readFile(fp, "utf8").catch(() => "File not found or unreadable");
    const trimmed = content.length > 8000 ? content.slice(0, 8000) + "\n...[truncated]" : content;
    return { result: trimmed, toolEntry: { action: "read", path: cmd.path, success: true } };
  }
  if (cmd.action === "write") {
    const fp = safePath(cmd.path);
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, cmd.content ?? "", "utf8");
    return { result: `✓ Written: ${cmd.path}`, toolEntry: { action: "write", path: cmd.path, success: true } };
  }
  if (cmd.action === "list") {
    const fp = safePath(cmd.path ?? "");
    const entries = await fs.readdir(fp, { withFileTypes: true }).catch(() => []);
    const listing = entries.map((e: any) => `${e.isDirectory() ? "📁" : "📄"} ${e.name}`).join("\n") || "(empty)";
    return { result: listing, toolEntry: { action: "list", path: cmd.path, success: true } };
  }
  if (cmd.action === "search") {
    const { execSync } = await import("child_process");
    const searchPath = safePath(cmd.path ?? "artifacts");
    try {
      const out = execSync(
        `grep -rn "${cmd.pattern}" "${searchPath}" --include="*.ts" --include="*.tsx" --include="*.js" -l 2>/dev/null | head -20`,
        { encoding: "utf8", timeout: 5000 }
      );
      return { result: out || "(no matches)", toolEntry: { action: "search", pattern: cmd.pattern, success: true } };
    } catch {
      return { result: "(no matches)", toolEntry: { action: "search", pattern: cmd.pattern, success: false } };
    }
  }
  throw new Error(`Unknown tool action: ${cmd.action}`);
}

function extractToolCalls(text: string): any[] {
  const calls: any[] = [];
  const regex = /```tool\s*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    try { calls.push(JSON.parse(m[1].trim())); } catch { /* skip malformed */ }
  }
  return calls;
}

// ─── Agentic chat loop (works with both phi and Groq) ─────────────────────────
async function agenticChat(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string,
  maxIter = 4
): Promise<{ response: string; toolResults: any[] }> {
  const allToolResults: any[] = [];

  // Build proper messages array — this works cleanly with both Groq (native array)
  // and local phi (flattened to a string inside runActiveChat)
  const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...history.map(m => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  for (let iter = 0; iter < maxIter; iter++) {
    const raw = await runActiveChat(messages);
    const toolCalls = extractToolCalls(raw);

    if (toolCalls.length === 0) {
      const cleaned = raw.replace(/```tool[\s\S]*?```/g, "").trim();
      return { response: cleaned || raw, toolResults: allToolResults };
    }

    // Execute tools and collect results
    let toolFeedback = "**Tool results:**\n";
    for (const cmd of toolCalls) {
      try {
        const { result, toolEntry } = await executeTool(cmd);
        allToolResults.push(toolEntry);
        toolFeedback += `\n**${cmd.action}** \`${cmd.path ?? cmd.pattern ?? ""}\`\n\`\`\`\n${result}\n\`\`\`\n`;
      } catch (e: any) {
        toolFeedback += `\n**${cmd.action} ERROR:** ${e.message}\n`;
        allToolResults.push({ action: cmd.action, path: cmd.path, success: false, error: e.message });
      }
    }

    // Append the model's response and tool results as the next conversation turn
    messages.push({ role: "assistant", content: raw });
    messages.push({ role: "user", content: toolFeedback + "\nPlease continue and give your complete answer." });
  }

  // Max iterations reached — ask for final answer
  messages.push({ role: "user", content: "Based on everything above, give your complete final answer in Markdown." });
  const final = await runActiveChat(messages);
  return { response: final, toolResults: allToolResults };
}

// ─── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(role: string, companyPersonality?: string | null): string {
  const canWrite = role === "SuperAdmin";

  const personalityBlock = companyPersonality?.trim()
    ? `\n\n**Your identity for this organisation:**\n${companyPersonality.trim()}\n`
    : "";

  return `You are Paulina, an expert AI assistant and tutor embedded in CBT Bulldozer — a Computer-Based Testing platform. You are helping a ${role}.${personalityBlock}

You are a **Mixture-of-Experts AI** — knowledgeable in every subject: mathematics, sciences, engineering, medicine, law, finance, coding, languages, history, and all professional disciplines. You are concise, accurate, and helpful.

Write all responses in **Markdown** — use headings, bullet lists, bold text, tables, and code blocks where appropriate.

${canWrite
    ? "You have full **read and write** access to the codebase at /home/runner/workspace."
    : "You have **read-only** access to the codebase. Only SuperAdmins can write files."}

**File tools** (include in your response when you need to read or explore files):
\`\`\`tool
{"action":"read","path":"artifacts/cbt-platform/src/pages/admin/exams.tsx"}
\`\`\`
\`\`\`tool
{"action":"list","path":"artifacts/cbt-platform/src"}
\`\`\`
\`\`\`tool
{"action":"search","path":"artifacts","pattern":"useListExams"}
\`\`\`
${canWrite ? `\`\`\`tool\n{"action":"write","path":"artifacts/api-server/src/routes/example.ts","content":"// code"}\n\`\`\`` : ""}

**Rules:**
- Use tool calls to read code before answering code-related questions
- Never reveal exam answers to candidates (candidates cannot access Paulina)
- For question generation, use the course syllabus context if available
- Stack: React+Vite frontend (\`artifacts/cbt-platform\`), Express+TypeScript backend (\`artifacts/api-server\`), PostgreSQL+Drizzle ORM`;
}

// ─── Status ────────────────────────────────────────────────────────────────────
router.get("/status", async (req, res) => {
  if (!await guardNonCandidate(req, res)) return;
  const { getActiveProvider } = await import("./ai-provider.js");
  res.json({ provider: getActiveProvider(), ready: true });
});

router.post("/load", async (req, res) => {
  if (!await guardNonCandidate(req, res)) return;
  const { getActiveProvider } = await import("./ai-provider.js");
  res.json({ loaded: true, message: `Paulina is ready using ${getActiveProvider()}.` });
});

// ─── Chat history ──────────────────────────────────────────────────────────────
router.get("/history/:sessionId", async (req: any, res) => {
  if (!await guardNonCandidate(req, res)) return;
  const messages = await db
    .select()
    .from(paulinaMessagesTable)
    .where(and(
      eq(paulinaMessagesTable.userId, req.userId!),
      eq(paulinaMessagesTable.sessionId, req.params.sessionId),
    ))
    .orderBy(paulinaMessagesTable.createdAt)
    .limit(100);
  res.json(messages);
});

router.get("/sessions", async (req: any, res) => {
  if (!await guardNonCandidate(req, res)) return;
  const rows = await db
    .select()
    .from(paulinaMessagesTable)
    .where(eq(paulinaMessagesTable.userId, req.userId!))
    .orderBy(desc(paulinaMessagesTable.createdAt))
    .limit(200);
  const seen = new Map<string, any>();
  for (const r of rows) {
    if (!seen.has(r.sessionId))
      seen.set(r.sessionId, { sessionId: r.sessionId, lastMessage: r.content.slice(0, 80), updatedAt: r.createdAt });
  }
  res.json(Array.from(seen.values()).slice(0, 20));
});

// ─── Chat ──────────────────────────────────────────────────────────────────────
router.post("/chat", async (req: any, res) => {
  const role = await guardNonCandidate(req, res);
  if (!role) return;

  const { message, sessionId, history } = req.body;
  if (!message) { res.status(400).json({ error: "message is required" }); return; }
  if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }

  const user = await getUser(req);
  const companyId = user?.companyId ?? null;

  // Fetch company personality if this user belongs to a company
  let companyPersonality: string | null = null;
  if (companyId) {
    try {
      const { companiesTable } = await import("@workspace/db/schema");
      const { eq: eqDrizzle } = await import("drizzle-orm");
      const [co] = await db.select({ paulinaPersonality: companiesTable.paulinaPersonality })
        .from(companiesTable).where(eqDrizzle(companiesTable.id, companyId)).limit(1);
      companyPersonality = co?.paulinaPersonality ?? null;
    } catch { /* non-critical */ }
  }

  // Save user message
  await db.insert(paulinaMessagesTable).values({
    sessionId, userId: req.userId!, companyId, role: "user", content: message,
  });

  try {
    const systemPrompt = buildSystemPrompt(role, companyPersonality);
    const historyMessages = ((history ?? []) as any[])
      .map((m: any) => ({ role: m.role as string, content: m.content as string }))
      .slice(-12);

    const { response, toolResults } = await agenticChat(systemPrompt, historyMessages, message);

    await db.insert(paulinaMessagesTable).values({
      sessionId, userId: req.userId!, companyId, role: "assistant", content: response,
      toolResults: toolResults.length ? toolResults : null,
    });

    res.json({ response, toolResults });
  } catch (err: any) {
    console.error("[Paulina] Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── File upload (OCR / parse) ─────────────────────────────────────────────────
router.post("/upload", upload.single("file"), async (req: any, res) => {
  const role = await guardNonCandidate(req, res);
  if (!role) return;
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

  const { originalname, buffer } = req.file;
  const ext = path.extname(originalname).toLowerCase();

  try {
    let extractedText = "";

    if ([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"].includes(ext)) {
      const Tesseract = await import("tesseract.js");
      const { data } = await Tesseract.default.recognize(buffer, "eng", { logger: () => {} });
      extractedText = data.text;
    } else if (ext === ".pdf") {
      const pdfParse: any = await import("pdf-parse");
      const parsed = await (pdfParse.default ?? pdfParse)(buffer);
      extractedText = parsed.text;
    } else if ([".docx", ".pptx", ".xlsx", ".odt", ".odp", ".ods"].includes(ext)) {
      const officeParser: any = await import("officeparser");
      const parseFn = officeParser.parseOfficeAsync ?? officeParser.parseOffice ?? officeParser.default?.parseOfficeAsync;
      extractedText = await parseFn(buffer, { outputErrorToConsole: false });
    } else {
      extractedText = buffer.toString("utf8").replace(/[^\x20-\x7E\n\r\t]/g, "");
    }

    const trimmed = extractedText.length > 15000 ? extractedText.slice(0, 15000) + "\n...[truncated]" : extractedText;
    res.json({ filename: originalname, extractedText: trimmed, length: extractedText.length });
  } catch (err: any) {
    console.error("[Paulina OCR]", err.message);
    res.status(500).json({ error: `Failed to extract text: ${err.message}` });
  }
});

// ─── Syllabus upload ───────────────────────────────────────────────────────────
router.post("/syllabus/:courseId", upload.single("file"), async (req: any, res) => {
  const role = await guardNonCandidate(req, res);
  if (!role) return;

  const schema = await import("@workspace/db/schema");
  const coursesTable = (schema as any).coursesTable;
  const { eq: eqDrizzle } = await import("drizzle-orm");

  try {
    let syllabus: string;
    let fileName: string;

    if (req.file) {
      const { originalname, buffer } = req.file;
      const ext = path.extname(originalname).toLowerCase();
      fileName = originalname;

      if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
        const Tesseract = await import("tesseract.js");
        const { data } = await Tesseract.default.recognize(buffer, "eng", { logger: () => {} });
        syllabus = data.text;
      } else if (ext === ".pdf") {
        const pdfParse: any = await import("pdf-parse");
        const parsed = await (pdfParse.default ?? pdfParse)(buffer);
        syllabus = parsed.text;
      } else if ([".docx", ".pptx", ".xlsx"].includes(ext)) {
        const officeParser: any = await import("officeparser");
        const parseFn = officeParser.parseOfficeAsync ?? officeParser.parseOffice ?? officeParser.default?.parseOfficeAsync;
        syllabus = await parseFn(buffer, { outputErrorToConsole: false });
      } else {
        syllabus = buffer.toString("utf8");
      }
    } else if (req.body.syllabus) {
      syllabus = req.body.syllabus;
      fileName = "manual entry";
    } else {
      res.status(400).json({ error: "Provide a file or syllabus text in body" });
      return;
    }

    const courseId = parseInt(req.params.courseId);
    await db.update(coursesTable).set({
      syllabus: syllabus!.slice(0, 50000),
      syllabusFileName: fileName!,
      syllabusUpdatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eqDrizzle(coursesTable.id, courseId));

    res.json({ success: true, fileName: fileName!, length: syllabus!.length });
  } catch (err: any) {
    console.error("[Syllabus upload]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── File explorer tools (SuperAdmin only) ────────────────────────────────────
router.post("/file/read", async (req: any, res) => {
  if (!await guardNonCandidate(req, res)) return;
  try {
    const fp = safePath(req.body.path);
    const content = await fs.readFile(fp, "utf8");
    res.json({ content: content.length > 12000 ? content.slice(0, 12000) + "\n...[truncated]" : content });
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});

router.post("/file/write", async (req: any, res) => {
  const role = await guardNonCandidate(req, res);
  if (!role) return;
  if (role !== "SuperAdmin") { res.status(403).json({ error: "Only SuperAdmins can write files" }); return; }
  try {
    const fp = safePath(req.body.path);
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, req.body.content ?? "", "utf8");
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/file/list", async (req: any, res) => {
  if (!await guardNonCandidate(req, res)) return;
  try {
    const fp = safePath(req.body.path ?? "");
    const entries = await fs.readdir(fp, { withFileTypes: true });
    res.json({ entries: entries.map((e: any) => ({ name: e.name, isDir: e.isDirectory() })) });
  } catch (e: any) { res.status(404).json({ error: e.message }); }
});

export default router;
