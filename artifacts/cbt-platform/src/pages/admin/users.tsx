import * as React from "react";
import { useListUsers, useCreateUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Plus, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Users() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useListUsers();
  const createMutation = useCreateUser();
  const { toast } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "", email: "", password: "", role: "Staff" as const
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast({ title: "Name, email and password are required", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({ data: formData });
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setFormData({ name: "", email: "", password: "", role: "Staff" });
      toast({ title: "User created successfully" });
    } catch (e: any) {
      toast({ title: e?.message ?? "Failed to create user", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage staff and examinees</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Name</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Email</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Role</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
                ) : users?.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No users found</td></tr>
                ) : (
                  users?.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-medium flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        {u.name}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 rounded bg-muted text-xs font-medium">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${u.isActive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(u.createdAt), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add User">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Name" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          <Input label="Email" type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          <Input label="Password" type="password" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Role</label>
            <select 
              className="flex h-11 w-full rounded-xl border border-input bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value as any})}
            >
              <option value="Staff">Staff</option>
              <option value="CompanyAdmin">Company Admin</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Create User</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
