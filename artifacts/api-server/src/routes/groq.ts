import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

let _groqKey: string | undefined = process.env.GROQ_API_KEY ?? undefined;
let _groqModel: string = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

export function setGroqKey(key: string) { _groqKey = key; }
export function getGroqKey(): string | undefined { return _groqKey; }
export function setGroqModel(model: string) { _groqModel = model; }
export function getGroqModel(): string { return _groqModel; }

const GROQ_BASE = "https://api.groq.com/openai/v1";

async function callGroq(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  model?: string
): Promise<string> {
  const key = _groqKey;
  if (!key) throw new Error("Groq API key not configured. Go to Settings → AI Configuration to set it.");
  const m = model ?? _groqModel;
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: m,
      messages,
      max_tokens: 8192,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    throw new Error(`Groq error: ${err?.error?.message ?? res.status}`);
  }
  const data: any = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from Groq");
  return text;
}

/** Exported for unified AI provider route */
export async function callGroqGenerateQuestions(body: any): Promise<any> {
  const { topic, count = 10, difficulty = "medium", subject = "", examType = "professional", model } = body;
  if (!topic) throw new Error("Topic required");
  const prompt = `Generate exactly ${count} multiple-choice exam questions about "${topic}"${subject ? ` (subject: ${subject})` : ""}.\nDifficulty: ${difficulty}. Exam type: ${examType}.\n\nRespond ONLY with a valid JSON array, no markdown, no explanation:\n[\n  {\n    "text": "Question text here?",\n    "options": ["Option A", "Option B", "Option C", "Option D"],\n    "correctIndex": 0,\n    "explanation": "Explanation why A is correct"\n  }\n]\n\nRequirements:\n- Exactly 4 options per question\n- correctIndex is 0-3 (0=A, 1=B, 2=C, 3=D)\n- Options must be plausible and well-written\n- Questions must be clear, unambiguous, and professionally worded`;
  const raw = await callGroq([
    { role: "system", content: "You are an expert exam question generator. Always respond with valid JSON only, no markdown fences." },
    { role: "user", content: prompt },
  ], model);
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Could not parse questions from Groq response");
  const questions = JSON.parse(jsonMatch[0]);
  return { questions, count: questions.length, model: model ?? _groqModel, provider: "groq" };
}

/** Exported for unified AI provider route */
export async function callGroqChat(body: any): Promise<any> {
  const { message, history = [], model } = body;
  if (!message?.trim()) throw new Error("Message required");
  const SYSTEM = `You are Paulina, an expert AI assistant and MoE tutor built into CBT Bulldozer. You help staff and admins with exam questions, performance analysis, explanations, and any academic topic. Respond in a friendly, professional tone. Format responses in Markdown.`;
  const msgs: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
    { role: "system", content: SYSTEM },
    ...(history as any[]).map((h: any) => ({ role: h.role === "assistant" ? "assistant" as const : "user" as const, content: h.content })),
    { role: "user", content: message },
  ];
  const reply = await callGroq(msgs, model);
  return { reply, model: model ?? _groqModel, provider: "groq" };
}

/** Exported for Paulina agentic loop */
export async function runGroqInference(systemPrompt: string, userPrompt: string): Promise<string> {
  return callGroq([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);
}

/** Multi-turn messages array — used by runActiveChat in ai-provider.ts */
export async function callGroqMessages(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
): Promise<string> {
  return callGroq(messages);
}

router.use(requireAuth);

router.get("/status", async (_req, res) => {
  res.json({ configured: !!_groqKey, model: _groqModel, provider: "Groq" });
});

router.post("/key", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user || !["SuperAdmin", "CompanyAdmin"].includes(user.role)) {
      res.status(403).json({ error: "Only admins can set the Groq API key" }); return;
    }
    const { apiKey, model } = req.body;
    if (!apiKey?.trim()) { res.status(400).json({ error: "API key required" }); return; }
    _groqKey = apiKey.trim();
    process.env.GROQ_API_KEY = _groqKey;
    if (model?.trim()) { _groqModel = model.trim(); process.env.GROQ_MODEL = _groqModel; }
    res.json({ message: "Groq API key configured successfully", model: _groqModel });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/model", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user || !["SuperAdmin", "CompanyAdmin"].includes(user.role)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const { model } = req.body;
    if (!model?.trim()) { res.status(400).json({ error: "Model name required" }); return; }
    _groqModel = model.trim();
    process.env.GROQ_MODEL = _groqModel;
    res.json({ message: "Model updated", model: _groqModel });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/models", async (req, res) => {
  const key = _groqKey;
  if (!key) { res.status(400).json({ error: "Groq API key not configured" }); return; }
  try {
    const r = await fetch(`${GROQ_BASE}/models`, {
      headers: { "Authorization": `Bearer ${key}` },
    });
    if (!r.ok) { res.status(r.status).json({ error: "Failed to fetch Groq models" }); return; }
    const data: any = await r.json();
    const models = ((data?.data ?? []) as any[])
      .filter((m: any) => m.object === "model" && !m.id.includes("whisper") && !m.id.includes("guard"))
      .map((m: any) => ({
        id: m.id,
        name: m.id,
        context: m.context_window ?? 0,
        owned_by: m.owned_by ?? "",
        active: m.active ?? true,
      }))
      .sort((a: any, b: any) => a.id.localeCompare(b.id));
    res.json({ models, count: models.length, current: _groqModel });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/chat", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user || (user.role as string) === "Candidate") {
      res.status(403).json({ error: "AI chat is not available during exams" }); return;
    }
    res.json(await callGroqChat(req.body));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/generate-questions", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user || !["SuperAdmin", "CompanyAdmin", "Staff"].includes(user.role)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    res.json(await callGroqGenerateQuestions(req.body));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/explain", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user || (user.role as string) === "Candidate") {
      res.status(403).json({ error: "Not available for candidates" }); return;
    }
    const { question, correctAnswer, candidateAnswer, topic, model } = req.body;
    const prompt = `Explain this exam question:\nQuestion: ${question}\nCorrect Answer: ${correctAnswer}\n${candidateAnswer !== undefined ? `Candidate's Answer: ${candidateAnswer}\n` : ""}${topic ? `Topic: ${topic}\n` : ""}\nProvide a clear explanation of why the correct answer is right, why distractors are wrong, and the underlying concept.`;
    const explanation = await callGroq([
      { role: "system", content: "You are a knowledgeable tutor. Explain clearly and concisely in Markdown." },
      { role: "user", content: prompt },
    ], model);
    res.json({ explanation, model: model ?? _groqModel, provider: "groq" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
