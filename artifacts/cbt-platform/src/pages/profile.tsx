import * as React from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { User, Lock, Shield, Save, Eye, EyeOff } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [showOld, setShowOld] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [nameForm, setNameForm] = React.useState({ name: (user as any)?.name || "" });
  const [pwForm, setPwForm] = React.useState({ oldPassword: "", newPassword: "", confirmPassword: "" });

  const handleSaveName = async () => {
    setSaving(true);
    try {
      await apiClient(`/api/users/${(user as any)?.id}`, { method: "PATCH", body: JSON.stringify({ name: nameForm.name }) });
      toast({ title: "Profile updated!" });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleChangePassword = async (): Promise<void> => {
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast({ title: "Passwords do not match", variant: "destructive" }); return; }
    if (pwForm.newPassword.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await apiClient(`/api/users/${(user as any)?.id}/password`, { method: "POST", body: JSON.stringify({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword }) });
      toast({ title: "Password changed successfully!" });
      setPwForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const roleColors: Record<string, string> = {
    SuperAdmin: "bg-purple-100 text-purple-700",
    CompanyAdmin: "bg-blue-100 text-blue-700",
    Staff: "bg-green-100 text-green-700",
    Candidate: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account information and security settings</p>
      </div>

      {/* User info */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-blue-500" /> Account Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
              {((user as any)?.name || "U")[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{(user as any)?.name}</p>
              <p className="text-sm text-gray-500">{(user as any)?.email}</p>
              <span className={`mt-1 inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[(user as any)?.role] ?? "bg-gray-100 text-gray-600"}`}>
                {(user as any)?.role}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <Input value={nameForm.name} onChange={e => setNameForm({ name: e.target.value })} placeholder="Your full name" />
          </div>
          <Button onClick={handleSaveName} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> Save Name
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-red-500" /> Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <div className="relative">
              <Input type={showOld ? "text" : "password"} value={pwForm.oldPassword} onChange={e => setPwForm(f => ({ ...f, oldPassword: e.target.value }))} placeholder="Current password" />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowOld(s => !s)}>
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <Input type={showNew ? "text" : "password"} value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="New password (min 6 chars)" />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowNew(s => !s)}>
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <Input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repeat new password" />
          </div>
          <Button variant="destructive" onClick={handleChangePassword} disabled={saving || !pwForm.oldPassword || !pwForm.newPassword} className="gap-2">
            <Lock className="w-4 h-4" /> Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Security info */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-green-500" /> Security</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Account Role", value: (user as any)?.role },
            { label: "Email", value: (user as any)?.email ?? "—" },
            { label: "Account ID", value: `#${(user as any)?.id}` },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-500">{item.label}</span>
              <span className="text-sm font-medium text-gray-900">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
