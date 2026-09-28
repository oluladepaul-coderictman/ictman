import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Users, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

interface Session {
  sessionId: number;
  examId: number;
  examTitle: string;
  participantName: string;
  participantUsername: string;
  isCandidate: boolean;
  startedAt: string;
  lastActiveAt: string;
  durationMinutes: number;
  remainingSeconds: number;
  progressPct: number;
  answersCount: number;
  currentQuestion: number;
  isTimedOut: boolean;
  status: string;
}

function formatTime(secs: number) {
  if (secs <= 0) return "00:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function LiveMonitor() {
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [lastRefresh, setLastRefresh] = React.useState(new Date());

  const fetchSessions = React.useCallback(async () => {
    try {
      const data = await apiClient("/api/monitor/active");
      setSessions(Array.isArray(data) ? data : []);
      setLastRefresh(new Date());
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  React.useEffect(() => {
    const tick = setInterval(() => {
      setSessions(prev => prev.map(s => ({
        ...s,
        remainingSeconds: Math.max(0, s.remainingSeconds - 1),
        progressPct: Math.min(100, s.progressPct + (100 / (s.durationMinutes * 60))),
      })));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const grouped = React.useMemo(() => {
    const map: Record<number, { examTitle: string; sessions: Session[] }> = {};
    for (const s of sessions) {
      if (!map[s.examId]) map[s.examId] = { examTitle: s.examTitle, sessions: [] };
      map[s.examId].sessions.push(s);
    }
    return Object.entries(map);
  }, [sessions]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Live Exam Monitor
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time view of all active exam sessions — refreshes every 10 seconds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
          <Button size="sm" variant="outline" onClick={fetchSessions}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sessions.length}</p>
              <p className="text-xs text-muted-foreground">Active Sessions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sessions.filter(s => s.remainingSeconds < 300).length}</p>
              <p className="text-xs text-muted-foreground">Less than 5 min left</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{grouped.length}</p>
              <p className="text-xs text-muted-foreground">Exams in Progress</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-48 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-lg font-medium text-muted-foreground">No active sessions</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Sessions will appear here when candidates or staff start an exam.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([examId, group]) => (
            <Card key={examId}>
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold">{group.examTitle}</h2>
                <Badge variant="secondary">{group.sessions.length} active</Badge>
              </div>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 divide-y divide-border">
                  {group.sessions.map(s => {
                    const urgentTime = s.remainingSeconds < 300;
                    const criticalTime = s.remainingSeconds < 60;
                    return (
                      <div key={s.sessionId} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{s.participantName}</p>
                            <Badge variant={s.isCandidate ? "default" : "secondary"} className="text-xs shrink-0">
                              {s.isCandidate ? "Candidate" : "Staff"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{s.participantUsername}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Started {new Date(s.startedAt).toLocaleTimeString()} ·
                            Last active {new Date(s.lastActiveAt).toLocaleTimeString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-6 shrink-0 flex-wrap">
                          <div className="text-center">
                            <p className={`text-lg font-bold font-mono ${criticalTime ? 'text-red-600 animate-pulse' : urgentTime ? 'text-amber-600' : 'text-foreground'}`}>
                              {formatTime(s.remainingSeconds)}
                            </p>
                            <p className="text-xs text-muted-foreground">remaining</p>
                          </div>

                          <div className="w-32">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Time used</span>
                              <span>{s.progressPct}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${criticalTime ? 'bg-red-500' : urgentTime ? 'bg-amber-500' : 'bg-primary'}`}
                                style={{ width: `${s.progressPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
