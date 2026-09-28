import * as React from "react";
import { useListDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DepartmentsPage() {
  const { data: departments = [], isLoading, refetch } = useListDepartments();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();
  const { toast } = useToast();

  const [showForm, setShowForm] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState({ name: "", slug: "" });

  function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
  }

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, name, slug: editId ? f.slug : slugify(name) }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!form.name) { toast({ title: "Department name is required", variant: "destructive" }); return; }
    try {
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, data: { name: form.name, slug: form.slug } });
      } else {
        await createMutation.mutateAsync({ data: { name: form.name, slug: form.slug } });
      }
      setForm({ name: "", slug: "" });
      setShowForm(false);
      setEditId(null);
      refetch();
      toast({ title: editId ? "Department updated" : "Department created" });
    } catch (e: any) {
      toast({ title: e?.message ?? "Failed to save department", variant: "destructive" });
    }
  };

  const handleEdit = (dept: any) => {
    setEditId(dept.id);
    setForm({ name: dept.name, slug: dept.slug });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this department? All related courses will also be deleted.")) return;
    await deleteMutation.mutateAsync({ id });
    refetch();
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading departments...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500 mt-1">Manage academic or operational departments</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: "", slug: "" }); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Department
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-blue-100">
          <CardHeader>
            <CardTitle className="text-lg">{editId ? "Edit Department" : "New Department"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
              <Input value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Computer Science" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="e.g. computer-science" />
              <p className="text-xs text-gray-400 mt-1">Used in exam links. Auto-generated from name.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Department"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {departments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">No departments yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first department to organize courses and candidates</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {departments.map((dept: any) => (
            <Card key={dept.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{dept.name}</p>
                    <p className="text-sm text-gray-500">Slug: <code className="bg-gray-100 px-1 rounded">{dept.slug}</code></p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(dept)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(dept.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
