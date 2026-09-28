import * as React from "react";
import { useParams, useLocation } from "wouter";
import { useGetResult } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Trophy, Printer, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

function getGrade(score: number, passMark = 50) {
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= passMark) return "C";
  if (score >= 40) return "D";
  return "F";
}

export default function CandidateCertificate() {
  const params = useParams<{ resultId: string }>();
  const [, setLocation] = useLocation();
  const { data: result, isLoading } = useGetResult(parseInt(params.resultId));

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  if (!result) return <div className="flex items-center justify-center h-64 text-gray-400">Certificate not found</div>;

  const r = result as any;
  const passed = r.score >= 50;
  const grade = getGrade(r.score);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 print:hidden">
        <Button variant="outline" onClick={() => setLocation("/candidate-results")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" /> Print Certificate
        </Button>
      </div>

      <div className="bg-white border-4 border-double border-amber-400 rounded-2xl p-10 max-w-2xl mx-auto">
        <div className="text-center space-y-5">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center border-4 border-amber-400">
              <Trophy className="w-10 h-10 text-amber-500" />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 font-medium">CBT Platform</p>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">Certificate of {passed ? "Achievement" : "Participation"}</h2>
            <p className="text-gray-500 text-sm mt-1">This is to certify that</p>
          </div>
          <div className="border-t border-b border-gray-200 py-4">
            <p className="text-2xl font-bold text-gray-900">{r.candidate?.fullName ?? r.user?.name ?? "Candidate"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-gray-600 text-sm">has {passed ? "successfully completed" : "participated in"}</p>
            <p className="text-lg font-semibold text-gray-900">{r.exam?.title ?? `Exam #${r.examId}`}</p>
          </div>
          <div className="flex justify-center gap-8 pt-2">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{r.score?.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-0.5">Final Score</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-bold ${passed ? "text-green-600" : "text-red-500"}`}>{grade}</p>
              <p className="text-xs text-gray-500 mt-0.5">Grade</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${passed ? "text-green-600" : "text-red-500"}`}>{passed ? "PASSED" : "FAILED"}</p>
              <p className="text-xs text-gray-500 mt-0.5">Result</p>
            </div>
          </div>
          <div className="flex justify-between items-end pt-4 border-t border-gray-200">
            <div className="text-left">
              <p className="text-xs text-gray-400">Date</p>
              <p className="text-sm font-medium">{format(new Date(r.createdAt), "dd MMMM yyyy")}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Certificate No.</p>
              <p className="text-sm font-mono font-medium text-gray-600">CBT-{String(r.id).padStart(6, "0")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
