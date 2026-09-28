import * as React from "react";
import { useParams, Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useListCandidates, useCreateCandidate, useDeleteCandidate, useAssignExamsToCandidate, useListExams, useListUsers, getListCandidatesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Building2, ArrowLeft, Users, GraduationCap, Printer, Plus, Trash2, ClipboardList, X } from "lucide-react";
import { format } from "date-fns";

export default function CompanyView() {
  const params = useParams<{ id: string }>();
  const companyId = parseInt(params.id);
  const { impersonatedCompany, startImpersonating, stopImpersonating } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (companyId && (!impersonatedCompany || impersonatedCompany.id !== companyId)) {
      startImpersonating(companyId, "Loading...");
    }
  }, [companyId]);

  const { data: candidates, isLoading: loadingCandidates } = useListCandidates();
  const { data: exams } = useListExams();
  const { data: users } = useListUsers();
  const createMutation = useCreateCandidate();
  const deleteMutation = useDeleteCandidate();
  const assignMutation = useAssignExamsToCandidate();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isAssignOpen, setIsAssignOpen] = React.useState(false);
  const [selectedCandidate, setSelectedCandidate] = React.useState<any>(null);
  const [selectedExamIds, setSelectedExamIds] = React.useState<number[]>([]);
  const [form, setForm] = React.useState({ fullName: "", username: "", password: "" });
  const [activeTab, setActiveTab] = React.useState<"candidates" | "exams" | "users">("candidates");

  const handleStopImpersonating = () => {
    stopImpersonating();
    setLocation("/super-admin/companies");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({ data: form });
    setIsCreateOpen(false);
    setForm({ fullName: "", username: "", password: "" });
    queryClient.invalidateQueries({ queryKey: getListCandidatesQueryKey() });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete candidate?")) return;
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
  };

  const toggleExam = (id: number) => {
    setSelectedExamIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePrint = () => window.print();

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
        {/* Impersonation Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Company View Mode: {impersonatedCompany?.name ?? "Loading..."}
              </p>
              <p className="text-xs text-amber-600">You are viewing data scoped to this company as Super Admin</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleStopImpersonating} className="text-amber-700 hover:bg-amber-100 gap-1.5">
            <X className="h-4 w-4" /> Exit View
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Candidates</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{candidates?.length ?? 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Exams</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{exams?.length ?? 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Users</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{users?.length ?? 0}</div></CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {(["candidates", "exams", "users"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
                activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Candidates Tab */}
        {activeTab === "candidates" && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handlePrint} className="border border-border">
                <Printer className="mr-2 h-4 w-4" /> Print Credentials
              </Button>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Candidate
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-3 font-medium text-muted-foreground">Full Name</th>
                      <th className="px-6 py-3 font-medium text-muted-foreground">Username</th>
                      <th className="px-6 py-3 font-medium text-muted-foreground">Password</th>
                      <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loadingCandidates ? (
                      <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
                    ) : (candidates?.length ?? 0) === 0 ? (
                      <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No candidates in this company</td></tr>
                    ) : (
                      candidates?.map(c => (
                        <tr key={c.id} className="hover:bg-muted/20">
                          <td className="px-6 py-3 font-medium">{c.fullName}</td>
                          <td className="px-6 py-3 font-mono text-sm">{c.username}</td>
                          <td className="px-6 py-3 font-mono text-sm">{c.password}</td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openAssign(c)} title="Assign Exams">
                                <ClipboardList className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Exams Tab */}
        {activeTab === "exams" && (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Title</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Duration</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Questions</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(exams?.length ?? 0) === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No exams in this company</td></tr>
                  ) : (
                    exams?.map(e => (
                      <tr key={e.id} className="hover:bg-muted/20">
                        <td className="px-6 py-3 font-medium">{e.title}</td>
                        <td className="px-6 py-3 text-muted-foreground">{e.durationMinutes} min</td>
                        <td className="px-6 py-3 text-muted-foreground">{e.questionCount}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${e.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {e.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(users?.length ?? 0) === 0 ? (
                    <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No users in this company</td></tr>
                  ) : (
                    users?.map(u => (
                      <tr key={u.id} className="hover:bg-muted/20">
                        <td className="px-6 py-3 font-medium">{u.name}</td>
                        <td className="px-6 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-6 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded bg-muted text-xs font-medium">{u.role}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Print Broadsheet - hidden on screen, shown when printing */}
      <div id="print-section" className="p-8 hidden print:block">
        <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
          <h1 className="text-3xl font-bold uppercase tracking-widest">Candidate Credentials</h1>
          <h2 className="text-xl font-semibold mt-1">{impersonatedCompany?.name}</h2>
          <p className="text-sm text-gray-500 mt-1">Printed on {format(new Date(), 'MMMM d, yyyy')}</p>
          <p className="text-xs text-gray-400 mt-1">CONFIDENTIAL — Keep this document secure</p>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left font-bold">S/N</th>
              <th className="border border-gray-300 px-4 py-2 text-left font-bold">Full Name</th>
              <th className="border border-gray-300 px-4 py-2 text-left font-bold">Username</th>
              <th className="border border-gray-300 px-4 py-2 text-left font-bold">Password</th>
            </tr>
          </thead>
          <tbody>
            {candidates?.map((c, i) => (
              <tr key={c.id}>
                <td className="border border-gray-300 px-4 py-2">{i + 1}</td>
                <td className="border border-gray-300 px-4 py-2 font-medium">{c.fullName}</td>
                <td className="border border-gray-300 px-4 py-2 font-mono">{c.username}</td>
                <td className="border border-gray-300 px-4 py-2 font-mono">{c.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-6 text-xs text-gray-400 text-center">
          Total: {candidates?.length ?? 0} candidates &nbsp;|&nbsp; Login: {window.location.origin}/login/candidate
        </div>
      </div>

      {/* Add Candidate Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Candidate">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Full Name" required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
          <Input label="Username" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase() })} />
          <Input label="Password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          {createMutation.isError && <p className="text-sm text-destructive">Username may already be taken.</p>}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Exams Modal */}
      <Modal isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} title={`Assign Exams — ${selectedCandidate?.fullName}`}>
        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {exams?.filter(e => e.isActive).map(exam => (
            <label key={exam.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer">
              <input type="checkbox" checked={selectedExamIds.includes(exam.id)} onChange={() => toggleExam(exam.id)} className="w-4 h-4" />
              <div>
                <p className="font-medium text-sm">{exam.title}</p>
                <p className="text-xs text-muted-foreground">{exam.durationMinutes} min · {exam.questionCount} questions</p>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-4">Replaces all previous exam assignments.</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
          <Button onClick={handleAssign} isLoading={assignMutation.isPending}>Assign {selectedExamIds.length} Exam(s)</Button>
        </div>
      </Modal>
    </>
  );
}
