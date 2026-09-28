import * as React from "react";
import { useGetBroadsheet, useListExams, useListDepartments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function BroadsheetPage() {
  const { user } = useAuth();
  const { data: exams = [] } = useListExams();
  const { data: departments = [] } = useListDepartments();
  const [selectedExamId, setSelectedExamId] = React.useState<number | "">("");
  const [selectedDeptId, setSelectedDeptId] = React.useState<number | "">("");

  const { data: broadsheet, isLoading, refetch } = useGetBroadsheet(
    selectedExamId ? { examId: Number(selectedExamId), departmentId: selectedDeptId ? Number(selectedDeptId) : undefined } : {},
    { query: { enabled: !!selectedExamId } as any }
  );

  const handlePrint = () => window.print();

  const rows = broadsheet?.rows ?? [];
  const exam = broadsheet?.exam;
  const department = broadsheet?.department;

  const passCount = rows.filter((r: any) => r.score >= 50).length;
  const failCount = rows.length - passCount;
  const avgScore = rows.length > 0 ? (rows.reduce((sum: number, r: any) => sum + r.score, 0) / rows.length).toFixed(1) : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Result Broadsheet</h1>
          <p className="text-gray-500 mt-1">View and print candidate results by exam</p>
        </div>
        {rows.length > 0 && (
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> Print Broadsheet
          </Button>
        )}
      </div>

      <div className="flex gap-4 print:hidden">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Exam</label>
          <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Choose an exam...</option>
            {(exams as any[]).map((e: any) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Department (optional)</label>
          <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={selectedDeptId} onChange={e => setSelectedDeptId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">All Departments</option>
            {(departments as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <Button variant="outline" onClick={() => refetch()} disabled={!selectedExamId || isLoading}>
            {isLoading ? "Loading..." : "Load"}
          </Button>
        </div>
      </div>

      {broadsheet && (
        <div id="broadsheet-print">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 print:text-3xl">{exam?.title}</h2>
            {department && <p className="text-gray-600">Department: {department.name}</p>}
            <p className="text-gray-500 text-sm">Generated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6 print:hidden">
            <Card><CardContent className="py-4 text-center"><p className="text-2xl font-bold text-blue-600">{rows.length}</p><p className="text-sm text-gray-500">Total Candidates</p></CardContent></Card>
            <Card><CardContent className="py-4 text-center"><p className="text-2xl font-bold text-green-600">{passCount}</p><p className="text-sm text-gray-500">Passed (≥50%)</p></CardContent></Card>
            <Card><CardContent className="py-4 text-center"><p className="text-2xl font-bold text-red-600">{failCount}</p><p className="text-sm text-gray-500">Failed</p></CardContent></Card>
            <Card><CardContent className="py-4 text-center"><p className="text-2xl font-bold text-purple-600">{avgScore}%</p><p className="text-sm text-gray-500">Average Score</p></CardContent></Card>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="border border-gray-400 px-4 py-3 text-left">#</th>
                  <th className="border border-gray-400 px-4 py-3 text-left">Full Name</th>
                  <th className="border border-gray-400 px-4 py-3 text-left">Username</th>
                  <th className="border border-gray-400 px-4 py-3 text-center">Score (%)</th>
                  <th className="border border-gray-400 px-4 py-3 text-center">Correct</th>
                  <th className="border border-gray-400 px-4 py-3 text-center">Total Qs</th>
                  <th className="border border-gray-400 px-4 py-3 text-center">Time (min)</th>
                  <th className="border border-gray-400 px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any, i: number) => (
                  <tr key={r.candidateId} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-300 px-4 py-2 text-gray-500">{i + 1}</td>
                    <td className="border border-gray-300 px-4 py-2 font-medium">{r.fullName}</td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-600">{r.username}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center font-bold text-lg">{r.score.toFixed(1)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{r.correctAnswers}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{r.totalQuestions}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{Math.ceil(r.timeTakenSeconds / 60)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.score >= 50 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {r.score >= 50 ? "PASS" : "FAIL"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan={3} className="border border-gray-300 px-4 py-2">Summary</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">{avgScore}</td>
                  <td colSpan={4} className="border border-gray-300 px-4 py-2 text-center">{passCount} Pass / {failCount} Fail</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {!broadsheet && selectedExamId && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No results found for this exam. Candidates may not have taken it yet.
          </CardContent>
        </Card>
      )}

      {!selectedExamId && (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            Select an exam above to load the broadsheet
          </CardContent>
        </Card>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #broadsheet-print, #broadsheet-print * { visibility: visible; }
          #broadsheet-print { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
