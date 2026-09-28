import * as React from "react";
import { useGetCompanyAnalytics, useListResults, useListExams, useListCandidates } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";
import { TrendingUp, Users, GraduationCap, Award, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function getGrade(score: number, passMark = 50) {
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= passMark) return "C";
  if (score >= 40) return "D";
  return "F";
}

export default function AnalyticsPage() {
  const { data: analytics } = useGetCompanyAnalytics();
  const { data: results = [] } = useListResults();
  const { data: exams = [] } = useListExams();
  const { data: candidates = [] } = useListCandidates();

  const allResults = results as any[];
  const allExams = exams as any[];
  const allCandidates = candidates as any[];

  const passMark = (analytics as any)?.passMark ?? 50;

  const scoreDistribution = React.useMemo(() => {
    const buckets = [
      { range: "0–20", count: 0 },
      { range: "21–40", count: 0 },
      { range: "41–60", count: 0 },
      { range: "61–80", count: 0 },
      { range: "81–100", count: 0 },
    ];
    for (const r of allResults) {
      const s = r.score ?? 0;
      if (s <= 20) buckets[0].count++;
      else if (s <= 40) buckets[1].count++;
      else if (s <= 60) buckets[2].count++;
      else if (s <= 80) buckets[3].count++;
      else buckets[4].count++;
    }
    return buckets;
  }, [allResults]);

  const gradeDistribution = React.useMemo(() => {
    const map: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const r of allResults) map[getGrade(r.score, passMark)]++;
    return Object.entries(map).map(([grade, count]) => ({ grade, count }));
  }, [allResults, passMark]);

  const examPerformance = React.useMemo(() => {
    const map: Record<number, { title: string; scores: number[]; count: number }> = {};
    for (const r of allResults) {
      if (!map[r.examId]) {
        const exam = allExams.find((e: any) => e.id === r.examId);
        map[r.examId] = { title: exam?.title?.slice(0, 20) ?? `Exam #${r.examId}`, scores: [], count: 0 };
      }
      map[r.examId].scores.push(r.score);
      map[r.examId].count++;
    }
    return Object.values(map).map(e => ({
      title: e.title,
      avg: e.scores.length ? +(e.scores.reduce((a, b) => a + b, 0) / e.scores.length).toFixed(1) : 0,
      count: e.count,
    })).slice(0, 8);
  }, [allResults, allExams]);

  const trendData = React.useMemo(() => {
    const monthly: Record<string, { month: string; count: number; avgScore: number; total: number }> = {};
    for (const r of allResults) {
      const month = format(new Date(r.createdAt), "MMM yy");
      if (!monthly[month]) monthly[month] = { month, count: 0, avgScore: 0, total: 0 };
      monthly[month].count++;
      monthly[month].total += r.score;
      monthly[month].avgScore = +(monthly[month].total / monthly[month].count).toFixed(1);
    }
    return Object.values(monthly).slice(-12);
  }, [allResults]);

  const passCount = allResults.filter(r => r.score >= passMark).length;
  const failCount = allResults.length - passCount;
  const passRate = allResults.length > 0 ? Math.round((passCount / allResults.length) * 100) : 0;

  const stats = [
    { label: "Total Exams", value: allExams.length, icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Candidates", value: allCandidates.length, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Results", value: allResults.length, icon: Award, color: "text-green-600", bg: "bg-green-50" },
    { label: "Pass Rate", value: `${passRate}%`, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Deep insights into exam performance across your organization</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-3">
              <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend over time */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" /> Performance Trend</CardTitle></CardHeader>
          <CardContent>
            {trendData.length === 0 ? <p className="text-center text-gray-400 py-8">No data yet</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="avgScore" stroke="#3b82f6" fill="url(#colorScore)" name="Avg Score %" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Score distribution */}
        <Card>
          <CardHeader><CardTitle>Score Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                  {scoreDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Grade distribution */}
        <Card>
          <CardHeader><CardTitle>Grade Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={gradeDistribution} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={80} label={({ grade, count }) => count > 0 ? `${grade}: ${count}` : ""}>
                  {gradeDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Per-exam performance */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Average Score Per Exam</CardTitle></CardHeader>
          <CardContent>
            {examPerformance.length === 0 ? <p className="text-center text-gray-400 py-8">No data yet</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={examPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="title" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`${v}%`, "Avg Score"]} />
                  <Bar dataKey="avg" name="Avg Score %" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pass/Fail summary */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700">{passCount}</p>
              <p className="text-sm text-gray-500">Passed</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-700">{passRate}%</p>
              <p className="text-sm text-gray-500">Pass Rate</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-700">{failCount}</p>
              <p className="text-sm text-gray-500">Failed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
