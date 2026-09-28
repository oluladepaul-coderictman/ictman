import path from "path";
import fs from "fs";

export const MODEL_PATH = path.resolve("/home/runner/workspace/models/phi3-mini.gguf");

let _llama: any = null;
let _model: any = null;
let _loading = false;
let _loadError: string | null = null;
let _loadPromise: Promise<void> | null = null;

export function getModelStatus() {
  const modelAvailable = fs.existsSync(MODEL_PATH);
  const modelSizeMB = modelAvailable ? Math.round(fs.statSync(MODEL_PATH).size / 1024 / 1024) : 0;
  return {
    // camelCase fields that the frontend and other consumers expect
    modelLoaded: !!_model,
    modelLoading: _loading,
    modelError: _loadError,
    modelAvailable,
    modelSizeMB,
    modelPath: MODEL_PATH,
    // short aliases used internally
    loaded: !!_model,
    loading: _loading,
    error: _loadError,
  };
}

export function getModel() { return _model; }

async function _doLoad(): Promise<void> {
  if (!fs.existsSync(MODEL_PATH)) {
    _loadError = "Model file not found at " + MODEL_PATH;
    console.error("[Paulina]", _loadError);
    return;
  }
  _loading = true;
  _loadError = null;
  try {
    console.log("[Paulina] Loading phi3-mini model — this is a one-time operation...");
    const { getLlama } = await import("node-llama-cpp");
    _llama = await getLlama();
    _model = await _llama.loadModel({ modelPath: MODEL_PATH });
    console.log("[Paulina] ✓ Model loaded and ready.");
  } catch (e: any) {
    _loadError = e?.message ?? "Unknown error";
    _model = null;
    console.error("[Paulina] Failed to load model:", _loadError);
  } finally {
    _loading = false;
  }
}

export function loadModelOnce(): Promise<void> {
  if (_model) return Promise.resolve();
  if (_loadPromise) return _loadPromise;
  _loadPromise = _doLoad();
  return _loadPromise;
}

export async function runInference(systemPrompt: string, userPrompt: string, maxTokens = 4096): Promise<string> {
  if (!_model) throw new Error("not_loaded");
  const { LlamaChatSession } = await import("node-llama-cpp");
  const context = await _model.createContext({ contextSize: 4096 });
  try {
    const session = new LlamaChatSession({ contextSequence: context.getSequence(), systemPrompt });
    const response = await session.prompt(userPrompt, { maxTokens });
    return response;
  } finally {
    await context.dispose();
  }
}

export function extractJson(text: string): any[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try { return JSON.parse(jsonMatch[0]); } catch { return []; }
}
