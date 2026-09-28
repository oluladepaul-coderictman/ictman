import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useListDepartments, useCreateCandidate } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, CheckCircle2, XCircle, Users, FileText, AlertCircle } from "lucide-react";

interface ParsedRow { fullName: string; username: string; password: string; valid: boolean; error?: string }

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length === 0) return [];
  const isHeader = lines[0].toLowerCase().includes("name") || lines[0].toLowerCase().includes("username");
  const dataLines = isHeader ? lines.slice(1) : lines;
  return dataLines.map(line => {
    const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ""));
    const [fullName = "", username = "", password = ""] = parts;
    const valid = !!(fullName && username && password && username.length >= 3 && password.length >= 6);
    let error = "";
    if (!fullName) error = "Missing name";
    else if (!username) error = "Missing username";
    else if (!password) error = "Missing password";
    else if (username.length < 3) error = "Username too short (min 3)";
    else if (password.length < 6) error = "Password too short (min 6)";
    return { fullName, username, password, valid, error };
  });
}

export default function ImportCandidatesPage() {
  const { toast } = useToast();
  const { data: departments = [] } = useListDepartments();
  const createMutation = useCreateCandidate();

  const [text, setText] = React.useState("");
  const [parsed, setParsed] = React.useState<ParsedRow[]>([]);
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>("");
  const [importing, setImporting] = React.useState(false);
  const [results, setResults] = React.useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      setText(content);
      setParsed(parseCSV(content));
    };
    reader.readAsText(file);
  };

  const handleTextChange = (val: string) => {
    setText(val);
    setParsed(parseCSV(val));
  };

  const handleImport = async (): Promise<void> => {
    const valid = parsed.filter(r => r.valid);
    if (valid.length === 0) { toast({ title: "No valid rows to import", variant: "destructive" }); return; }
    setImporting(true);
    let success = 0; const errors: string[] = [];
    for (const row of valid) {
      try {
        await createMutation.mutateAsync({
          data: {
            fullName: row.fullName,
            username: row.username,
            password: row.password,
            departmentId: selectedDeptId ? parseInt(selectedDeptId) : undefined,
          }
        });
        success++;
      } catch (e: any) {
        errors.push(`${row.username}: ${e.message ?? "Failed"}`);
      }
    }
    setResults({ success, failed: errors.length, errors });
    setImporting(false);
    toast({ title: `Import complete: ${success} added, ${errors.length} failed` });
  };

  const downloadTemplate = () => {
    const csv = `Full Name,Username,Password\nJohn Doe,johndoe,secret123\nJane Smith,janesmith,mypass456`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "candidate_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsed.filter(r => r.valid).length;
  const invalidCount = parsed.filter(r => !r.valid).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bulk Import Candidates</h1>
          <p className="text-gray-500 mt-1">Upload a CSV file to import multiple candidates at once</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate} className="gap-2">
          <Download className="w-4 h-4" /> Download Template
        </Button>
      </div>

      {results ? (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">Import Complete</p>
              <p className="text-green-600 font-semibold mt-1">{results.success} candidates added successfully</p>
              {results.failed > 0 && <p className="text-red-500 text-sm mt-1">{results.failed} failed</p>}
            </div>
            {results.errors.length > 0 && (
              <div className="bg-red-50 rounded-xl p-3 text-left text-xs text-red-700 space-y-1 max-h-40 overflow-y-auto">
                {results.errors.map((e, i) => <div key={i} className="flex gap-1"><XCircle className="w-3 h-3 mt-0.5 shrink-0" /> {e}</div>)}
              </div>
            )}
            <Button onClick={() => { setResults(null); setText(""); setParsed([]); }}>Import More</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* File drop zone */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 cursor-pointer transition-colors"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Drop CSV file here or click to upload</p>
                  <p className="text-xs text-gray-400 mt-1">Columns: Full Name, Username, Password</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">OR paste CSV data</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <textarea
                  rows={8}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                  placeholder="Full Name,Username,Password&#10;John Doe,johndoe,secret123&#10;Jane Smith,janesmith,mypass456"
                  value={text}
                  onChange={e => handleTextChange(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Preview table */}
            {parsed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Preview ({parsed.length} rows)</span>
                    <div className="flex gap-2 text-sm font-normal">
                      <span className="text-green-600">{validCount} valid</span>
                      {invalidCount > 0 && <span className="text-red-500">{invalidCount} invalid</span>}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">#</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Full Name</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Username</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Password</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                      </tr></thead>
                      <tbody>
                        {parsed.map((row, i) => (
                          <tr key={i} className={`border-b border-gray-50 ${row.valid ? "" : "bg-red-50"}`}>
                            <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                            <td className="py-2 px-3">{row.fullName || <span className="text-red-400 italic">empty</span>}</td>
                            <td className="py-2 px-3 font-mono text-xs">{row.username || <span className="text-red-400 italic">empty</span>}</td>
                            <td className="py-2 px-3 font-mono text-xs">{"•".repeat(Math.min(row.password.length, 8))}</td>
                            <td className="py-2 px-3">
                              {row.valid
                                ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> OK</span>
                                : <span className="text-red-500 flex items-center gap-1 text-xs"><XCircle className="w-3.5 h-3.5 shrink-0" /> {row.error}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Config sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Import Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Department (optional)</label>
                  <select className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" value={selectedDeptId} onChange={e => setSelectedDeptId(e.target.value)}>
                    <option value="">No department</option>
                    {(departments as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
                  <p className="font-semibold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> CSV Format</p>
                  <p>Column order: <code className="bg-blue-100 px-1 rounded">Full Name</code>, <code className="bg-blue-100 px-1 rounded">Username</code>, <code className="bg-blue-100 px-1 rounded">Password</code></p>
                  <p>Header row is optional and will be auto-detected.</p>
                  <p>Username: min 3 chars · Password: min 6 chars</p>
                </div>

                <Button
                  className="w-full gap-2"
                  disabled={validCount === 0 || importing}
                  onClick={handleImport}
                >
                  {importing ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importing...</>
                  ) : (
                    <><Users className="w-4 h-4" /> Import {validCount} Candidate{validCount !== 1 ? "s" : ""}</>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-gray-600 mb-2">Template Example</p>
                <pre className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 overflow-x-auto">{`Full Name,Username,Password
John Doe,johndoe,secret123
Jane Smith,janesmith,pass456
Ahmed Musa,ahmedm,mypass789`}</pre>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
