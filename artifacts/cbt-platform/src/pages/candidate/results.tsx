import * as React from "react";
import { useListMyResults } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, XCircle, Clock, FileQuestion, Printer, GraduationCap, CheckCircle2, BookOpen } from "lucide-react";
import { format } from "date-fns";

export default function CandidateResults() {
  const { user } = useAuth();
  const { data: results, isLoading } = useListMyResults();
  const [expanded, setExpanded] = React.useState<number | null>(null);

  const handlePrint = () => window.print();

  const formatDuration = (secs: number) => `${Math.floor(secs / 60)}m ${secs % 60}s`;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-block { page-break-inside: avoid; }
        }
      `}</style>

      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">My Results</h1>
            <p className="text-muted-foreground mt-2">View your exam results and print individual result slips</p>
          </div>
          <Button variant="outline" onClick={handlePrint} className="no-print">
            <Printer className="w-4 h-4 mr-2" /> Print All
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : !results || results.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground bg-surface border border-dashed border-border rounded-2xl">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-lg font-medium">No published results yet</p>
            <p className="text-sm mt-1">Your results will appear here once your lecturer releases them.</p>
            <p className="text-xs mt-2 text-muted-foreground/60">If you've taken exams, your results are pending review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(results as any[]).map((result: any) => {
              const pct = Math.round(result.score ?? 0);
              const passed = pct >= 50;
              const isOpen = expanded === result.id;
              const gradedAnswers: any[] = result.answers ?? [];
              const examTitle = result.exam?.title ?? `Exam #${result.examId}`;

              return (
                <Card key={result.id} className={`print-block overflow-hidden border-l-4 ${passed ? 'border-l-green-500' : 'border-l-red-400'}`}>
                  <CardContent className="p-0">
                    {/* Summary row */}
                    <div className="flex items-center gap-4 p-5">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${passed ? 'bg-green-100' : 'bg-red-100'}`}>
                        {passed ? <Trophy className="w-6 h-6 text-green-600" /> : <XCircle className="w-6 h-6 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{examTitle}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(result.createdAt), "MMM d, yyyy · h:mm a")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-2xl font-bold ${passed ? 'text-green-600' : 'text-red-500'}`}>{pct}%</p>
                        <p className={`text-xs font-semibold ${passed ? 'text-green-600' : 'text-red-500'}`}>{passed ? "PASSED" : "FAILED"}</p>
                      </div>
                      <div className="flex gap-2 no-print">
                        <Button size="sm" variant="outline" onClick={() => setExpanded(isOpen ? null : result.id)}>
                          {isOpen ? "Collapse" : "Review"}
                        </Button>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex gap-6 px-5 pb-4 text-sm text-gray-500 border-t border-gray-100 pt-3">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        {result.correctAnswers ?? 0}/{result.totalQuestions ?? 0} correct
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-400" />
                        {formatDuration(result.timeTakenSeconds ?? 0)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileQuestion className="w-4 h-4 text-purple-400" />
                        {result.totalQuestions ?? 0} questions
                      </span>
                    </div>

                    {/* Expanded answer review (screen only — answers stored in result.answers) */}
                    {isOpen && gradedAnswers.length > 0 && (
                      <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-3">
                        <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                          <BookOpen className="w-4 h-4" /> Answer Review
                        </h3>
                        {gradedAnswers.map((a: any, i: number) => (
                          <div key={i} className={`text-sm p-3 rounded-lg flex items-start gap-3 ${a.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                              Q{i + 1}
                            </span>
                            <span className={`font-medium ${a.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                              {a.isCorrect ? "Correct" : "Incorrect"} — {a.isCorrect ? "Well done!" : "Review this topic"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Print result slip (only shown when printing this card) */}
                    <div className="hidden print:block px-5 pb-5 border-t border-gray-200 pt-4">
                      <div className="text-center mb-4 border-b-2 border-gray-800 pb-3">
                        <h2 className="text-xl font-bold uppercase tracking-widest">Official Result Slip</h2>
                        <p className="text-xs text-gray-500">{format(new Date(), "MMMM d, yyyy")}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-gray-500">Student</p><p className="font-bold">{user?.name}</p></div>
                        <div><p className="text-gray-500">Exam</p><p className="font-bold">{examTitle}</p></div>
                        <div><p className="text-gray-500">Score</p><p className="font-bold text-lg">{pct}%</p></div>
                        <div><p className="text-gray-500">Status</p><p className={`font-bold text-lg ${passed ? 'text-green-700' : 'text-red-700'}`}>{passed ? "PASSED" : "FAILED"}</p></div>
                        <div><p className="text-gray-500">Correct Answers</p><p className="font-bold">{result.correctAnswers}/{result.totalQuestions}</p></div>
                        <div><p className="text-gray-500">Time Taken</p><p className="font-bold">{formatDuration(result.timeTakenSeconds)}</p></div>
                        <div><p className="text-gray-500">Date</p><p className="font-bold">{format(new Date(result.createdAt), "MMM d, yyyy")}</p></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Printable broadsheet summary */}
        {results && results.length > 0 && (
          <div className="hidden print:block mt-8 border-t-2 border-gray-800 pt-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold uppercase tracking-widest">Result Summary</h2>
              <p className="text-gray-600">{user?.name}</p>
              <p className="text-sm text-gray-400">Printed: {format(new Date(), "MMMM d, yyyy")}</p>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left">S/N</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Exam</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">Score</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">Correct</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">Status</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {(results as any[]).map((r: any, i: number) => {
                  const p = Math.round(r.score ?? 0) >= 50;
                  return (
                    <tr key={r.id}>
                      <td className="border border-gray-300 px-3 py-2">{i + 1}</td>
                      <td className="border border-gray-300 px-3 py-2">{r.exam?.title ?? `Exam #${r.examId}`}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center font-bold">{Math.round(r.score ?? 0)}%</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">{r.correctAnswers}/{r.totalQuestions}</td>
                      <td className={`border border-gray-300 px-3 py-2 text-center font-bold ${p ? 'text-green-700' : 'text-red-700'}`}>{p ? "PASS" : "FAIL"}</td>
                      <td className="border border-gray-300 px-3 py-2">{format(new Date(r.createdAt), "MMM d, yyyy")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
