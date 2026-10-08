// Chat history persistence in IndexedDB (handles large image attachments better than localStorage).
import { get, set, del, keys } from "idb-keyval";
import type { UIMessage } from "ai";

export interface Thread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  favorite: boolean;
  messages: UIMessage[];
}

const P = "thread:";

export const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

export function makeThread(): Thread {
  const now = Date.now();
  return { id: newId(), title: "New chat", createdAt: now, updatedAt: now, pinned: false, favorite: false, messages: [] };
}

export async function listThreads(): Promise<Thread[]> {
  const ks = (await keys()).filter((k) => String(k).startsWith(P));
  const all = await Promise.all(ks.map((k) => get<Thread>(k)));
  return (all.filter(Boolean) as Thread[]).sort((a, b) => b.updatedAt - a.updatedAt);
}

export const saveThread = (t: Thread) => set(P + t.id, t);
export const deleteThread = (id: string) => del(P + id);
export async function deleteAllThreads() {
  const ks = (await keys()).filter((k) => String(k).startsWith(P));
  await Promise.all(ks.map((k) => del(k)));
}

export function messageText(m: UIMessage) {
  return m.parts
    .map((p) => (p.type === "text" ? p.text.replace(/^<<file:(.+?)>>\n[\s\S]*$/, "[Attached file: $1]") : p.type === "file" ? `[Attached: ${p.filename ?? p.mediaType}]` : ""))
    .filter(Boolean)
    .join("\n");
}

export function titleFrom(messages: UIMessage[]) {
  const first = messages.find((m) => m.role === "user");
  const t = first ? messageText(first).replace(/\[Attached[^\]]*\]/g, "").trim() : "";
  return (t || (first ? "Image analysis" : "New chat")).slice(0, 48);
}
