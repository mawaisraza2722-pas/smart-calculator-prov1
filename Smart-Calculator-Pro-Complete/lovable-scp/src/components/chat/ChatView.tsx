import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";
import { Calculator, Percent, Scale, Landmark, Coins, CalendarClock } from "lucide-react";
import { Composer } from "./Composer";
import { MessageItem, TypingIndicator } from "./MessageItem";
import { type Thread, newId, titleFrom, messageText } from "@/lib/chat/store";
import { getSettings } from "@/lib/chat/settings";
import { toMarkdown, tryLocalSolve } from "@/lib/calc/core";
import { localChat, localReady, stopLocal } from "@/lib/ai/local-llm";
import type { Attachment } from "@/lib/chat/files";

const SUGGESTIONS = [
  { icon: Percent, text: "Calculate 15% of 850" },
  { icon: Scale, text: "BMI for 70kg and 175cm" },
  { icon: Landmark, text: "EMI for 500000 at 12% for 24 months" },
  { icon: Coins, text: "Convert 10 USD to PKR" },
  { icon: CalendarClock, text: "Mein 12 March 2000 ko paida hua, meri umar kitni hai?" },
  { icon: Calculator, text: "Solve 2x² − 5x + 3 = 0 step by step" },
];

export function ChatView({ thread, onChange }: { thread: Thread; onChange: (t: Thread) => void }) {
  const [localBusy, setLocalBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ provider: getSettings().provider, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      }),
    [],
  );
  const { messages, setMessages, sendMessage, status, stop, regenerate, error } = useChat({
    id: thread.id,
    messages: thread.messages,
    transport,
    onError: (e) => toast.error(e.message || "AI request failed"),
  });
  const busy = status === "submitted" || status === "streaming" || localBusy;

  // Persist when idle.
  const threadRef = useRef(thread);
  threadRef.current = thread;
  useEffect(() => {
    if (busy) return;
    const t = threadRef.current;
    if (messages === t.messages || (messages.length === 0 && t.messages.length === 0)) return;
    onChange({ ...t, messages, title: t.title === "New chat" ? titleFrom(messages) : t.title, updatedAt: Date.now() });
  }, [messages, busy, onChange]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const runLocal = async (history: UIMessage[]) => {
    const aid = newId();
    setMessages([...history, { id: aid, role: "assistant", metadata: { source: "offline" }, parts: [{ type: "text", text: "" }] }]);
    setLocalBusy(true);
    let acc = "";
    try {
      await localChat(
        [
          { role: "system", content: "You are Smart Calculator Pro AI, a helpful offline assistant. Be concise and honest; say when unsure." },
          ...history.slice(-10).map((m) => ({ role: m.role as "user" | "assistant", content: messageText(m) })),
        ],
        (d) => {
          acc += d;
          setMessages((ms) => ms.map((m) => (m.id === aid ? { ...m, parts: [{ type: "text", text: acc }] } : m)));
        },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Offline AI failed");
    } finally {
      setLocalBusy(false);
    }
  };

  const send = async (text: string, att: Attachment[]) => {
    const s = getSettings();
    const userParts: UIMessage["parts"] = [];
    for (const a of att) {
      if (a.kind === "text") userParts.push({ type: "text", text: `<<file:${a.name}>>\n${a.text}` });
      else userParts.push({ type: "file", mediaType: a.mediaType, url: a.url!, filename: a.name });
    }
    userParts.push({ type: "text", text });

    // 1) Built-in calculator logic
    if (!att.length && s.localSolve && (s.provider === "auto" || !navigator.onLine)) {
      const r = tryLocalSolve(text);
      if (r) {
        setMessages([
          ...messages,
          { id: newId(), role: "user", parts: userParts },
          { id: newId(), role: "assistant", metadata: { source: "calculator" }, parts: [{ type: "text", text: toMarkdown(r) }] },
        ]);
        return;
      }
    }
    // 2) Offline AI
    const wantLocal = localReady() && !att.length && ((s.provider === "auto" && s.preferOffline) || !navigator.onLine);
    if (wantLocal) return runLocal([...messages, { id: newId(), role: "user", parts: userParts }]);
    if (!navigator.onLine) {
      toast.error("You're offline. Download an offline AI in Settings to chat without internet.");
      return;
    }
    // 3) Online AI
    sendMessage({ parts: userParts });
  };

  const onRegenerate = () => {
    const last = messages[messages.length - 1];
    const src = (last?.metadata as { source?: string } | undefined)?.source;
    if (src === "offline" || src === "calculator") {
      const hist = messages.slice(0, -1);
      if (src === "offline") runLocal(hist);
      else {
        setMessages(hist.slice(0, -1));
        const u = hist[hist.length - 1];
        if (u) sendMessage({ parts: u.parts });
      }
      return;
    }
    regenerate();
  };

  const last = messages[messages.length - 1];
  const showTyping = busy && (!last || last.role === "user" || !last.parts.some((p) => p.type === "text" && p.text));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center gap-8 px-4 py-10 text-center">
            <div className="space-y-3">
              <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-brand text-primary-foreground shadow-glow">
                <Calculator className="size-8" />
              </div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                <span className="text-brand">Smart Calculator Pro</span> AI
              </h1>
              <p className="text-sm text-muted-foreground">Ask anything, solve math step by step, or snap a photo of a question.</p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map(({ icon: I, text }) => (
                <button
                  key={text}
                  onClick={() => send(text, [])}
                  className="flex items-center gap-3 rounded-2xl border bg-card p-3 text-left text-sm transition hover:border-primary/50 hover:bg-accent/40"
                >
                  <I className="size-4 shrink-0 text-primary" /> {text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
            {messages.map((m, i) => (
              <MessageItem key={m.id} message={m} isLast={i === messages.length - 1} busy={busy} onRegenerate={onRegenerate} />
            ))}
            {showTyping && <TypingIndicator />}
            {error && !busy && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error.message}</div>
            )}
            <div ref={bottom} />
          </div>
        )}
      </div>
      <Composer
        busy={busy}
        onSend={send}
        onStop={() => {
          if (localBusy) stopLocal();
          else stop();
        }}
      />
    </div>
  );
}
