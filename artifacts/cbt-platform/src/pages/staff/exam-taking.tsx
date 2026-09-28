import * as React from "react";
import { useParams, useLocation } from "wouter";
import { useGetExam, useSubmitExam } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/utils";
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Printer, Trophy, XCircle, BookOpen, PartyPopper } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function ExamTaking() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: exam, isLoading } = useGetExam(Number(params.id));
  const submitMutation = useSubmitExam();

  const [started, setStarted] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [timeRemaining, setTimeRemaining] = React.useState(0);
  const [result, setResult] = React.useState<any>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (exam && !started) {
      setTimeRemaining(exam.durationMinutes * 60);
    }
  }, [exam, started]);

  React.useEffect(() => {
    if (started && timeRemaining > 0 && !result) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, result]);

  const handleStart = () => setStarted(true);

  const handleAnswer = (questionId: number, selectedIdx: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: selectedIdx }));
  };

  const handleSubmit = async () => {
    if (!exam) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = exam.durationMinutes * 60 - timeRemaining;
    const formattedAnswers = Object.entries(answers).map(([qId, sIdx]) => ({
      questionId: Number(qId),
      selectedIndex: sIdx
    }));

    try {
      const res = await submitMutation.mutateAsync({
        id: exam.id,
        data: { answers: formattedAnswers, timeTakenSeconds: timeTaken }
      });
      setResult(res);
    } catch (e: any) {
      toast({ title: e?.message ?? "Failed to submit exam. Please try again.", variant: "destructive" });
    }
  };

  const handlePrintSlip = () => window.print();

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center">Loading exam...</div>;
  if (!exam) return <div className="h-screen w-full flex items-center justify-center">Exam not found</div>;

  // ── CANDIDATE SUBMISSION CONFIRMATION ────────────────────────────────────
  if (result && result.submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Exam Submitted!</h1>
            <p className="text-gray-500">{result.message}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            Your results will appear in <strong>My Results</strong> once your lecturer releases them.
          </div>
          <Button onClick={() => setLocation(user?.role === "Candidate" ? "/candidate-exams" : "/candidate-exams")} className="w-full">
            Back to My Exams
          </Button>
        </div>
      </div>
    );
  }

  // ── RESULT SLIP ──────────────────────────────────────────────────────────
  if (result) {
    const pct = Math.round(result.score ?? 0);
    const passed = result.passed ?? pct >= 50;
    const timeTaken = result.timeTakenSeconds ?? 0;
    const gradedQs: any[] = result.gradedQuestions ?? [];

    return (
      <>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; }
            .print-card { box-shadow: none !important; border: 1px solid #ccc !important; }
          }
        `}</style>

        <div className="min-h-screen bg-gray-50 py-10 px-4">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Header / Score Banner */}
            <div className={`print-card rounded-2xl p-8 text-center text-white shadow-lg ${passed ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-red-700'}`}>
              <div className="flex justify-center mb-4">
                {passed
                  ? <Trophy className="w-16 h-16 text-yellow-300" />
                  : <XCircle className="w-16 h-16 text-white/80" />
                }
              </div>
              <h1 className="text-4xl font-bold mb-1">{pct}%</h1>
              <p className="text-2xl font-semibold mb-2">{passed ? "PASS" : "FAIL"}</p>
              <p className="text-white/90 text-lg">{exam.title}</p>
              <p className="text-white/70 mt-1 text-sm">
                {result.correctAnswers ?? 0} correct out of {result.totalQuestions ?? 0} questions · {Math.floor(timeTaken / 60)}m {timeTaken % 60}s
              </p>
            </div>

            {/* Candidate / Result Info */}
            <Card className="print-card p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Result Slip</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Candidate / Student</p>
                  <p className="font-semibold">{user?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Exam</p>
                  <p className="font-semibold">{exam.title}</p>
                </div>
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-semibold">{format(new Date(), "MMMM d, yyyy · h:mm a")}</p>
                </div>
                <div>
                  <p className="text-gray-500">Duration Used</p>
                  <p className="font-semibold">{Math.floor(timeTaken / 60)}m {timeTaken % 60}s of {exam.durationMinutes}m</p>
                </div>
                <div>
                  <p className="text-gray-500">Score</p>
                  <p className="font-semibold text-xl">{pct}% ({result.correctAnswers ?? 0}/{result.totalQuestions ?? 0})</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className={`font-bold text-lg ${passed ? 'text-green-600' : 'text-red-600'}`}>{passed ? "PASSED" : "FAILED"}</p>
                </div>
              </div>
            </Card>

            {/* Question-by-question review */}
            {gradedQs.length > 0 && (
              <Card className="print-card p-6">
                <h2 className="font-bold text-lg mb-4">Answer Review</h2>
                <div className="space-y-5">
                  {gradedQs.map((q: any, i: number) => (
                    <div key={q.id} className={`p-4 rounded-xl border-l-4 ${q.isCorrect ? 'border-green-500 bg-green-50' : 'border-red-400 bg-red-50'}`}>
                      <p className="font-medium text-sm text-gray-800 mb-2">
                        <span className="font-bold">{i + 1}.</span> {q.text}
                      </p>
                      <div className="grid grid-cols-1 gap-1 text-sm">
                        {q.options.map((opt: string, idx: number) => {
                          const isSelected = q.selectedIndex === idx;
                          const isCorrect = q.correctIndex === idx;
                          return (
                            <p key={idx} className={`px-3 py-1 rounded ${isCorrect ? 'text-green-800 font-semibold bg-green-100' : isSelected && !isCorrect ? 'text-red-700 line-through bg-red-100' : 'text-gray-600'}`}>
                              {String.fromCharCode(65 + idx)}. {opt}
                              {isCorrect && " ✓"}
                              {isSelected && !isCorrect && " ✗ (your answer)"}
                            </p>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <p className="mt-2 text-xs text-gray-500 italic">💡 {q.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3 no-print">
              <Button onClick={handlePrintSlip} variant="outline" className="flex-1">
                <Printer className="w-4 h-4 mr-2" /> Print Result Slip
              </Button>
              <Button onClick={() => setLocation(user?.role === "Candidate" ? "/candidate-exams" : "/my-results")} className="flex-1">
                View All Results
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── INTRO SCREEN ─────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center space-y-8">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl font-display font-bold">{exam.title}</h1>
        <p className="text-lg text-muted-foreground">{exam.description}</p>
        <div className="bg-surface border border-border rounded-2xl p-6 flex justify-center gap-12 text-left w-max mx-auto">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Duration</p>
            <p className="text-2xl font-bold">{exam.durationMinutes} min</p>
          </div>
          <div className="w-px bg-border"></div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Questions</p>
            <p className="text-2xl font-bold">{exam.questions.length}</p>
          </div>
        </div>
        <Button size="lg" className="w-full max-w-sm text-lg h-14" onClick={handleStart}>
          Begin Exam Now
        </Button>
      </div>
    );
  }

  // ── EXAM IN PROGRESS ─────────────────────────────────────────────────────
  const currentQ = exam.questions[currentIndex];
  const allAnswered = exam.questions.every(q => answers[q.id] !== undefined);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col md:flex-row">
      <div className="md:w-80 border-r border-border bg-surface flex flex-col h-auto md:h-full shrink-0">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold truncate pr-4">{exam.title}</h2>
          <div className={`font-mono font-bold text-lg px-3 py-1 rounded-md ${timeRemaining < 300 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
            {formatTime(timeRemaining)}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-5 gap-2">
            {exam.questions.map((q, i) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = i === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-10 rounded-lg font-medium text-sm transition-colors border ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''} ${isAnswered ? 'bg-success/10 border-success/30 text-success' : 'bg-surface border-border text-muted-foreground hover:bg-muted'}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-border mt-auto">
          <Button
            className="w-full h-12 text-base"
            variant={allAnswered ? "default" : "secondary"}
            onClick={() => {
              if (allAnswered || confirm("You have unanswered questions. Submit anyway?")) handleSubmit();
            }}
            isLoading={submitMutation.isPending}
          >
            Submit Exam
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        <div className="flex-1 overflow-auto p-6 md:p-12">
          <div className="max-w-3xl mx-auto w-full">
            <div className="mb-8 flex items-center gap-3">
              <span className="text-lg font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">Question {currentIndex + 1}</span>
              <span className="text-muted-foreground">of {exam.questions.length}</span>
            </div>
            <h3 className="text-2xl font-medium leading-relaxed mb-10 text-foreground">{currentQ.text}</h3>
            <div className="space-y-4">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = answers[currentQ.id] === optIdx;
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleAnswer(currentQ.id, optIdx)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-4 text-lg ${isSelected ? 'border-primary bg-primary/5 text-primary-foreground shadow-md shadow-primary/5' : 'border-border bg-surface hover:border-primary/40 hover:bg-muted'}`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary' : 'border-muted-foreground/40'}`}>
                      {isSelected && <div className="w-3 h-3 bg-primary rounded-full" />}
                    </div>
                    <span className={isSelected ? 'text-foreground font-medium' : 'text-foreground'}>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border bg-surface flex justify-between items-center shrink-0">
          <Button variant="outline" size="lg" disabled={currentIndex === 0} onClick={() => setCurrentIndex(prev => prev - 1)}>
            <ChevronLeft className="mr-2 h-5 w-5" /> Previous
          </Button>
          {currentIndex < exam.questions.length - 1 ? (
            <Button size="lg" onClick={() => setCurrentIndex(prev => prev + 1)}>
              Next <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button
              size="lg"
              className={allAnswered ? 'bg-success hover:bg-success/90' : ''}
              onClick={() => { if (allAnswered || confirm("Unanswered questions remain. Submit anyway?")) handleSubmit(); }}
              isLoading={submitMutation.isPending}
            >
              <CheckCircle2 className="mr-2 h-5 w-5" /> Finish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
