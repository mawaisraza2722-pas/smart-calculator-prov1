import type { UIMessage } from "ai";
import { messageText } from "./store";

export function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const safeName = (s: string) => s.replace(/[^\w\- ]+/g, "").trim().slice(0, 40) || "chat";

export function conversationText(title: string, messages: UIMessage[]) {
  return (
    `${title}\nSmart Calculator Pro AI — ${new Date().toLocaleString()}\n\n` +
    messages.map((m) => `${m.role === "user" ? "You" : "AI"}:\n${messageText(m)}`).join("\n\n---\n\n")
  );
}

export async function textToPdf(title: string, body: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(doc.splitTextToSize(title, W - 2 * M), M, y);
  y += 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const clean = body.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s*/gm, "").replace(/`/g, "");
  for (const line of doc.splitTextToSize(clean, W - 2 * M) as string[]) {
    if (y > H - M) {
      doc.addPage();
      y = M;
    }
    doc.text(line, M, y);
    y += 15;
  }
  return doc.output("blob");
}

export const exportTxt = (title: string, m: UIMessage[]) =>
  download(`${safeName(title)}.txt`, new Blob([conversationText(title, m)], { type: "text/plain" }));

export const exportPdf = async (title: string, m: UIMessage[]) =>
  download(`${safeName(title)}.pdf`, await textToPdf(title, conversationText(title, m).split("\n").slice(2).join("\n")));

const MIME: Record<string, string> = {
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  html: "text/html",
};

export async function downloadGenerated(f: { filename: string; format: string; title?: string | null; content: string }) {
  const base = f.filename.replace(/\.[a-z0-9]+$/i, "") || "file";
  if (f.format === "pdf") return download(`${base}.pdf`, await textToPdf(f.title || base, f.content));
  download(`${base}.${f.format}`, new Blob([f.content], { type: MIME[f.format] ?? "text/plain" }));
}
