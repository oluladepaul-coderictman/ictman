import * as React from "react";
import { useListMyResults } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, Award, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { formatTime } from "@/lib/utils";

function getGrade(score: number) {
  if (score >= 70) return { letter: "A", color: "text-green-700", bg: "bg-green-50" };
  if (score >= 60) return { letter: "B", color: "text-blue-700", bg: "bg-blue-50" };
  if (score >= 50) return { letter: "C", color: "text-yellow-700", bg: "bg-yellow-50" };
  if (score >= 40) return { letter: "D", color: "text-orange-700", bg: "bg-orange-50" };
  return { letter: "F", color: "text-red-700", bg: "bg-red-50" };
}

export default function StaffPerformancePage() {
  const { data: results = [], isLoading } = useListMyResults();
  const allResults = results as any[];

  const sorted = [...allResults].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const avgScore = allResults.length > 0 ? (allResults.reduce((s, r) => s + r.score, 0) / allResults.length).toFixed(1) : "—";
  const best = allResults.length > 0 ? Math.max(...allResults.map(r => r.score)).toFixed(1) : "—";
  const passed = allResults.filter(r => r.score >= 50).length;

  const trendData = sorted.map((r, i) => ({
    label: `#${i + 1}`,
    score: +r.score.toFixed(1),
    name: r.exam?.title?.slice(0, 20) ?? `Exam ${r.examId}`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Performance</h1>
        <p className="text-gray-500 mt-1">Track your exam history and performance trends</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Exams Taken", value: allResults.length, icon: Award, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Average Score", value: `${avgScore}%`, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Best Score", value: `${best}%`, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Passed", value: passed, icon: Award, color: "text-orange-600", bg: "bg-orange-50" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-3">
              <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {trendData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Score Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any, _, { payload }) => [`${v}%`, payload?.name ?? "Score"]} />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: "#3b82f6" }} name="Score" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Exam History</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-400">Loading...</p>
          ) : allResults.length === 0 ? (
            <p className="text-center py-8 text-gray-400">No exams taken yet</p>
          ) : (
            <div className="space-y-3">
              {[...allResults].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((r: any) => {
                const grade = getGrade(r.score);
                const passed = r.score >= 50;
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200">
                    <div className={`w-10 h-10 ${grade.bg} rounded-xl flex items-center justify-center shrink-0`}>
                      <span className={`text-sm font-bold ${grade.color}`}>{grade.letter}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.exam?.title ?? `Exam #${r.examId}`}</p>
                      <p className="text-xs text-gray-400">{format(new Date(r.createdAt), "dd MMM yyyy, HH:mm")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-gray-900">{r.score?.toFixed(1)}%</p>
                      <div className={`flex items-center gap-1 text-xs justify-end ${passed ? "text-green-600" : "text-red-500"}`}>
                        {passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {passed ? "Pass" : "Fail"}
                      </div>
                    </div>
                    {r.timeTakenSeconds && (
                      <div className="text-right text-xs text-gray-400 shrink-0 hidden sm:block">
                        <Clock className="w-3 h-3 inline mr-1" />{formatTime(r.timeTakenSeconds)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
