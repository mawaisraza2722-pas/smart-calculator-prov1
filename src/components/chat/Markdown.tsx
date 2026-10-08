import { memo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Check, Copy } from "lucide-react";

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) return textOf((node as { props: { children?: ReactNode } }).props.children);
  return "";
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [ok, setOk] = useState(false);
  const code = textOf(children);
  const lang = /language-(\w+)/.exec(
    ((children as { props?: { className?: string } })?.props?.className as string) || "",
  )?.[1];
  return (
    <div className="overflow-hidden rounded-xl border bg-surface">
      <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-mono">{lang ?? "code"}</span>
        <button
          className="flex items-center gap-1 rounded-md px-2 py-0.5 hover:bg-muted"
          onClick={() => {
            navigator.clipboard.writeText(code);
            setOk(true);
            setTimeout(() => setOk(false), 1500);
          }}
        >
          {ok ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {ok ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="scrollbar-thin overflow-x-auto p-3 font-mono text-[0.82rem] leading-relaxed">{children}</pre>
    </div>
  );
}

// Normalize \( \) and \[ \] delimiters to $ for remark-math.
const normalizeMath = (s: string) =>
  s.replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$${m}$$`).replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m}$`);

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          table: ({ children }) => (
            <div className="scrollbar-thin overflow-x-auto rounded-lg">
              <table>{children}</table>
            </div>
          ),
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {normalizeMath(text)}
      </ReactMarkdown>
    </div>
  );
});
