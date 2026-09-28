import * as React from "react";
import { useListExams } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { Calendar, Clock, Play, Pause, Settings, CheckCircle2, AlertCircle } from "lucide-react";
import { format, isAfter, isBefore, isWithinInterval } from "date-fns";

function toLocalDatetime(iso: string | null | undefined) {
  if (!iso) return "";
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

function examStatus(exam: any): { label: string; color: string; icon: React.ReactNode } {
  const now = new Date();
  const start = exam.startDate ? new Date(exam.startDate) : null;
  const end = exam.endDate ? new Date(exam.endDate) : null;

  if (!exam.isActive) return { label: "Inactive", color: "bg-gray-100 text-gray-600", icon: <Pause className="w-3 h-3" /> };
  if (start && isBefore(now, start)) return { label: "Scheduled", color: "bg-blue-100 text-blue-700", icon: <Clock className="w-3 h-3" /> };
  if (end && isAfter(now, end)) return { label: "Ended", color: "bg-red-100 text-red-600", icon: <AlertCircle className="w-3 h-3" /> };
  if (start && end && isWithinInterval(now, { start, end })) return { label: "Live Now", color: "bg-green-100 text-green-700", icon: <Play className="w-3 h-3" /> };
  if (exam.isActive && !start && !end) return { label: "Always Open", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="w-3 h-3" /> };
  return { label: "Open", color: "bg-green-100 text-green-700", icon: <Play className="w-3 h-3" /> };
}

export default function SchedulerPage() {
  const { toast } = useToast();
  const { data: exams = [], refetch } = useListExams();
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [scheduleForm, setScheduleForm] = React.useState({ startDate: "", endDate: "", passMark: "50", shuffleQuestions: false, allowReview: true });
  const [saving, setSaving] = React.useState(false);

  const allExams = exams as any[];

  const openEdit = (exam: any) => {
    setEditingId(exam.id);
    setScheduleForm({
      startDate: toLocalDatetime(exam.startDate),
      endDate: toLocalDatetime(exam.endDate),
      passMark: String(exam.passMark ?? 50),
      shuffleQuestions: exam.shuffleQuestions ?? false,
      allowReview: exam.allowReview ?? true,
    });
  };

  const saveSchedule = async (examId: number) => {
    setSaving(true);
    try {
      await apiClient(`/api/exams/${examId}`, {
        method: "PATCH",
        body: JSON.stringify({
          startDate: scheduleForm.startDate ? new Date(scheduleForm.startDate).toISOString() : null,
          endDate: scheduleForm.endDate ? new Date(scheduleForm.endDate).toISOString() : null,
          passMark: parseInt(scheduleForm.passMark) || 50,
          shuffleQuestions: scheduleForm.shuffleQuestions,
          allowReview: scheduleForm.allowReview,
        }),
      });
      toast({ title: "Exam schedule updated!" });
      setEditingId(null);
      refetch();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Exam Scheduler</h1>
        <p className="text-gray-500 mt-1">Set date/time windows, pass marks, and exam behaviour for each exam</p>
      </div>

      {allExams.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">No exams yet</p>
            <p className="text-sm mt-1">Create exams from the Exams page first</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allExams.map((exam: any) => {
            const status = examStatus(exam);
            const isEditing = editingId === exam.id;
            return (
              <Card key={exam.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 truncate">{exam.title}</p>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.icon} {status.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        <span>{exam.questionCount ?? 0} questions</span>
                        <span>·</span>
                        <span>{exam.durationMinutes} min</span>
                        <span>·</span>
                        <span>Pass: {exam.passMark ?? 50}%</span>
                        {exam.startDate && <><span>·</span><span>Starts: {format(new Date(exam.startDate), "dd MMM yyyy HH:mm")}</span></>}
                        {exam.endDate && <><span>·</span><span>Ends: {format(new Date(exam.endDate), "dd MMM yyyy HH:mm")}</span></>}
                        {exam.shuffleQuestions && <><span>·</span><span className="text-purple-600">🔀 Shuffled</span></>}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => isEditing ? setEditingId(null) : openEdit(exam)}>
                      <Settings className="w-3.5 h-3.5" /> {isEditing ? "Cancel" : "Configure"}
                    </Button>
                  </div>

                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time (optional)</label>
                          <Input type="datetime-local" value={scheduleForm.startDate} onChange={e => setScheduleForm(f => ({ ...f, startDate: e.target.value }))} />
                          <p className="text-xs text-gray-400 mt-1">Leave blank to open immediately</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time (optional)</label>
                          <Input type="datetime-local" value={scheduleForm.endDate} onChange={e => setScheduleForm(f => ({ ...f, endDate: e.target.value }))} />
                          <p className="text-xs text-gray-400 mt-1">Leave blank to keep open indefinitely</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pass Mark (%)</label>
                          <div className="flex items-center gap-2">
                            <input type="range" min={0} max={100} value={scheduleForm.passMark}
                              onChange={e => setScheduleForm(f => ({ ...f, passMark: e.target.value }))} className="flex-1" />
                            <span className="text-sm font-bold text-green-600 w-10 text-right">{scheduleForm.passMark}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pt-5">
                          <input type="checkbox" id={`shuffle-${exam.id}`} checked={scheduleForm.shuffleQuestions}
                            onChange={e => setScheduleForm(f => ({ ...f, shuffleQuestions: e.target.checked }))} className="w-4 h-4 rounded" />
                          <label htmlFor={`shuffle-${exam.id}`} className="text-sm font-medium text-gray-700">Shuffle Questions</label>
                        </div>
                        <div className="flex items-center gap-3 pt-5">
                          <input type="checkbox" id={`review-${exam.id}`} checked={scheduleForm.allowReview}
                            onChange={e => setScheduleForm(f => ({ ...f, allowReview: e.target.checked }))} className="w-4 h-4 rounded" />
                          <label htmlFor={`review-${exam.id}`} className="text-sm font-medium text-gray-700">Allow Answer Review</label>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveSchedule(exam.id)} disabled={saving} className="gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Schedule"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
