import * as React from "react";
import { useListExams, useDeleteExam, getListExamsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, GraduationCap, Clock, FileQuestion, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";

export default function Exams() {
  const queryClient = useQueryClient();
  const { data: exams, isLoading } = useListExams();
  const deleteMutation = useDeleteExam();

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this exam?")) {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListExamsQueryKey() });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold">Exams</h1>
          <p className="text-muted-foreground mt-1">Manage tests and assessments</p>
        </div>
        <Link href="/admin/exams/new">
          <Button className="w-auto">
            <Plus className="mr-2 h-4 w-4" /> Create Exam
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({length: 3}).map((_, i) => <div key={i} className="animate-pulse h-48 bg-muted rounded-2xl" />)
        ) : exams?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-surface border border-border rounded-2xl border-dashed">
            No exams found. Create one to get started.
          </div>
        ) : (
          exams?.map((exam) => (
            <Card key={exam.id} className="flex flex-col hover:shadow-md transition-shadow group">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/admin/exams/${exam.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(exam.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <h3 className="font-display font-bold text-lg leading-tight mb-2 line-clamp-2">{exam.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                  {exam.description || "No description provided."}
                </p>
                
                <div className="flex flex-wrap gap-3 mt-auto pt-4 border-t border-border/50 text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-md">
                    <Clock className="h-3.5 w-3.5" />
                    {exam.durationMinutes} min
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-md">
                    <FileQuestion className="h-3.5 w-3.5" />
                    {exam.questionCount} Qs
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ml-auto ${exam.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {exam.isActive ? 'Active' : 'Draft'}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
