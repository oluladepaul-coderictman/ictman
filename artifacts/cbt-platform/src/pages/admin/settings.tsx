import * as React from "react";
import { useAuth } from "@/lib/auth-context";
import { useGetCompany } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import {
  Settings, Palette, GraduationCap, Globe, Phone, MapPin, Save, CheckCircle2, Building2, Brain, Sparkles,
} from "lucide-react";

const DEFAULT_GRADE_SCALE = { A: 70, B: 60, C: 50, D: 40, F: 0 };

const PERSONALITY_PLACEHOLDER = `Examples:
• "You are Paulina, the AI assistant for Lagos State University. You specialize in STEM subjects, engineering, and professional certifications. Always address staff formally."
• "You are Paulina for Zenith Bank HR. You help with banking regulations, compliance exams, and financial certifications. You know our grading policy: pass mark is 70%."
• "You are Paulina for ABC Hospital training centre. Focus on medical, nursing, and healthcare subjects. Always recommend citing clinical guidelines."`;

export default function CompanySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const companyId = (user as any)?.companyId;
  const { data: company, refetch } = useGetCompany(companyId, { query: { enabled: !!companyId } as any });

  const [saving, setSaving] = React.useState(false);
  const [savingPersonality, setSavingPersonality] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "", type: "Educational", logoUrl: "", primaryColor: "#3b82f6",
    passMark: "50", website: "", address: "", phone: "", timezone: "Africa/Lagos",
  });
  const [gradeScale, setGradeScale] = React.useState<Record<string, string>>({ A: "70", B: "60", C: "50", D: "40", F: "0" });
  const [personality, setPersonality] = React.useState("");

  React.useEffect(() => {
    if (company) {
      const c = company as any;
      setForm({
        name: c.name || "",
        type: c.type || "Educational",
        logoUrl: c.logoUrl || "",
        primaryColor: c.primaryColor || "#3b82f6",
        passMark: String(c.passMark ?? 50),
        website: c.website || "",
        address: c.address || "",
        phone: c.phone || "",
        timezone: c.timezone || "Africa/Lagos",
      });
      if (c.gradeScale) {
        setGradeScale(Object.fromEntries(Object.entries(c.gradeScale as Record<string, number>).map(([k, v]) => [k, String(v)])));
      }
      setPersonality(c.paulinaPersonality || "");
    }
  }, [company]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedGradeScale = Object.fromEntries(Object.entries(gradeScale).map(([k, v]) => [k, parseInt(v) || 0]));
      await apiClient(`/api/companies/${companyId}`, {
        method: "PATCH",
        body: JSON.stringify({ ...form, passMark: parseInt(form.passMark) || 50, gradeScale: parsedGradeScale }),
      });
      toast({ title: "Settings saved!" });
      refetch();
    } catch (e: any) {
      toast({ title: e.message || "Failed to save settings", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleSavePersonality = async () => {
    setSavingPersonality(true);
    try {
      await apiClient(`/api/companies/${companyId}`, {
        method: "PATCH",
        body: JSON.stringify({ paulinaPersonality: personality }),
      });
      toast({ title: "Paulina personality saved! She now knows her role for your organisation." });
      refetch();
    } catch (e: any) {
      toast({ title: e.message || "Failed to save personality", variant: "destructive" });
    } finally { setSavingPersonality(false); }
  };

  const companyTypes = ["Educational", "Corporate", "Government", "NGO", "Healthcare", "Finance", "Technology", "Other"];
  const timezones = ["Africa/Lagos", "Africa/Nairobi", "Africa/Johannesburg", "Africa/Cairo", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Dubai", "Asia/Singapore"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Company Settings</h1>
          <p className="text-gray-500 mt-1">Manage branding, grading policy, Paulina personality, and company details</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
        </Button>
      </div>

      {/* ─── Paulina Personality ─── */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50/60 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Paulina AI Personality
            <span className="ml-auto text-xs font-normal bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Per-company
            </span>
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Tell Paulina exactly who she is for your organisation — her specialisation, tone, subjects she focuses on, and any institutional context.
            She uses this every time staff chat with her.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={personality}
            onChange={e => setPersonality(e.target.value)}
            placeholder={PERSONALITY_PLACEHOLDER}
            rows={6}
            className="w-full rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none font-mono"
          />
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-gray-400">
              Leave blank to use Paulina's default personality. Changes take effect immediately — no restart needed.
            </p>
            <Button onClick={handleSavePersonality} disabled={savingPersonality} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shrink-0">
              {savingPersonality
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                : <><CheckCircle2 className="w-4 h-4" /> Save Personality</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-500" /> Company Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Company name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Type</label>
              <select className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {companyTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}>
                {timezones.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Website</label>
              <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Phone</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+234…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Address</label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Company address" />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5 text-purple-500" /> Branding</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <Input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://…" />
              {form.logoUrl && <img src={form.logoUrl} alt="Logo preview" className="mt-2 h-16 object-contain rounded-lg border p-2 bg-gray-50" onError={e => (e.currentTarget.style.display = "none")} />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Colour</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="w-12 h-10 rounded-lg border cursor-pointer" />
                <Input value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="flex-1" placeholder="#3b82f6" />
              </div>
            </div>
            <div className="mt-4 p-4 rounded-xl border" style={{ borderColor: form.primaryColor + "40", backgroundColor: form.primaryColor + "10" }}>
              <p className="text-sm font-medium" style={{ color: form.primaryColor }}>Colour Preview</p>
              <div className="mt-2 h-2 rounded-full" style={{ backgroundColor: form.primaryColor }} />
            </div>
          </CardContent>
        </Card>

        {/* Grading Policy */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-green-500" /> Grading Policy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Pass Mark (%)</label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={100} value={form.passMark} onChange={e => setForm(f => ({ ...f, passMark: e.target.value }))} className="flex-1" />
                <span className="text-lg font-bold text-green-600 w-12 text-right">{form.passMark}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Grade Scale (minimum % for each grade)</p>
              <div className="grid grid-cols-5 gap-2">
                {Object.keys(gradeScale).map(grade => (
                  <div key={grade} className="text-center">
                    <div className={`text-xs font-bold mb-1 ${grade === "F" ? "text-red-600" : grade === "A" ? "text-green-600" : "text-blue-600"}`}>{grade}</div>
                    <Input type="number" min={0} max={100} value={gradeScale[grade]}
                      onChange={e => setGradeScale(g => ({ ...g, [grade]: e.target.value }))}
                      className="text-center text-sm px-1" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Candidates scoring ≥ the minimum get that grade.</p>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-gray-500" /> Settings Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Company Name", value: form.name || "—" },
              { label: "Type", value: form.type },
              { label: "Pass Mark", value: `${form.passMark}%` },
              { label: "Timezone", value: form.timezone },
              { label: "Grade A", value: `≥ ${gradeScale.A}%` },
              { label: "Grade B", value: `≥ ${gradeScale.B}%` },
              { label: "Grade C", value: `≥ ${gradeScale.C}%` },
              { label: "Grade D", value: `≥ ${gradeScale.D}%` },
              { label: "Paulina Personality", value: personality ? `✓ Custom (${personality.length} chars)` : "Default" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
            <Button onClick={handleSave} disabled={saving} className="w-full mt-4 gap-2">
              <CheckCircle2 className="w-4 h-4" /> Apply All Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
