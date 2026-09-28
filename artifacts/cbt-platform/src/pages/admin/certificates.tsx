import * as React from "react";
import { useListResults, useGetCompany } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Award, Download, Printer, CheckCircle2, XCircle, Trophy } from "lucide-react";
import { format } from "date-fns";

function getGrade(score: number, passMark = 50) {
  if (score >= 70) return { letter: "A", color: "text-green-700", bg: "bg-green-50" };
  if (score >= 60) return { letter: "B", color: "text-blue-700", bg: "bg-blue-50" };
  if (score >= passMark) return { letter: "C", color: "text-yellow-700", bg: "bg-yellow-50" };
  if (score >= 40) return { letter: "D", color: "text-orange-700", bg: "bg-orange-50" };
  return { letter: "F", color: "text-red-700", bg: "bg-red-50" };
}

function CertificateView({ result, company }: { result: any; company: any }) {
  const passMark = company?.passMark ?? 50;
  const passed = result.score >= passMark;
  const grade = getGrade(result.score, passMark);

  return (
    <div id={`cert-${result.id}`} className="bg-white border-4 border-double border-amber-400 rounded-2xl p-8 max-w-2xl mx-auto print:border-amber-600">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center border-4 border-amber-400">
            <Trophy className="w-10 h-10 text-amber-500" />
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400 font-medium">{company?.name ?? "CBT Platform"}</p>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">Certificate of {passed ? "Achievement" : "Participation"}</h2>
          <p className="text-gray-500 text-sm mt-1">This is to certify that</p>
        </div>
        <div className="border-t border-b border-gray-200 py-4">
          <p className="text-2xl font-bold text-gray-900">{result.candidate?.fullName ?? result.user?.name ?? "—"}</p>
          <p className="text-sm text-gray-500 mt-0.5">{result.candidate?.username ? `@${result.candidate.username}` : ""}</p>
        </div>
        <div className="space-y-1">
          <p className="text-gray-600 text-sm">has {passed ? "successfully completed" : "participated in"}</p>
          <p className="text-lg font-semibold text-gray-900">{result.exam?.title ?? `Exam #${result.examId}`}</p>
        </div>
        <div className="flex justify-center gap-8 pt-2">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{result.score?.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Final Score</p>
          </div>
          <div className="text-center">
            <p className={`text-3xl font-bold ${grade.color}`}>{grade.letter}</p>
            <p className="text-xs text-gray-500 mt-0.5">Grade</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold ${passed ? "text-green-600" : "text-red-500"}`}>{passed ? "PASSED" : "FAILED"}</p>
            <p className="text-xs text-gray-500 mt-0.5">Result</p>
          </div>
        </div>
        <div className="flex justify-between items-end pt-4 border-t border-gray-200">
          <div className="text-left">
            <p className="text-xs text-gray-400">Date Issued</p>
            <p className="text-sm font-medium">{result.publishedAt ? format(new Date(result.publishedAt), "dd MMMM yyyy") : format(new Date(result.createdAt), "dd MMMM yyyy")}</p>
          </div>
          <div className="text-center">
            <div className="w-24 border-t border-gray-400" />
            <p className="text-xs text-gray-400 mt-1">Authorized Signature</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Certificate No.</p>
            <p className="text-sm font-mono font-medium text-gray-600">CBT-{String(result.id).padStart(6, "0")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CertificatesPage() {
  const { user } = useAuth();
  const companyId = (user as any)?.companyId;
  const { data: results = [], isLoading } = useListResults();
  const { data: company } = useGetCompany(companyId, { query: { enabled: !!companyId } as any });

  const [selectedResult, setSelectedResult] = React.useState<any>(null);
  const [filter, setFilter] = React.useState<"all" | "passed" | "failed">("all");

  const allResults = (results as any[]).filter(r => r.isPublished);
  const passMark = (company as any)?.passMark ?? 50;

  const filtered = allResults.filter(r => {
    if (filter === "passed") return r.score >= passMark;
    if (filter === "failed") return r.score < passMark;
    return true;
  });

  const handlePrint = () => window.print();
  const handleExportAll = () => {
    const csvRows = ["Candidate,Username,Exam,Score,Grade,Status,Date"];
    for (const r of filtered) {
      const grade = getGrade(r.score, passMark);
      const passed = r.score >= passMark;
      csvRows.push([
        r.candidate?.fullName ?? r.user?.name ?? "—",
        r.candidate?.username ?? "—",
        r.exam?.title ?? `Exam #${r.examId}`,
        `${r.score?.toFixed(1)}%`,
        grade.letter,
        passed ? "PASSED" : "FAILED",
        format(new Date(r.createdAt), "yyyy-MM-dd"),
      ].join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "certificates.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (selectedResult) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 print:hidden">
          <Button variant="outline" onClick={() => setSelectedResult(null)}>← Back</Button>
          <Button onClick={handlePrint} className="gap-2"><Printer className="w-4 h-4" /> Print Certificate</Button>
        </div>
        <CertificateView result={selectedResult} company={company} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Certificates</h1>
          <p className="text-gray-500 mt-1">View and print certificates for published results</p>
        </div>
        <Button variant="outline" onClick={handleExportAll} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="flex gap-2">
        {(["all", "passed", "failed"] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading results...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Award className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No published results yet</p>
            <p className="text-gray-400 text-sm mt-1">Publish results from the Results page to generate certificates</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r: any) => {
            const grade = getGrade(r.score, passMark);
            const passed = r.score >= passMark;
            return (
              <Card key={r.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center gap-4 py-4 px-5">
                  <div className={`w-10 h-10 ${grade.bg} rounded-xl flex items-center justify-center shrink-0`}>
                    <span className={`text-base font-bold ${grade.color}`}>{grade.letter}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{r.candidate?.fullName ?? r.user?.name ?? "—"}</p>
                    <p className="text-sm text-gray-500 truncate">{r.exam?.title ?? `Exam #${r.examId}`}</p>
                    <p className="text-xs text-gray-400">{format(new Date(r.createdAt), "dd MMM yyyy")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-gray-900">{r.score?.toFixed(1)}%</p>
                    <div className={`flex items-center gap-1 text-xs ${passed ? "text-green-600" : "text-red-500"}`}>
                      {passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {passed ? "PASSED" : "FAILED"}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSelectedResult(r)}>
                    <Award className="w-3.5 h-3.5" /> View Certificate
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
