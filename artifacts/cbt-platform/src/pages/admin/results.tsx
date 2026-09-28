import * as React from "react";
import { useListResults } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { formatTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ChevronDown, ChevronUp, CheckSquare, Square, Minus } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminResults() {
  const { data: rawResults, isLoading } = useListResults();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [publishing, setPublishing] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState<Record<number, boolean>>({});
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  const allResults = (rawResults as any[]) ?? [];

  const grouped = React.useMemo(() => {
    const map: Record<string, { examId: number; examTitle: string; results: any[] }> = {};
    for (const r of allResults) {
      const key = String(r.examId);
      if (!map[key]) map[key] = { examId: r.examId, examTitle: r.exam?.title ?? `Exam #${r.examId}`, results: [] };
      map[key].results.push(r);
    }
    return Object.values(map);
  }, [allResults]);

  const publishedCount = allResults.filter(r => r.isPublished).length;
  const selectedArr = Array.from(selected);
  const allIds = allResults.map((r: any) => r.id);

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (ids: number[]) => {
    const allInGroup = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => allInGroup ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allIds));
  const clearAll = () => setSelected(new Set());

  const publish = async (opts: { resultIds?: number[]; examId?: number; unpublish?: boolean }) => {
    setPublishing(true);
    try {
      const endpoint = opts.unpublish ? "/api/results/unpublish" : "/api/results/publish";
      const body: any = {};
      if (opts.resultIds) body.resultIds = opts.resultIds;
      if (opts.examId) body.examId = opts.examId;
      await apiClient(endpoint, { method: "POST", body: JSON.stringify(body) });
      toast({ title: opts.unpublish ? "Results hidden from candidates" : "Results released to candidates!" });
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
    } catch (e: any) {
      toast({ title: e?.message ?? "Action failed. Please try again.", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const selectedUnpublished = selectedArr.filter(id => {
    const r = allResults.find(r => r.id === id);
    return r && !r.isPublished;
  });
  const selectedPublished = selectedArr.filter(id => {
    const r = allResults.find(r => r.id === id);
    return r && r.isPublished;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded-2xl animate-pulse" />
        <div className="h-48 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Exam Results</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            <span className="text-primary font-semibold">{publishedCount}</span> of {allResults.length} results released to candidates
          </p>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            {selectedUnpublished.length > 0 && (
              <Button size="sm" disabled={publishing}
                onClick={() => publish({ resultIds: selectedUnpublished })}>
                <Eye className="w-4 h-4 mr-1" /> Release {selectedUnpublished.length}
              </Button>
            )}
            {selectedPublished.length > 0 && (
              <Button size="sm" variant="outline" className="text-amber-600 border-amber-300" disabled={publishing}
                onClick={() => publish({ resultIds: selectedPublished, unpublish: true })}>
                <EyeOff className="w-4 h-4 mr-1" /> Hide {selectedPublished.length}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={clearAll}>Clear</Button>
          </div>
        )}

        {selected.size === 0 && allResults.length > 0 && (
          <Button size="sm" variant="outline" onClick={selectAll}>
            <CheckSquare className="w-4 h-4 mr-1" /> Select All
          </Button>
        )}
      </div>

      {/* Grouped by exam */}
      {allResults.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No exam results yet. Candidates will appear here after submitting exams.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => {
            const groupIds = group.results.map(r => r.id);
            const allGroupSelected = groupIds.every(id => selected.has(id));
            const someGroupSelected = groupIds.some(id => selected.has(id));
            const groupPublished = group.results.filter(r => r.isPublished).length;
            const allPublished = groupPublished === group.results.length;
            const isCollapsed = collapsed[group.examId];

            return (
              <Card key={group.examId} className="overflow-hidden">
                {/* Group header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
                  {/* Group checkbox */}
                  <button onClick={() => toggleGroup(groupIds)} className="text-muted-foreground hover:text-foreground">
                    {allGroupSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : someGroupSelected ? <Minus className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                  </button>

                  <button className="flex-1 flex items-center gap-2 text-left" onClick={() => setCollapsed(c => ({ ...c, [group.examId]: !c[group.examId] }))}>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{group.examTitle}</p>
                      <p className="text-xs text-muted-foreground">{group.results.length} submission{group.results.length !== 1 ? "s" : ""} · {groupPublished} released</p>
                    </div>
                    {isCollapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {/* Group actions */}
                  <div className="flex gap-2 shrink-0">
                    {allPublished ? (
                      <Button size="sm" variant="outline" className="text-amber-600 border-amber-300 h-7 text-xs"
                        disabled={publishing} onClick={() => publish({ examId: group.examId, unpublish: true })}>
                        <EyeOff className="w-3 h-3 mr-1" /> Hide All
                      </Button>
                    ) : (
                      <Button size="sm" className="h-7 text-xs"
                        disabled={publishing} onClick={() => publish({ examId: group.examId })}>
                        <Eye className="w-3 h-3 mr-1" /> Release All
                      </Button>
                    )}
                  </div>
                </div>

                {/* Rows */}
                {!isCollapsed && (
                  <div className="divide-y divide-border">
                    {group.results.map((res: any) => {
                      const name = res.candidate?.fullName ?? res.user?.name ?? "Unknown";
                      const username = res.candidate?.username ?? res.user?.email ?? "";
                      const type = res.candidateId ? "Candidate" : "Staff";
                      const isChecked = selected.has(res.id);

                      return (
                        <div key={res.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${isChecked ? "bg-primary/5" : "hover:bg-muted/20"}`}>
                          {/* Row checkbox */}
                          <button onClick={() => toggleSelect(res.id)} className="shrink-0">
                            {isChecked ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                          </button>

                          <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
                            <div className="col-span-2 sm:col-span-1">
                              <p className="font-medium text-sm truncate">{name}</p>
                              <p className="text-xs text-muted-foreground truncate">{username}</p>
                            </div>
                            <div>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${res.score >= 50 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                                {Math.round(res.score ?? 0)}%
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground hidden sm:block">
                              {res.correctAnswers}/{res.totalQuestions} correct
                            </div>
                            <div className="text-xs text-muted-foreground hidden sm:block">
                              {formatTime(res.timeTakenSeconds)} · {format(new Date(res.createdAt), "MMM d")}
                            </div>
                            <div>
                              {res.isPublished ? (
                                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                  <Eye className="w-3 h-3" /> Released
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <EyeOff className="w-3 h-3" /> Pending
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Per-row action */}
                          <div className="shrink-0">
                            {res.isPublished ? (
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-600" disabled={publishing}
                                onClick={() => publish({ resultIds: [res.id], unpublish: true })}>Hide</Button>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={publishing}
                                onClick={() => publish({ resultIds: [res.id] })}>Release</Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
