import * as React from "react";
import { useListCompanies } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Building2, Users, GraduationCap, Globe, TrendingUp } from "lucide-react";
import { apiClient } from "@/lib/api-client";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16"];

export default function SuperAdminAnalytics() {
  const { data: companies = [] } = useListCompanies();
  const [platformStats, setPlatformStats] = React.useState<any>(null);

  React.useEffect(() => {
    apiClient("/api/analytics/platform").then(setPlatformStats).catch(() => {});
  }, []);

  const allCompanies = companies as any[];

  const companyTypeData = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of allCompanies) {
      const t = c.type || "Unknown";
      map[t] = (map[t] || 0) + 1;
    }
    return Object.entries(map).map(([type, count]) => ({ type, count }));
  }, [allCompanies]);

  const activeVsInactive = [
    { name: "Active", value: allCompanies.filter(c => c.isActive).length },
    { name: "Inactive", value: allCompanies.filter(c => !c.isActive).length },
  ].filter(d => d.value > 0);

  const stats = [
    { label: "Total Companies", value: allCompanies.length, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Companies", value: allCompanies.filter(c => c.isActive).length, icon: Globe, color: "text-green-600", bg: "bg-green-50" },
    { label: "Total Exams", value: platformStats?.totalExams ?? "—", icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Results", value: platformStats?.totalResults ?? "—", icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
        <p className="text-gray-500 mt-1">Overview of the entire CBT platform across all organizations</p>
      </div>

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
        <Card>
          <CardHeader><CardTitle>Companies by Type</CardTitle></CardHeader>
          <CardContent>
            {companyTypeData.length === 0 ? <p className="text-center text-gray-400 py-8">No data</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={companyTypeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
                  <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Companies" radius={[4, 4, 0, 0]}>
                    {companyTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Active vs Inactive</CardTitle></CardHeader>
          <CardContent>
            {activeVsInactive.length === 0 ? <p className="text-center text-gray-400 py-8">No data</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={activeVsInactive} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {activeVsInactive.map((_, i) => <Cell key={i} fill={i === 0 ? "#10b981" : "#ef4444"} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>All Companies</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Company</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Type</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Slug</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {allCompanies.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{c.name}</td>
                      <td className="py-2 px-3 text-gray-500">{c.type ?? "—"}</td>
                      <td className="py-2 px-3 font-mono text-xs text-gray-400">{c.slug ?? "—"}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
