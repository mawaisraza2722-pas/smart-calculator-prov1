import { useState } from "react";
import type { UIMessage } from "ai";
import { Brain, Calculator, Check, ChevronDown, Copy, Download, FileText, RefreshCw, WifiOff } from "lucide-react";
import { Markdown } from "./Markdown";
import { messageText } from "@/lib/chat/store";
import { downloadGenerated } from "@/lib/chat/export";
import { cn } from "@/lib/utils";

const TOOL_NAMES: Record<string, string> = {
  calculate: "Scientific Calculator",
  percentage: "Percentage Calculator",
  bmi: "BMI Calculator",
  emi: "EMI / Loan Calculator",
  age: "Age Calculator",
  discount: "Discount Calculator",
  profit: "Profit Calculator",
  gst: "GST / Tax Calculator",
  unit_convert: "Unit Converter",
  date_calc: "Date & Time Calculator",
  timezone_convert: "Time Zone Converter",
  currency_convert: "Currency Converter",
};

type AnyPart = UIMessage["parts"][number] & { input?: Record<string, unknown>; state?: string; output?: Record<string, unknown> };

function FileCard({ input, ready }: { input: Record<string, unknown>; ready: boolean }) {
  const f = input as { filename: string; format: string; title: string | null; content: string };
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-surface p-3 shadow-float">
      <div className="grid size-11 place-items-center rounded-xl bg-brand text-primary-foreground">
        <FileText className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{(f.filename || "file").replace(/\.[a-z]+$/i, "")}.{f.format}</div>
        <div className="text-xs text-muted-foreground">{ready ? `${(f.content?.length ?? 0).toLocaleString()} characters · ${f.format?.toUpperCase()}` : "Generating…"}</div>
      </div>
      <button
        disabled={!ready}
        onClick={() => downloadGenerated(f)}
        className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition active:scale-95 disabled:opacity-50"
      >
        <Download className="size-4" /> Download
      </button>
    </div>
  );
}

export function MessageItem({
  message,
  isLast,
  busy,
  onRegenerate,
}: {
  message: UIMessage;
  isLast: boolean;
  busy: boolean;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showThink, setShowThink] = useState(false);
  const meta = message.metadata as { source?: string } | undefined;

  if (message.role === "user") {
    return (
      <div className="flex animate-rise flex-col items-end gap-2">
        {message.parts.map((p, i) => {
          if (p.type === "file" && p.mediaType.startsWith("image/"))
            return <img key={i} src={p.url} alt={p.filename ?? "attachment"} className="max-h-64 max-w-[75%] rounded-2xl border object-contain" />;
          if (p.type === "file")
            return (
              <div key={i} className="flex items-center gap-2 rounded-xl border bg-surface px-3 py-2 text-sm">
                <FileText className="size-4 text-primary" /> {p.filename ?? "Document"}
              </div>
            );
          if (p.type === "text") {
            const fm = p.text.match(/^<<file:(.+?)>>\n/);
            if (fm)
              return (
                <div key={i} className="flex items-center gap-2 rounded-xl border bg-surface px-3 py-2 text-sm">
                  <FileText className="size-4 text-primary" /> {fm[1]}
                </div>
              );
            return (
              <div key={i} className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-bubble px-4 py-2.5 text-[0.95rem] leading-relaxed">
                {p.text}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  const parts = message.parts as AnyPart[];
  const reasoning = parts.filter((p) => p.type === "reasoning").map((p) => (p as { text: string }).text).join("\n").trim();
  const hasText = parts.some((p) => p.type === "text" && (p as { text: string }).text.trim());

  return (
    <div className="group flex animate-rise gap-3">
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-brand text-primary-foreground shadow-glow">
        <Calculator className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {meta?.source === "calculator" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
            <Calculator className="size-3" /> Solved instantly on your device
          </span>
        )}
        {meta?.source === "offline" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
            <WifiOff className="size-3" /> Offline AI
          </span>
        )}
        {reasoning && (
          <div className="rounded-xl border bg-surface/60 text-sm">
            <button onClick={() => setShowThink((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2 text-muted-foreground">
              <Brain className="size-4" /> Thinking
              <ChevronDown className={cn("ml-auto size-4 transition", showThink && "rotate-180")} />
            </button>
            {showThink && <div className="whitespace-pre-wrap px-3 pb-3 text-xs text-muted-foreground">{reasoning}</div>}
          </div>
        )}
        {parts.map((p, i) => {
          if (p.type === "text") return <Markdown key={i} text={(p as { text: string }).text} />;
          if (p.type === "tool-create_file" && p.input) return <FileCard key={i} input={p.input} ready={p.state === "output-available"} />;
          if (p.type.startsWith("tool-")) {
            const name = p.type.slice(5);
            const failed = p.output && p.output["ok"] === false;
            return (
              <span key={i} className={cn("mr-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs", failed ? "text-destructive" : "text-muted-foreground")}>
                <Calculator className="size-3.5 text-primary" />
                {p.state === "output-available" ? (failed ? `${TOOL_NAMES[name] ?? name} failed` : `Used ${TOOL_NAMES[name] ?? name}`) : `Using ${TOOL_NAMES[name] ?? name}…`}
              </span>
            );
          }
          return null;
        })}
        {hasText && (!busy || !isLast) && (
          <div className="flex gap-1 text-muted-foreground opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
            <button
              title="Copy"
              className="rounded-lg p-1.5 hover:bg-muted hover:text-foreground"
              onClick={() => {
                navigator.clipboard.writeText(messageText(message));
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
            {isLast && (
              <button title="Regenerate" className="rounded-lg p-1.5 hover:bg-muted hover:text-foreground" onClick={onRegenerate}>
                <RefreshCw className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex animate-rise gap-3">
      <div className="grid size-8 place-items-center rounded-xl bg-brand text-primary-foreground shadow-glow">
        <Calculator className="size-4" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl bg-surface px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="typing-dot size-2 rounded-full bg-primary" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}
