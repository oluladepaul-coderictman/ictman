import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send, Bot, Loader2, Sparkles, Plus, Upload,
  CheckCircle2, AlertCircle, Brain, BookOpen, FileText, BarChart2, Cpu,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message { role: "user" | "assistant"; content: string }

interface AIStatus {
  activeProvider: "local" | "groq";
  local: { loaded: boolean; loading: boolean; available: boolean; error: string | null; sizeMB: number };
  groq: { configured: boolean; model: string };
}

const QUICK_PROMPTS = [
  { label: "Generate MCQ Questions", icon: BookOpen, prompt: "Generate 10 professional multiple-choice exam questions about " },
  { label: "Explain a Concept", icon: Brain, prompt: "Explain in detail: " },
  { label: "Analyse Performance", icon: BarChart2, prompt: "Help me analyse this exam performance data: " },
  { label: "Create Study Guide", icon: FileText, prompt: "Create a comprehensive study guide for: " },
];

function getWelcome(status: AIStatus | null): string {
  const providerLine = !status
    ? ""
    : status.activeProvider === "groq"
    ? `\n\nCurrently powered by **Groq** · \`${status.groq.model}\``
    : status.local.loaded
    ? "\n\nCurrently powered by the **local phi model** — fast & private"
    : status.local.loading
    ? "\n\n⏳ Local phi model is loading — responses available in a moment..."
    : "\n\n⚠️ Local phi model not available. Ask your admin to add a Groq API key.";

  return `Hello! I'm **Paulina**, your AI assistant for CBT Bulldozer.${providerLine}

I'm a **Mixture-of-Experts AI** — knowledgeable in every subject: mathematics, sciences, engineering, medicine, law, finance, coding, languages, history, and all professional disciplines.

I can help you with:
- 📚 **Generate professional exam questions** for any topic
- 🔬 **Explain any concept** from beginner to expert level
- 📊 **Analyse candidate performance** and suggest improvements
- 📝 **Review documents** — syllabi, past questions, study materials
- 💡 **Answer any question** with depth and accuracy

What would you like to explore today?`;
}

export default function PaulinaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = React.useState<AIStatus | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [fileContext, setFileContext] = React.useState<string | null>(null);
  const [sessionId] = React.useState(() => `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  React.useEffect(() => {
    apiClient<AIStatus>("/api/ai-config/status")
      .then(s => {
        setStatus(s);
        setMessages([{ role: "assistant", content: getWelcome(s) }]);
      })
      .catch(() => {
        setMessages([{ role: "assistant", content: getWelcome(null) }]);
      });
  }, []);

  const sendMessage = async (text?: string) => {
    const userMsg = (text ?? input).trim();
    if (!userMsg || sending) return;
    setInput("");
    setSending(true);
    const fullMsg = fileContext ? `${userMsg}\n\n[Attached document:]\n${fileContext.slice(0, 8000)}` : userMsg;
    setFileContext(null);
    const newMsgs: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMsgs);
    const history = messages.filter((_, i) => i > 0).slice(-12).map(m => ({ role: m.role, content: m.content }));
    try {
      const res = await apiClient<{ response: string }>("/api/paulina/chat", {
        method: "POST",
        body: JSON.stringify({ message: fullMsg, sessionId, history }),
      });
      setMessages([...newMsgs, { role: "assistant", content: res.response }]);
    } catch (e: any) {
      const msg = e?.message ?? "Unknown error";
      let reply = `⚠️ ${msg}`;
      if (msg.includes("not loaded") || msg.includes("not available")) {
        reply = "⚠️ **AI not ready yet.** " + (status?.activeProvider === "groq"
          ? "Check your Groq API key is set in Replit Secrets."
          : "The local phi model is still loading — please wait a moment.");
      }
      setMessages([...newMsgs, { role: "assistant", content: reply }]);
    } finally { setSending(false); }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
      const res = await fetch(`${base}/api/paulina/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("cbt_token") ?? ""}` },
        body: formData,
      });
      const data = await res.json();
      if (data.extractedText) {
        setFileContext(data.extractedText);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `📎 **${data.filename}** loaded (${data.length.toLocaleString()} chars). Ask me anything about this document!`,
        }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ Could not read **${file.name}**: ${data.error}` }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ File upload failed." }]);
    } finally { setUploading(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Status badge
  const statusBadge = () => {
    if (!status) return null;
    if (status.activeProvider === "groq" && status.groq.configured) {
      return (
        <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-green-50 text-green-700">
          <CheckCircle2 className="w-3.5 h-3.5" /> Groq · {status.groq.model.split("/").pop()}
        </span>
      );
    }
    if (status.activeProvider === "groq" && !status.groq.configured) {
      return (
        <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-red-50 text-red-600">
          <AlertCircle className="w-3.5 h-3.5" /> Groq key missing
        </span>
      );
    }
    if (status.local.loaded) {
      return (
        <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-purple-50 text-purple-700">
          <Cpu className="w-3.5 h-3.5" /> Phi model · ready
        </span>
      );
    }
    if (status.local.loading) {
      return (
        <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-700">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Phi loading…
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-red-50 text-red-600">
        <AlertCircle className="w-3.5 h-3.5" /> AI unavailable
      </span>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-h-[900px] gap-3">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" /> Paulina AI
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">MoE Expert · every subject · always on</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusBadge()}
          <Button size="sm" variant="outline" className="gap-1.5 h-8"
            onClick={() => setMessages([{ role: "assistant", content: getWelcome(status) }])}>
            <Plus className="w-3.5 h-3.5" /> New Chat
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-8"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}>
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload File
          </Button>
          <input type="file" className="hidden" ref={fileRef}
            accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.jpg,.jpeg,.png"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
        </div>
      </div>

      {/* File context notice */}
      {fileContext && (
        <div className="shrink-0 px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-700 flex items-center justify-between">
          <span>📎 Document loaded — your next message will include it</span>
          <button onClick={() => setFileContext(null)} className="text-purple-400 hover:text-purple-600 font-medium ml-4">Remove</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl border bg-gray-50/50 p-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-white border border-gray-100 shadow-sm rounded-tl-sm"
            }`}>
              {msg.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }: any) {
                      const isBlock = className?.includes("language-");
                      return isBlock
                        ? <pre className="bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto my-2 text-xs"><code>{children}</code></pre>
                        : <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>;
                    },
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                    h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-300 pl-3 italic text-gray-600 my-2">{children}</blockquote>,
                  }}>
                  {msg.content}
                </ReactMarkdown>
              ) : msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-gray-600">
                {(user?.name?.[0] ?? "U").toUpperCase()}
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="shrink-0 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_PROMPTS.map(({ label, icon: Icon, prompt }) => (
            <button key={label} onClick={() => sendMessage(prompt)}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50 transition-all text-xs text-left font-medium text-gray-700">
              <Icon className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 flex gap-2 items-end">
        <textarea
          value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Ask Paulina anything…"
          rows={1}
          className="flex-1 resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent min-h-[44px] max-h-32"
          style={{ height: "auto" }}
          onInput={e => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = "auto";
            t.style.height = Math.min(t.scrollHeight, 128) + "px";
          }}
        />
        <Button onClick={() => sendMessage()} disabled={sending || !input.trim()}
          className="h-11 w-11 p-0 rounded-2xl bg-purple-600 hover:bg-purple-700 shrink-0">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
