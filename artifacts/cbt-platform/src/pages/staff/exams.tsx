import * as React from "react";
import { useListExams } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Clock, FileQuestion, GraduationCap } from "lucide-react";

export default function StaffExams() {
  const { data: exams, isLoading } = useListExams();
  
  // Only show active exams
  const availableExams = exams?.filter(e => e.isActive) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Available Exams</h1>
        <p className="text-muted-foreground mt-2">Select an exam to begin. Ensure you have stable internet connection.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({length: 3}).map((_, i) => <div key={i} className="animate-pulse h-48 bg-muted rounded-2xl" />)
        ) : availableExams.length === 0 ? (
          <div className="col-span-full text-center py-16 text-muted-foreground bg-surface border border-border rounded-2xl border-dashed">
            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-lg font-medium">No exams assigned to you currently.</p>
          </div>
        ) : (
          availableExams.map((exam) => (
            <Card key={exam.id} className="flex flex-col hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/50 group">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <GraduationCap className="h-6 w-6" />
                </div>
                
                <h3 className="font-display font-bold text-xl leading-tight mb-2">{exam.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
                  {exam.description || "No description provided."}
                </p>
                
                <div className="flex items-center gap-4 mb-6 text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary" />
                    {exam.durationMinutes} min
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileQuestion className="h-4 w-4 text-accent" />
                    {exam.questionCount} Qs
                  </div>
                </div>

                <Link href={`/exams/${exam.id}`}>
                  <Button className="w-full text-base h-11">Take Exam</Button>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
