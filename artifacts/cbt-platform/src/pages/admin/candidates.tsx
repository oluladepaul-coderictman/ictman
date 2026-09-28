import * as React from "react";
import {
  useListCandidates,
  useCreateCandidate,
  useDeleteCandidate,
  useAssignExamsToCandidate,
  useListExams,
  useListDepartments,
  getListCandidatesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Plus, Printer, Users, Trash2, ClipboardList } from "lucide-react";
import { format } from "date-fns";

export default function CandidatesPage() {
  const queryClient = useQueryClient();
  const { data: candidates, isLoading } = useListCandidates();
  const { data: exams } = useListExams();
  const { data: departments = [] } = useListDepartments();
  const createMutation = useCreateCandidate();
  const deleteMutation = useDeleteCandidate();
  const assignMutation = useAssignExamsToCandidate();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isAssignOpen, setIsAssignOpen] = React.useState(false);
  const [selectedCandidate, setSelectedCandidate] = React.useState<any>(null);
  const [selectedExamIds, setSelectedExamIds] = React.useState<number[]>([]);
  const [filterDeptId, setFilterDeptId] = React.useState<number | "all">("all");

  const [form, setForm] = React.useState({ fullName: "", username: "", password: "", departmentId: "" });

  const filteredCandidates = React.useMemo(() => {
    if (!candidates) return [];
    if (filterDeptId === "all") return candidates;
    return candidates.filter((c: any) => c.departmentId === filterDeptId);
  }, [candidates, filterDeptId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      data: {
        fullName: form.fullName,
        username: form.username,
        password: form.password,
        departmentId: form.departmentId ? parseInt(form.departmentId) : undefined,
      } as any
    });
    setIsCreateOpen(false);
    setForm({ fullName: "", username: "", password: "", departmentId: "" });
    queryClient.invalidateQueries({ queryKey: getListCandidatesQueryKey() });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this candidate? This cannot be undone.")) return;
    await deleteMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListCandidatesQueryKey() });
  };

  const openAssign = (candidate: any) => {
    setSelectedCandidate(candidate);
    setSelectedExamIds([]);
    setIsAssignOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedCandidate) return;
    await assignMutation.mutateAsync({ id: selectedCandidate.id, data: { examIds: selectedExamIds } });
    setIsAssignOpen(false);
    queryClient.invalidateQueries({ queryKey: getListCandidatesQueryKey() });
  };

  const toggleExam = (id: number) => {
    setSelectedExamIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePrint = () => window.print();

  const getDeptName = (deptId: number | null) =>
    deptId ? (departments as any[]).find((d: any) => d.id === deptId)?.name || "—" : "—";

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-section, #print-section * { visibility: visible !important; }
          #print-section { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-6 no-print">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-display font-bold">Candidates</h1>
            <p className="text-muted-foreground mt-1">Manage candidates and their assigned exams</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handlePrint} className="border border-border">
              <Printer className="mr-2 h-4 w-4" /> Print Credentials
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Candidate
            </Button>
          </div>
        </div>

        {(departments as any[]).length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-sm text-gray-500">Filter by:</span>
            <Button size="sm" variant={filterDeptId === "all" ? "default" : "outline"} onClick={() => setFilterDeptId("all")}>All</Button>
            {(departments as any[]).map((d: any) => (
              <Button key={d.id} size="sm" variant={filterDeptId === d.id ? "default" : "outline"} onClick={() => setFilterDeptId(d.id)}>{d.name}</Button>
            ))}
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium text-muted-foreground">Full Name</th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">Username</th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">Password</th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">Department</th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">Status</th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">Created</th>
                    <th className="px-6 py-4 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
                  ) : filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-muted-foreground">
                        <Users className="mx-auto h-10 w-10 mb-3 text-muted-foreground/40" />
                        <p>No candidates found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((c: any) => (
                      <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-medium">{c.fullName}</td>
                        <td className="px-6 py-4 font-mono text-sm text-muted-foreground">{c.username}</td>
                        <td className="px-6 py-4 font-mono text-sm">{c.password}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{getDeptName(c.departmentId)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {c.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">
                          {format(new Date(c.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" title="Assign Exams" onClick={() => openAssign(c)}>
                              <ClipboardList className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Section (Credentials Broadsheet) */}
      <div id="print-section" className="p-8 hidden print:block">
        <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
          <h1 className="text-3xl font-bold uppercase tracking-widest">Candidate Credentials</h1>
          <p className="text-sm text-gray-500 mt-1">Printed on {format(new Date(), 'MMMM d, yyyy')}</p>
          <p className="text-xs text-gray-400 mt-1">CONFIDENTIAL — Keep this document secure</p>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left font-bold">S/N</th>
              <th className="border border-gray-300 px-4 py-2 text-left font-bold">Full Name</th>
              <th className="border border-gray-300 px-4 py-2 text-left font-bold">Department</th>
              <th className="border border-gray-300 px-4 py-2 text-left font-bold">Username</th>
              <th className="border border-gray-300 px-4 py-2 text-left font-bold">Password</th>
            </tr>
          </thead>
          <tbody>
            {(filterDeptId === "all" ? candidates : filteredCandidates)?.map((c: any, i: number) => (
              <tr key={c.id} style={{ pageBreakInside: 'avoid' }}>
                <td className="border border-gray-300 px-4 py-2">{i + 1}</td>
                <td className="border border-gray-300 px-4 py-2 font-medium">{c.fullName}</td>
                <td className="border border-gray-300 px-4 py-2">{getDeptName(c.departmentId)}</td>
                <td className="border border-gray-300 px-4 py-2 font-mono">{c.username}</td>
                <td className="border border-gray-300 px-4 py-2 font-mono">{c.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-8 text-xs text-gray-400 text-center">
          Total candidates: {(filterDeptId === "all" ? candidates : filteredCandidates)?.length ?? 0} &nbsp;|&nbsp; Login at: {typeof window !== "undefined" ? window.location.origin : ""}/login/candidate
        </div>
      </div>

      {/* Add Candidate Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Candidate">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Full Name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="John Doe" />
          <Input label="Username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} placeholder="john.doe" />
          <Input label="Password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Set a memorable password" />
          {(departments as any[]).length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Department (optional)</label>
              <select className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">No department assigned</option>
                {(departments as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          {createMutation.isError && <p className="text-sm text-destructive">Username may already be taken. Try another.</p>}
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Create Candidate</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Exams Modal */}
      <Modal isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} title={`Assign Exams — ${selectedCandidate?.fullName}`}>
        <div className="space-y-3 max-h-72 overflow-y-auto mb-4">
          {(exams?.filter((e: any) => e.isActive) ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No active exams available.</p>
          ) : (
            exams?.filter((e: any) => e.isActive).map((exam: any) => (
              <label key={exam.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer">
                <input type="checkbox" checked={selectedExamIds.includes(exam.id)} onChange={() => toggleExam(exam.id)} className="w-4 h-4 rounded text-primary" />
                <div>
                  <p className="font-medium text-sm">{exam.title}</p>
                  <p className="text-xs text-muted-foreground">{exam.durationMinutes} min · {exam.questionCount} questions</p>
                </div>
              </label>
            ))
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">This replaces all previously assigned exams for this candidate.</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
          <Button onClick={handleAssign} isLoading={assignMutation.isPending}>Assign {selectedExamIds.length} Exam(s)</Button>
        </div>
      </Modal>
    </>
  );
}
