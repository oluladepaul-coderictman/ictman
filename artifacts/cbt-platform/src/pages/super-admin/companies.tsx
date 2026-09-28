import * as React from "react";
import { useListCompanies, useCreateCompany, useDeleteCompany, getListCompaniesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Building2, Plus, Trash2, Eye, GraduationCap, Briefcase, Users } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";

const COMPANY_TYPES = [
  {
    value: "Educational",
    label: "Educational Institution",
    description: "Universities, polytechnics, schools — with departments, courses & semester exams",
    icon: GraduationCap,
    color: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    value: "Corporate",
    label: "Corporate / Interview CBT",
    description: "Companies running recruitment, HR assessments, or employee certification tests",
    icon: Briefcase,
    color: "bg-purple-50 border-purple-200 text-purple-700",
  },
  {
    value: "Utilities",
    label: "Utilities / Government",
    description: "Government agencies, NGOs, and utility organisations running compliance exams",
    icon: Users,
    color: "bg-green-50 border-green-200 text-green-700",
  },
];

export default function Companies() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { startImpersonating } = useAuth();
  const { data: companies, isLoading } = useListCompanies();
  const createMutation = useCreateCompany();
  const deleteMutation = useDeleteCompany();

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "", adminEmail: "", adminPassword: "", adminName: "", type: "Educational"
  });
  const [step, setStep] = React.useState<1 | 2>(1);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({ data: formData as any });
    setIsCreateModalOpen(false);
    queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
    setFormData({ name: "", adminEmail: "", adminPassword: "", adminName: "", type: "Educational" });
    setStep(1);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this company? All data will be lost.")) {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
    }
  };

  const handleViewAs = (company: { id: number; name: string }) => {
    startImpersonating(company.id, company.name);
  };

  const getTypeIcon = (type: string | null | undefined) => {
    const t = COMPANY_TYPES.find(t => t.value === type);
    if (!t) return <Building2 className="w-4 h-4" />;
    const Icon = t.icon;
    return <Icon className="w-4 h-4" />;
  };

  const getTypeBadge = (type: string | null | undefined) => {
    const t = COMPANY_TYPES.find(x => x.value === type);
    return t?.label ?? "Educational";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold">Companies</h1>
          <p className="text-muted-foreground mt-1">Manage all tenant organisations on the platform</p>
        </div>
        <Button onClick={() => { setIsCreateModalOpen(true); setStep(1); }}>
          <Plus className="mr-2 h-4 w-4" /> New Company
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Company Name</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Type</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Slug</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Created</th>
                  <th className="px-6 py-4 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
                ) : companies?.length === 0 ? (
                  <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">
                    <Building2 className="mx-auto w-10 h-10 mb-3 text-muted-foreground/30" />
                    <p>No companies yet. Add your first organisation.</p>
                  </td></tr>
                ) : (
                  companies?.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                            {getTypeIcon(c.type)}
                          </div>
                          {c.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-muted border border-border font-medium">
                          {getTypeBadge(c.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{c.slug ?? "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{format(new Date(c.createdAt), 'MMM d, yyyy')}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { handleViewAs(c); setLocation(`/super-admin/company-view/${c.id}`); }} className="text-primary hover:bg-primary/10 gap-1.5">
                            <Eye className="h-3.5 w-3.5" /> View as Admin
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

      {/* Create Company Modal — 2 steps */}
      <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setStep(1); }} title={step === 1 ? "Select Organisation Type" : "Company Details"}>
        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">Choose the type of organisation. This determines available features and defaults.</p>
            {COMPANY_TYPES.map(type => {
              const Icon = type.icon;
              const isSelected = formData.type === type.value;
              return (
                <button
                  key={type.value}
                  onClick={() => setFormData(f => ({ ...f, type: type.value }))}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/40 hover:bg-muted/30'}`}
                >
                  <div className={`mt-0.5 w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${type.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{type.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                  </div>
                  {isSelected && <div className="ml-auto shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>}
                </button>
              );
            })}
            <div className="pt-4 flex justify-end">
              <Button onClick={() => setStep(2)}>Continue</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl text-sm mb-2">
              {(() => { const t = COMPANY_TYPES.find(x => x.value === formData.type); const Icon = t?.icon ?? Building2; return <><Icon className="w-4 h-4 text-primary" /><span className="font-medium">{t?.label}</span></>; })()}
              <button type="button" onClick={() => setStep(1)} className="ml-auto text-xs text-primary hover:underline">Change</button>
            </div>
            <Input label="Company / Organisation Name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Federal University of Technology" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Admin Name" required value={formData.adminName} onChange={(e) => setFormData({ ...formData, adminName: e.target.value })} placeholder="Admin Full Name" />
              <Input label="Admin Email" type="email" required value={formData.adminEmail} onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })} placeholder="admin@org.edu" />
            </div>
            <Input label="Admin Password" type="password" required value={formData.adminPassword} onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })} placeholder="Secure password" />
            {createMutation.isError && <p className="text-sm text-destructive">Failed to create. Email may already be in use.</p>}
            <div className="pt-4 flex justify-end gap-3">
              <Button variant="ghost" type="button" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" isLoading={createMutation.isPending}>Create Company</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
