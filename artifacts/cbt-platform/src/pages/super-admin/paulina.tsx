import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { Send, Bot, User, Loader2, Sparkles, FolderOpen, FileText, CheckCircle2, AlertCircle, Power } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolResults?: any[];
}

interface ModelStatus {
  modelAvailable: boolean;
  modelLoaded: boolean;
  modelLoading: boolean;
  modelSizeMB?: number;
  modelError?: string | null;
}

function renderMarkdown(text: string) {
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="bg-gray-900 text-green-300 rounded-lg p-3 text-xs overflow-x-auto my-2 font-mono whitespace-pre-wrap"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

export default function PaulinaPage() {
  const [messages, setMessages] = React.useState<Message[]>([
    { role: "assistant", content: "Hello! I'm **Paulina**, your AI assistant for this CBT Platform. I have full read and write access to the application code.\n\nYou can ask me to:\n- Explain how any part of the app works\n- Edit pages, styles, or features\n- Read specific files\n- Fix bugs or add new features\n\nWhat would you like me to help with?" }
  ]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [status, setStatus] = React.useState<ModelStatus | null>(null);
  const [loadingModel, setLoadingModel] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  React.useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const s = await apiClient("/api/paulina/status");
      setStatus(s);
    } catch { /* ignore */ }
  };

  const loadModel = async () => {
    setLoadingModel(true);
    try {
      await apiClient("/api/paulina/load", { method: "POST" });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Loading my brain... This may take 1–2 minutes as I load the phi3-mini model. Please wait and then send a message."
      }]);
      setTimeout(async () => {
        await fetchStatus();
        setLoadingModel(false);
      }, 5000);
    } catch {
      setLoadingModel(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    setSending(true);

    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);

    const history = messages.filter(m => m.role !== "assistant" || messages.indexOf(m) > 0).slice(-8);

    try {
      const res = await apiClient("/api/paulina/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMsg, history }),
      });
      setMessages([...newMessages, {
        role: "assistant",
        content: res.response,
        toolResults: res.toolResults,
      }]);
    } catch (e: any) {
      const errMsg = e?.message ?? "Unknown error";
      if (errMsg.includes("not loaded") || errMsg.includes("503")) {
        setMessages([...newMessages, {
          role: "assistant",
          content: "My model isn't loaded yet. Please click **Load Paulina** above, wait about 1–2 minutes, then try again."
        }]);
      } else {
        setMessages([...newMessages, {
          role: "assistant",
          content: `Sorry, I hit an error: ${errMsg}`
        }]);
      }
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" /> Paulina AI Assistant
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your personal AI with full read & write access to this app's codebase. Powered by phi3-mini (local).
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status && (
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${status.modelLoaded ? 'bg-green-500 animate-pulse' : status.modelLoading ? 'bg-amber-400 animate-pulse' : 'bg-gray-300'}`} />
              <span className="text-muted-foreground">
                {status.modelLoaded ? `Model ready (${status.modelSizeMB}MB)` : status.modelLoading ? 'Loading...' : status.modelAvailable ? 'Not loaded' : 'Model not found'}
              </span>
            </div>
          )}
          {status && !status.modelLoaded && !status.modelLoading && status.modelAvailable && (
            <Button size="sm" onClick={loadModel} disabled={loadingModel} className="bg-purple-600 hover:bg-purple-700 text-white">
              {loadingModel ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Power className="w-4 h-4 mr-1" />}
              Load Paulina
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={fetchStatus}>Refresh status</Button>
        </div>
      </div>

      {/* Chat Window */}
      <Card className="flex-1 flex flex-col min-h-0" style={{ minHeight: "calc(100vh - 280px)" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === "user" ? "order-1" : ""}`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  }`}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
                {msg.toolResults && msg.toolResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.toolResults.map((t, ti) => (
                      <div key={ti} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${t.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {t.action === "read" ? <FileText className="w-3 h-3 shrink-0" /> : t.action === "write" ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <FolderOpen className="w-3 h-3 shrink-0" />}
                        <span className="font-mono">{t.action}: {t.path}</span>
                        {!t.success && <AlertCircle className="w-3 h-3 ml-auto" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Paulina to edit a page, explain code, fix a bug... (Enter to send, Shift+Enter for newline)"
              className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            Paulina can read and write files in this app. Review any code changes before restarting the server.
          </p>
        </div>
      </Card>
    </div>
  );
}
