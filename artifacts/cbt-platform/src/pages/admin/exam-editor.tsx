import * as React from "react";
import { useLocation, useParams } from "wouter";
import { useCreateExam, useUpdateExam, useGetExam, useListCourses } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowLeft, GripVertical, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface QuestionForm {
  id?: number;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export default function ExamEditor() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const isEditing = !!params.id;
  const { toast } = useToast();

  const { data: existingExam, isLoading: isLoadingExam } = useGetExam(Number(params.id), {
    query: { enabled: isEditing } as any
  });
  const { data: courses = [] } = useListCourses({});

  const createMutation = useCreateExam();
  const updateMutation = useUpdateExam();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [durationMinutes, setDurationMinutes] = React.useState(30);
  const [isActive, setIsActive] = React.useState(true);
  const [courseId, setCourseId] = React.useState<number | "">("");
  const [questions, setQuestions] = React.useState<QuestionForm[]>([
    { text: "", options: ["", "", "", ""], correctIndex: 0 }
  ]);

  // AI generation state
  const [showAiPanel, setShowAiPanel] = React.useState(false);
  const [aiTopic, setAiTopic] = React.useState("");
  const [aiDifficulty, setAiDifficulty] = React.useState<"Easy" | "Medium" | "Hard">("Medium");
  const [aiCount, setAiCount] = React.useState(5);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [aiError, setAiError] = React.useState("");

  React.useEffect(() => {
    if (existingExam) {
      setTitle(existingExam.title);
      setDescription(existingExam.description || "");
      setDurationMinutes(existingExam.durationMinutes);
      setIsActive(existingExam.isActive);
      setCourseId((existingExam as any).courseId || "");
      if (existingExam.questions.length > 0) {
        setQuestions(existingExam.questions.map((q: any) => ({
          id: q.id,
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation || ""
        })));
      }
    }
  }, [existingExam]);

  const addQuestion = () => {
    setQuestions([...questions, { text: "", options: ["", "", "", ""], correctIndex: 0 }]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleGenerateWithAI = async () => {
    if (!aiTopic) { setAiError("Please enter a topic"); return; }
    setIsGenerating(true);
    setAiError("");
    try {
      const res = await fetch(`/api/ai-config/generate-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("cbt_token")}` },
        body: JSON.stringify({ topic: aiTopic, difficulty: aiDifficulty, count: aiCount }),
      });
      if (!res.ok) {
        const err = await res.json();
        setAiError(err.error || "Failed to generate questions");
        return;
      }
      const data = await res.json();
      if (data.questions?.length > 0) {
        const newQuestions: QuestionForm[] = data.questions.map((q: any) => ({
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation || "",
        }));
        const filtered = questions.filter(q => q.text || q.options.some(o => o));
        setQuestions([...filtered, ...newQuestions]);
        setShowAiPanel(false);
        setAiTopic("");
      } else {
        setAiError("AI returned no valid questions. Try a different topic.");
      }
    } catch {
      setAiError("Network error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!title) { toast({ title: "Title is required", variant: "destructive" }); return; }
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text) { toast({ title: `Question ${i + 1} text is required`, variant: "destructive" }); return; }
      for (let j = 0; j < 4; j++) {
        if (!questions[i].options[j]) { toast({ title: `Question ${i + 1}: option ${j + 1} is empty`, variant: "destructive" }); return; }
      }
    }
    const payload = {
      title, description, durationMinutes, isActive,
      courseId: courseId ? Number(courseId) : undefined,
      questions: questions.map((q, i) => ({
        text: q.text, options: q.options, correctIndex: q.correctIndex,
        explanation: q.explanation || undefined, order: i
      }))
    };
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: Number(params.id), data: payload });
      } else {
        await createMutation.mutateAsync({ data: payload });
      }
      toast({ title: isEditing ? "Exam updated successfully" : "Exam created successfully" });
      setLocation("/admin/exams");
    } catch (e: any) {
      toast({ title: e?.message ?? "Failed to save exam", variant: "destructive" });
    }
  };

  if (isEditing && isLoadingExam) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/admin/exams" className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-display font-bold">{isEditing ? "Edit Exam" : "Create Exam"}</h1>
        <div className="ml-auto">
          <Button onClick={handleSave} isLoading={createMutation.isPending || updateMutation.isPending}>
            Save Exam
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <Input label="Exam Title" placeholder="e.g. Quarterly Compliance Training" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Instructions for examinees..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Duration (minutes)" type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value))} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <select className="flex h-11 w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" value={isActive ? "true" : "false"} onChange={(e) => setIsActive(e.target.value === "true")}>
                <option value="true">Active (Published)</option>
                <option value="false">Draft (Hidden)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Linked Course</label>
              <select className="flex h-11 w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" value={courseId} onChange={(e) => setCourseId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">No course linked</option>
                {(courses as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold">Questions ({questions.length})</h2>
          <Button
            variant="outline"
            className="gap-2 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-blue-100"
            onClick={() => setShowAiPanel(!showAiPanel)}
          >
            <Sparkles className="h-4 w-4" />
            Generate with AI
            {showAiPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {showAiPanel && (
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-purple-800">
                <Sparkles className="h-4 w-4" /> AI Question Generator
              </CardTitle>
              <p className="text-sm text-purple-600">Describe the topic and AI will generate questions for you. Questions will be added to your existing list.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic / Subject</label>
                <Input
                  placeholder="e.g. JavaScript Arrays, Nigerian Constitution 1999, Basic Accounting Principles..."
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !isGenerating && handleGenerateWithAI()}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white" value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value as any)}>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
                  <Input type="number" min={1} max={30} value={aiCount} onChange={e => setAiCount(parseInt(e.target.value))} />
                </div>
              </div>
              {aiError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{aiError}</p>}
              <div className="flex gap-2">
                <Button onClick={handleGenerateWithAI} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700">
                  {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate {aiCount} Questions</>}
                </Button>
                <Button variant="outline" onClick={() => setShowAiPanel(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {questions.map((q, qIdx) => (
          <Card key={qIdx} className="overflow-hidden border-border/60 shadow-none">
            <div className="bg-muted/30 px-4 py-3 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Question {qIdx + 1}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeQuestion(qIdx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <CardContent className="p-4 space-y-4">
              <Input
                placeholder="What is..."
                value={q.text}
                onChange={(e) => {
                  const newQ = [...questions];
                  newQ[qIdx].text = e.target.value;
                  setQuestions(newQ);
                }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((optIdx) => (
                  <div key={optIdx} className={`flex items-center gap-3 p-2 rounded-xl border ${q.correctIndex === optIdx ? 'border-success bg-success/5' : 'border-border'}`}>
                    <input
                      type="radio"
                      name={`correct-${qIdx}`}
                      checked={q.correctIndex === optIdx}
                      onChange={() => {
                        const newQ = [...questions];
                        newQ[qIdx].correctIndex = optIdx;
                        setQuestions(newQ);
                      }}
                      className="ml-2 w-4 h-4 text-success focus:ring-success border-border"
                    />
                    <input
                      type="text"
                      className="flex-1 bg-transparent text-sm focus:outline-none"
                      placeholder={`Option ${optIdx + 1}`}
                      value={q.options[optIdx]}
                      onChange={(e) => {
                        const newQ = [...questions];
                        newQ[qIdx].options[optIdx] = e.target.value;
                        setQuestions(newQ);
                      }}
                    />
                  </div>
                ))}
              </div>
              {q.explanation && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs text-blue-500 font-medium mb-1">AI Explanation</p>
                  <p className="text-sm text-blue-800">{q.explanation}</p>
                </div>
              )}
              {!q.explanation && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Explanation (optional)</label>
                  <input
                    type="text"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    placeholder="Why is this the correct answer?"
                    value={q.explanation || ""}
                    onChange={e => {
                      const newQ = [...questions];
                      newQ[qIdx].explanation = e.target.value;
                      setQuestions(newQ);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" className="w-full h-14 border-dashed" onClick={addQuestion}>
          <Plus className="mr-2 h-4 w-4" /> Add Another Question
        </Button>
      </div>
    </div>
  );
}
