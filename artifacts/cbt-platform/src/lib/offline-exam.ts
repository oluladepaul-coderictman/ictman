const EXAM_DATA_KEY = "cbt_offline_exam_";
const PENDING_RESULTS_KEY = "cbt_pending_results";

export interface OfflineExamData {
  examId: number;
  exam: any;
  savedAt: number;
}

export interface PendingResult {
  id: string;
  examId: number;
  answers: any[];
  timeTakenSeconds: number;
  savedAt: number;
}

export function saveExamOffline(examId: number, exam: any) {
  localStorage.setItem(EXAM_DATA_KEY + examId, JSON.stringify({ examId, exam, savedAt: Date.now() }));
}

export function getOfflineExam(examId: number): OfflineExamData | null {
  try { return JSON.parse(localStorage.getItem(EXAM_DATA_KEY + examId) ?? "null"); }
  catch { return null; }
}

export function listOfflineExams(): OfflineExamData[] {
  const exams: OfflineExamData[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(EXAM_DATA_KEY)) {
      try { const d = JSON.parse(localStorage.getItem(k)!); if (d) exams.push(d); } catch { }
    }
  }
  return exams;
}

export function savePendingResult(examId: number, answers: any[], timeTakenSeconds: number) {
  const pending = getPendingResults();
  pending.push({ id: `${Date.now()}-${examId}`, examId, answers, timeTakenSeconds, savedAt: Date.now() });
  localStorage.setItem(PENDING_RESULTS_KEY, JSON.stringify(pending));
}

export function getPendingResults(): PendingResult[] {
  try { return JSON.parse(localStorage.getItem(PENDING_RESULTS_KEY) ?? "[]"); } catch { return []; }
}

export function removePendingResult(id: string) {
  const pending = getPendingResults().filter(p => p.id !== id);
  localStorage.setItem(PENDING_RESULTS_KEY, JSON.stringify(pending));
}

export async function syncPendingResults(apiBase: string, token: string) {
  const pending = getPendingResults();
  if (pending.length === 0) return { synced: 0, failed: 0 };
  let synced = 0; let failed = 0;
  for (const p of pending) {
    try {
      const res = await fetch(`${apiBase}/api/exams/${p.examId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ answers: p.answers, timeTakenSeconds: p.timeTakenSeconds }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) { removePendingResult(p.id); synced++; }
      else failed++;
    } catch { failed++; }
  }
  return { synced, failed };
}
