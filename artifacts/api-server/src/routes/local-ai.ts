/**
 * Local phi model — question generation + chat helpers
 * Used by ai-provider.ts when activeProvider === "local"
 */
import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  runInference, getModelStatus, loadModelOnce, extractJson,
} from "../lib/paulina-model.js";

const router = Router();
router.use(requireAuth);

export async function callLocalGenerateQuestions(body: any): Promise<any> {
  const { topic, count = 10, difficulty = "medium", subject = "" } = body;
  if (!topic) throw new Error("Topic required");
  const status = getModelStatus();
  if (!status.modelLoaded) {
    throw new Error(
      status.modelAvailable
        ? "Phi model is still loading. Please wait a moment and try again."
        : "Phi model file not found. Place phi3-mini.gguf in /workspace/models/."
    );
  }
  const prompt = `Generate exactly ${count} multiple-choice exam questions about "${topic}"${subject ? ` (${subject})` : ""}, difficulty: ${difficulty}.
Respond ONLY with a valid JSON array, no markdown:
[{"text":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]`;
  const raw = await runInference(
    "You are an expert exam question generator. Always respond with valid JSON only.",
    prompt,
  );
  const questions = extractJson(raw);
  if (!questions.length) throw new Error("Could not parse questions from phi model response");
  return { questions, count: questions.length, model: "phi3-mini", provider: "local" };
}

export async function callLocalChat(body: any): Promise<any> {
  const { message, history = [] } = body;
  if (!message?.trim()) throw new Error("Message required");
  const status = getModelStatus();
  if (!status.modelLoaded) {
    throw new Error(
      status.modelAvailable
        ? "Phi model is still loading. Please wait and try again."
        : "Phi model not available. Use Groq instead."
    );
  }
  const SYSTEM = `You are Paulina, an expert AI assistant embedded in CBT Bulldozer — a Computer-Based Testing platform. Help staff and admins with exams, questions, performance analysis, and academic topics. Respond in clear Markdown.`;
  const convo = [
    ...(history as any[]).map((h: any) => `${h.role === "assistant" ? "Paulina" : "User"}: ${h.content}`),
    `User: ${message}`,
  ].join("\n") + "\nPaulina:";
  const reply = await runInference(SYSTEM, convo);
  return { reply, model: "phi3-mini", provider: "local" };
}

// ─── Routes ────────────────────────────────────────────────────────────────────
router.get("/status", async (_req, res) => {
  res.json(getModelStatus());
});

router.post("/load", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user || !["SuperAdmin", "CompanyAdmin"].includes(user.role)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const status = getModelStatus();
    if (status.modelLoaded) { res.json({ loaded: true, message: "Phi model is already loaded and ready." }); return; }
    if (status.modelLoading) { res.json({ loading: true, message: "Phi model is currently loading..." }); return; }
    if (!status.modelAvailable) { res.status(400).json({ error: "Model file not found. Place phi3-mini.gguf in /workspace/models/." }); return; }
    loadModelOnce().catch(() => {});
    res.json({ loading: true, message: "Loading phi model in background. This takes 1–3 min on first start." });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
