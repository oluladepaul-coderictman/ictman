import * as React from "react";
import { useListMyResults } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { formatTime } from "@/lib/utils";
import { Award, Clock, Target } from "lucide-react";

export default function StaffResults() {
  const { data: results, isLoading } = useListMyResults();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">My Results</h1>
        <p className="text-muted-foreground mt-2">View your past exam performances and scores.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="animate-pulse h-48 bg-muted rounded-2xl" />
          <div className="animate-pulse h-48 bg-muted rounded-2xl" />
        </div>
      ) : results?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-surface border border-border rounded-2xl border-dashed">
          You haven't taken any exams yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {results?.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(res => (
            <Card key={res.id} className="overflow-hidden border-border/50">
              <div className={`h-2 w-full ${res.score >= 70 ? 'bg-success' : 'bg-destructive'}`} />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-display font-bold text-lg mb-1">{res.exam.title}</h3>
                    <p className="text-xs text-muted-foreground">{format(new Date(res.createdAt), 'MMMM d, yyyy')}</p>
                  </div>
                  <div className={`text-3xl font-display font-bold ${res.score >= 70 ? 'text-success' : 'text-destructive'}`}>
                    {res.score}%
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-muted/50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Accuracy</p>
                      <p className="text-sm font-semibold">{res.correctAnswers} / {res.totalQuestions}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Time Taken</p>
                      <p className="text-sm font-semibold">{formatTime(res.timeTakenSeconds)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
