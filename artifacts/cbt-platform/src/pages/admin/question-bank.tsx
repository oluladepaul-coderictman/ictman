import * as React from "react";
import { useListExams, useGetExam } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Database, Search, ChevronDown, ChevronUp, BookOpen, CheckCircle2, XCircle, Eye } from "lucide-react";

function QuestionRow({ q, idx, showAnswer }: { q: any; idx: number; showAnswer: boolean }) {
  return (
    <div className="border border-gray-100 rounded-xl p-4 hover:border-blue-200 transition-colors">
      <div className="flex items-start gap-3">
        <span className="w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{idx + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{q.text}</p>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {(q.options as string[]).map((opt: string, i: number) => (
              <div key={i} className={`text-xs px-2 py-1 rounded-lg ${showAnswer && i === q.correctIndex ? "bg-green-50 text-green-700 font-semibold" : "bg-gray-50 text-gray-600"}`}>
                {String.fromCharCode(65 + i)}. {opt}
              </div>
            ))}
          </div>
          {showAnswer && q.explanation && (
            <p className="mt-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-2 py-1"><span className="font-semibold">Explanation:</span> {q.explanation}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ExamQuestions({ examId, search }: { examId: number; search: string }) {
  const { data: examData, isLoading } = useGetExam(examId);
  const [showAnswers, setShowAnswers] = React.useState(false);
  const exam = examData as any;
  const qs = (exam?.questions as any[] ?? []).filter(q => !search || q.text.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) return <div className="text-center py-4 text-gray-400 text-sm">Loading questions...</div>;
  if (qs.length === 0) return <div className="text-center py-4 text-gray-400 text-sm">No questions found</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{qs.length} question{qs.length !== 1 ? "s" : ""}</p>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAnswers(s => !s)}>
          <Eye className="w-3.5 h-3.5" /> {showAnswers ? "Hide" : "Show"} Answers
        </Button>
      </div>
      {qs.map((q: any, i: number) => <QuestionRow key={q.id} q={q} idx={i} showAnswer={showAnswers} />)}
    </div>
  );
}

export default function QuestionBankPage() {
  const { data: exams = [], isLoading } = useListExams();
  const [search, setSearch] = React.useState("");
  const [expanded, setExpanded] = React.useState<number | null>(null);

  const allExams = (exams as any[]).filter(e => !search || e.title.toLowerCase().includes(search.toLowerCase()) || (e.questionCount ?? 0) > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Question Bank</h1>
        <p className="text-gray-500 mt-1">Browse and review all questions across your exams</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search exams or questions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading question bank...</div>
      ) : allExams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No exams found</p>
            <p className="text-gray-400 text-sm mt-1">Create exams and generate questions to populate the question bank</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{allExams.length} exam{allExams.length !== 1 ? "s" : ""} · {allExams.reduce((sum: number, e: any) => sum + (e.questionCount ?? 0), 0)} total questions</p>
          {allExams.map((exam: any) => (
            <Card key={exam.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-0">
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 rounded-xl transition-colors"
                  onClick={() => setExpanded(expanded === exam.id ? null : exam.id)}
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{exam.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{exam.questionCount ?? 0} questions</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-500">{exam.durationMinutes} min</span>
                      {exam.isAiGenerated && <Badge className="text-xs bg-purple-50 text-purple-700 border-purple-200">AI Generated</Badge>}
                    </div>
                  </div>
                  {expanded === exam.id ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>
                {expanded === exam.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                    <ExamQuestions examId={exam.id} search={search} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
