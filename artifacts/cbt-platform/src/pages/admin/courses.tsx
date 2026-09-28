import * as React from "react";
import {
  useListCourses, useListDepartments, useCreateCourse,
  useUpdateCourse, useDeleteCourse, useSetCourseQuestions, useGetCompany
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  Plus, Pencil, Trash2, BookOpen, Link as LinkIcon, Wand2,
  CheckCircle2, RefreshCw, Upload, FileText, X, ChevronDown, ChevronUp
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

export default function CoursesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: departments = [] } = useListDepartments();
  const [selectedDeptId, setSelectedDeptId] = React.useState<number | "all">("all");
  const { data: courses = [], isLoading, refetch } = useListCourses(
    selectedDeptId !== "all" ? { departmentId: selectedDeptId } : {}
  );
  const createMutation = useCreateCourse();
  const updateMutation = useUpdateCourse();
  const deleteMutation = useDeleteCourse();
  const aiSetMutation = useSetCourseQuestions();

  const [showForm, setShowForm] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState({ title: "", code: "", semester: "", departmentId: "" });

  const [aiModalCourse, setAiModalCourse] = React.useState<any>(null);
  const [aiForm, setAiForm] = React.useState({ count: "30", difficulty: "medium", durationMinutes: "" });
  const [aiResult, setAiResult] = React.useState<{ questionsGenerated: number; examTitle: string } | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);

  // Syllabus modal
  const [syllabusModalCourse, setSyllabusModalCourse] = React.useState<any>(null);
  const [syllabusText, setSyllabusText] = React.useState("");
  const [syllabusUploading, setSyllabusUploading] = React.useState(false);
  const [expandedSyllabus, setExpandedSyllabus] = React.useState<number | null>(null);
  const syllabusFileRef = React.useRef<HTMLInputElement>(null);

  const [impersonateSlug, setImpersonateSlug] = React.useState<string>("");
  React.useEffect(() => {
    const stored = sessionStorage.getItem("cbt_impersonate");
    if (stored) {
      try { const p = JSON.parse(stored); if (p.slug) setImpersonateSlug(p.slug); } catch {}
    }
  }, []);

  const companyId = (user as any)?.companyId;
  const { data: companyData } = useGetCompany(companyId, { query: { enabled: !!companyId && !impersonateSlug } as any });
  const companySlug = impersonateSlug || (companyData as any)?.slug || "";

  const handleSubmit = async (): Promise<void> => {
    if (!form.title || !form.code || !form.departmentId) { toast({ title: "Title, code, and department are required", variant: "destructive" }); return; }
    const payload = { title: form.title, code: form.code.toUpperCase(), semester: form.semester || undefined, departmentId: parseInt(form.departmentId) };
    if (editId) await updateMutation.mutateAsync({ id: editId, data: payload });
    else await createMutation.mutateAsync({ data: payload });
    setForm({ title: "", code: "", semester: "", departmentId: "" });
    setShowForm(false);
    setEditId(null);
    refetch();
  };

  const handleEdit = (course: any) => {
    setEditId(course.id);
    setForm({ title: course.title, code: course.code, semester: course.semester || "", departmentId: String(course.departmentId) });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this course?")) return;
    await deleteMutation.mutateAsync({ id });
    refetch();
  };

  const openAIModal = (course: any) => {
    setAiModalCourse(course);
    setAiForm({ count: "30", difficulty: "medium", durationMinutes: "" });
    setAiResult(null);
  };

  const handleAISetQuestions = async () => {
    if (!aiModalCourse) return;
    setAiLoading(true);
    try {
      const res = await aiSetMutation.mutateAsync({
        data: {
          courseId: aiModalCourse.id,
          count: parseInt(aiForm.count),
          difficulty: aiForm.difficulty as any,
          durationMinutes: aiForm.durationMinutes ? parseInt(aiForm.durationMinutes) : undefined,
        }
      });
      setAiResult({ questionsGenerated: res.questionsGenerated, examTitle: res.exam.title });
    } catch (e: any) {
      toast({ title: e?.message || "Failed to generate questions", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  // ─── Syllabus Handlers ──────────────────────────────────────────────────────
  const openSyllabusModal = (course: any) => {
    setSyllabusModalCourse(course);
    setSyllabusText(course.syllabus || "");
  };

  const saveSyllabusText = async () => {
    if (!syllabusModalCourse) return;
    setSyllabusUploading(true);
    try {
      await apiClient(`/api/paulina/syllabus/${syllabusModalCourse.id}`, {
        method: "POST",
        body: JSON.stringify({ syllabus: syllabusText }),
      });
      toast({ title: "Syllabus saved! Paulina will now use it for question generation." });
      setSyllabusModalCourse(null);
      refetch();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setSyllabusUploading(false);
    }
  };

  const uploadSyllabusFile = async (file: File) => {
    if (!syllabusModalCourse) return;
    setSyllabusUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${(import.meta.env.BASE_URL ?? "").replace(/\/$/, "")}/api/paulina/syllabus/${syllabusModalCourse.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("cbt_token") ?? ""}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `Syllabus extracted from ${data.fileName} (${data.length.toLocaleString()} chars). Paulina will use this for questions.` });
        setSyllabusModalCourse(null);
        refetch();
      } else {
        toast({ title: data.error ?? "Upload failed", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setSyllabusUploading(false);
    }
  };

  const getDeptName = (deptId: number) => (departments as any[]).find((d: any) => d.id === deptId)?.name || "—";
  const getDeptSlug = (deptId: number) => (departments as any[]).find((d: any) => d.id === deptId)?.slug || "";

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading courses...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-500 mt-1">Manage courses, syllabi, exam links, and AI question generation</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditId(null); setForm({ title: "", code: "", semester: "", departmentId: "" }); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Course
        </Button>
      </div>

      {/* Department filter */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={selectedDeptId === "all" ? "default" : "outline"} onClick={() => setSelectedDeptId("all")}>All</Button>
        {(departments as any[]).map((d: any) => (
          <Button key={d.id} size="sm" variant={selectedDeptId === d.id ? "default" : "outline"} onClick={() => setSelectedDeptId(d.id)}>{d.name}</Button>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-2 border-blue-100">
          <CardHeader><CardTitle className="text-lg">{editId ? "Edit Course" : "New Course"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Introduction to Programming" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. CS101" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <Input value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} placeholder="e.g. First Semester 2024/2025" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                  <option value="">Select department...</option>
                  {(departments as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Course"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course list */}
      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">No courses yet</p>
            <p className="text-gray-400 text-sm mt-1">Create courses and use AI to generate exam questions instantly</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(courses as any[]).map((course: any) => {
            const deptSlug = getDeptSlug(course.departmentId);
            const examLink = companySlug && deptSlug ? `/org/${companySlug}/${deptSlug}/${course.code.toLowerCase()}` : null;
            const isExpanded = expandedSyllabus === course.id;

            return (
              <Card key={course.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{course.title}</p>
                          <p className="text-sm text-gray-500">{course.code} · {getDeptName(course.departmentId)}{course.semester ? ` · ${course.semester}` : ""}</p>
                          {examLink && (
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-blue-500 flex items-center gap-1 truncate">
                                <LinkIcon className="w-3 h-3 shrink-0" />
                                {window.location.origin}{examLink}
                              </p>
                              <button className="text-xs text-blue-400 hover:text-blue-600 underline shrink-0"
                                onClick={() => { navigator.clipboard.writeText(window.location.origin + examLink); toast({ title: "Link copied!" }); }}>
                                copy
                              </button>
                            </div>
                          )}
                          {/* Syllabus indicator */}
                          {course.syllabus && (
                            <button onClick={() => setExpandedSyllabus(isExpanded ? null : course.id)}
                              className="mt-1.5 inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 hover:bg-emerald-100">
                              <FileText className="w-3 h-3" />
                              Syllabus attached
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 gap-1.5"
                            onClick={() => openSyllabusModal(course)}>
                            <FileText className="w-3.5 h-3.5" /> {course.syllabus ? "Update Syllabus" : "Add Syllabus"}
                          </Button>
                          <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 gap-1.5"
                            onClick={() => openAIModal(course)}>
                            <Wand2 className="w-3.5 h-3.5" /> AI Questions
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(course)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(course.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>

                      {/* Syllabus preview */}
                      {isExpanded && course.syllabus && (
                        <div className="mt-3 bg-gray-50 rounded-lg p-3 text-xs text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto border border-gray-200">
                          {course.syllabus.slice(0, 600)}{course.syllabus.length > 600 ? "\n...[truncated]" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Syllabus Modal */}
      <Modal isOpen={!!syllabusModalCourse} onClose={() => setSyllabusModalCourse(null)}
        title={`Syllabus — ${syllabusModalCourse?.code}: ${syllabusModalCourse?.title}`}>
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800">
            <p className="font-semibold mb-1">Why add a syllabus?</p>
            <p>Paulina will use the syllabus to generate course-specific exam questions that are directly relevant to your teaching content.</p>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Syllabus File</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-emerald-400 transition-colors cursor-pointer"
              onClick={() => syllabusFileRef.current?.click()}>
              {syllabusUploading ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  Extracting text...
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-sm text-gray-500">Click to upload PDF, Word, Excel, PowerPoint, or image</p>
                  <p className="text-xs text-gray-400 mt-0.5">Text will be auto-extracted using OCR</p>
                </>
              )}
            </div>
            <input ref={syllabusFileRef} type="file" className="hidden"
              accept=".pdf,.docx,.xlsx,.pptx,.txt,.md,.jpg,.jpeg,.png,.webp,.odt"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadSyllabusFile(f); e.target.value = ""; }}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">OR type / paste syllabus below</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Text input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Syllabus Text</label>
            <textarea
              rows={10}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              placeholder="Paste or type your course syllabus, learning objectives, topics, etc..."
              value={syllabusText}
              onChange={e => setSyllabusText(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setSyllabusModalCourse(null)}>Cancel</Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={!syllabusText.trim() || syllabusUploading} onClick={saveSyllabusText}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Save Syllabus
            </Button>
          </div>
        </div>
      </Modal>

      {/* AI Set Questions Modal */}
      <Modal isOpen={!!aiModalCourse} onClose={() => { setAiModalCourse(null); setAiResult(null); }}
        title={`AI Set Questions — ${aiModalCourse?.code}: ${aiModalCourse?.title}`}>
        {aiResult ? (
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-green-700">Questions Set Successfully!</p>
              <p className="text-sm text-gray-500 mt-1">{aiResult.questionsGenerated} questions generated and saved to the exam.</p>
              <p className="text-xs text-gray-400 mt-0.5">Exam: {aiResult.examTitle}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setAiResult(null)}>
                <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
              </Button>
              <Button className="flex-1" onClick={() => { setAiModalCourse(null); setAiResult(null); }}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {aiModalCourse?.syllabus && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-start gap-2">
                <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Syllabus attached!</p>
                  <p>Paulina will use this course's syllabus to generate highly relevant questions.</p>
                </div>
              </div>
            )}
            {!aiModalCourse?.syllabus && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">No syllabus attached</p>
                  <p>Add a syllabus to this course for more accurate, topic-specific questions. Tip: close this modal and click "Add Syllabus".</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={aiForm.count} onChange={e => setAiForm(f => ({ ...f, count: e.target.value }))}>
                  {[10, 20, 30, 40, 50, 60, 80, 100].map(n => <option key={n} value={n}>{n} Questions</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={aiForm.difficulty} onChange={e => setAiForm(f => ({ ...f, difficulty: e.target.value }))}>
                  <option value="easy">Easy — Basic recall & definitions</option>
                  <option value="medium">Medium — Applied understanding</option>
                  <option value="hard">Hard — Analysis & critical thinking</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exam Duration (minutes) — optional</label>
              <Input type="number" placeholder={`Auto: ~${parseInt(aiForm.count) * 2} minutes`}
                value={aiForm.durationMinutes} onChange={e => setAiForm(f => ({ ...f, durationMinutes: e.target.value }))} />
            </div>
            <div className="pt-2 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setAiModalCourse(null)}>Cancel</Button>
              <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={aiLoading} onClick={handleAISetQuestions}>
                <Wand2 className="w-4 h-4 mr-2" />
                {aiLoading ? "Generating..." : `Generate ${aiForm.count} Questions`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
