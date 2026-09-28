import * as React from "react";
import { useGetCompanyAnalytics, useListResults } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, GraduationCap, Award, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { data: analytics, isLoading: analyticsLoading } = useGetCompanyAnalytics();
  const { data: results, isLoading: resultsLoading } = useListResults();

  if (analyticsLoading) return <div className="animate-pulse h-96 bg-muted rounded-2xl"></div>;

  const recentResults = results?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Company Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your exams and examinees</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Staff</p>
              <p className="text-2xl font-bold">{analytics?.totalUsers || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Active Exams</p>
              <p className="text-2xl font-bold">{analytics?.totalExams || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center text-success">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Avg Score</p>
              <p className="text-2xl font-bold">{analytics?.averageScore.toFixed(1) || 0}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Results</p>
              <p className="text-2xl font-bold">{analytics?.totalResults || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pass Rates by Exam</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {analytics?.examStats && analytics.examStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.examStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="examTitle" axisLine={false} tickLine={false} fontSize={12} tickMargin={10} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    cursor={{fill: 'hsl(var(--muted))'}}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="passRate" name="Pass Rate %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No exam data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentResults?.map(res => (
                <div key={res.id} className="flex justify-between items-center border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{res.user?.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">{res.exam?.title ?? ""}</p>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold text-sm ${res.score >= 70 ? 'text-success' : 'text-destructive'}`}>
                      {res.score}%
                    </span>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(res.createdAt), 'MMM d')}</p>
                  </div>
                </div>
              ))}
              {(!recentResults || recentResults.length === 0) && (
                <div className="text-center py-8 text-sm text-muted-foreground">No recent results</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
