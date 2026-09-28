import { Router } from "express";
import { requireAuth } from "../lib/auth.js";

const router = Router();

export type AIProvider = "local" | "groq";

/**
 * Auto-detect active provider — no manual setup required.
 * If GROQ_API_KEY is set in Replit Secrets → use Groq.
 * Otherwise → use local phi model.
 */
export function getActiveProvider(): AIProvider {
  return process.env.GROQ_API_KEY ? "groq" : "local";
}

router.use(requireAuth);

// ─── Status (read-only, no configuration) ──────────────────────────────────────
router.get("/status", async (_req, res) => {
  const { getModelStatus } = await import("../lib/paulina-model.js");
  const { getGroqModel } = await import("./groq.js");
  const localStatus = getModelStatus();
  const provider = getActiveProvider();
  res.json({
    activeProvider: provider,
    local: {
      loaded: localStatus.modelLoaded,
      loading: localStatus.modelLoading,
      available: localStatus.modelAvailable,
      error: localStatus.modelError,
      sizeMB: localStatus.modelSizeMB,
    },
    groq: {
      configured: !!process.env.GROQ_API_KEY,
      model: getGroqModel(),
    },
  });
});

// ─── Unified generate-questions ─────────────────────────────────────────────────
router.post("/generate-questions", async (req, res) => {
  try {
    if (getActiveProvider() === "groq") {
      const { callGroqGenerateQuestions } = await import("./groq.js");
      res.json(await callGroqGenerateQuestions(req.body));
    } else {
      const { callLocalGenerateQuestions } = await import("./local-ai.js");
      res.json(await callLocalGenerateQuestions(req.body));
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Unified chat ───────────────────────────────────────────────────────────────
router.post("/chat", async (req, res) => {
  try {
    if (getActiveProvider() === "groq") {
      const { callGroqChat } = await import("./groq.js");
      res.json(await callGroqChat(req.body));
    } else {
      const { callLocalChat } = await import("./local-ai.js");
      res.json(await callLocalChat(req.body));
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Inference helpers used by paulina.ts ──────────────────────────────────────
export async function runActiveInference(systemPrompt: string, userPrompt: string): Promise<string> {
  if (getActiveProvider() === "groq") {
    const { runGroqInference } = await import("./groq.js");
    return runGroqInference(systemPrompt, userPrompt);
  }
  const { runInference } = await import("../lib/paulina-model.js");
  return runInference(systemPrompt, userPrompt);
}

export async function runActiveChat(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
): Promise<string> {
  if (getActiveProvider() === "groq") {
    const { callGroqMessages } = await import("./groq.js");
    return callGroqMessages(messages);
  }
  // Local phi — flatten to string
  const { runInference } = await import("../lib/paulina-model.js");
  const sys = messages.find(m => m.role === "system")?.content ?? "";
  const convo = messages
    .filter(m => m.role !== "system")
    .map(m => `${m.role === "user" ? "User" : "Paulina"}: ${m.content}`)
    .join("\n") + "\nPaulina:";
  return runInference(sys, convo);
}

export default router;
