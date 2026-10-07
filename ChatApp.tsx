import { useCallback, useEffect, useState } from "react";
import { Copy, Download, Eraser, FileDown, Menu, MoreVertical, Share2, Wifi, WifiOff, Cpu, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar } from "./Sidebar";
import { ChatView } from "./ChatView";
import { SettingsDialog } from "./SettingsDialog";
import { deleteAllThreads, deleteThread, listThreads, makeThread, saveThread, type Thread } from "@/lib/chat/store";
import { conversationText, exportPdf, exportTxt } from "@/lib/chat/export";
import { PROVIDER_LABELS, useSettings } from "@/lib/chat/settings";
import { useLocalAI } from "@/lib/ai/local-llm";

function StatusBadge() {
  const s = useSettings();
  const local = useLocalAI();
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const u = () => setOnline(navigator.onLine);
    u();
    window.addEventListener("online", u);
    window.addEventListener("offline", u);
    return () => (window.removeEventListener("online", u), window.removeEventListener("offline", u));
  }, []);
  const loading = local.status === "downloading" || local.status === "preparing";
  const offlineReady = local.status === "ready";
  let icon = <Wifi className="size-3.5" />;
  let label = `Internet AI active · ${PROVIDER_LABELS[s.provider].name.replace(/^AI \d — /, "")}`;
  if (loading) {
    icon = <Loader2 className="size-3.5 animate-spin" />;
    label = local.status === "downloading" ? `Downloading… ${Math.round(local.progress * 100)}%` : "Preparing AI…";
  } else if (!online) {
    icon = offlineReady ? <Cpu className="size-3.5" /> : <WifiOff className="size-3.5" />;
    label = offlineReady ? "Ready Offline" : "Offline AI unavailable";
  } else if (offlineReady && s.preferOffline && s.provider === "auto") {
    icon = <Cpu className="size-3.5" />;
    label = "Ready Offline";
  }
  return (
    <span className="inline-flex max-w-[55vw] items-center gap-1.5 truncate rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
      <span className="text-primary">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

export function ChatApp() {
  const settings = useSettings();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  // Offline app shell: only on the published app, not inside the editor preview.
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator) || window.self !== window.top) return;
    if (/id-preview--|lovableproject\.com/.test(location.hostname)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    listThreads().then((ts) => {
      const fresh = makeThread();
      setThreads([fresh, ...ts]);
      setActiveId(fresh.id);
      setReady(true);
    });
  }, []);

  const active = threads.find((t) => t.id === activeId);

  const update = useCallback((t: Thread) => {
    setThreads((ts) => ts.map((x) => (x.id === t.id ? t : x)));
    if (t.messages.length) saveThread(t);
  }, []);

  const newChat = () => {
    const existing = threads.find((t) => t.messages.length === 0);
    if (existing) setActiveId(existing.id);
    else {
      const t = makeThread();
      setThreads((ts) => [t, ...ts]);
      setActiveId(t.id);
    }
    setMobileNav(false);
  };

  const remove = async (id: string) => {
    await deleteThread(id);
    setThreads((ts) => ts.filter((t) => t.id !== id));
    if (id === activeId) {
      const t = makeThread();
      setThreads((ts) => [t, ...ts]);
      setActiveId(t.id);
    }
  };

  const removeAll = async () => {
    if (!confirm("Delete all chats? This can't be undone.")) return;
    await deleteAllThreads();
    const t = makeThread();
    setThreads([t]);
    setActiveId(t.id);
    toast.success("All chats deleted");
  };

  const clearActive = async () => {
    if (!active) return;
    await deleteThread(active.id);
    const t = makeThread();
    setThreads((ts) => [t, ...ts.filter((x) => x.id !== active.id)]);
    setActiveId(t.id);
  };

  const share = async () => {
    if (!active?.messages.length) return;
    const text = conversationText(active.title, active.messages);
    if (navigator.share) {
      try {
        await navigator.share({ title: active.title, text });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Conversation copied — paste it anywhere to share");
    }
  };

  const sidebar = (
    <Sidebar
      threads={threads}
      activeId={activeId}
      onSelect={(id) => (setActiveId(id), setMobileNav(false))}
      onNew={newChat}
      onUpdate={update}
      onDelete={remove}
      onDeleteAll={removeAll}
      onSettings={() => (setSettingsOpen(true), setMobileNav(false))}
    />
  );
  const hasMsgs = !!active?.messages.length;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="hidden w-72 shrink-0 border-r md:block">{sidebar}</aside>
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-[85vw] max-w-xs p-0">
          <SheetTitle className="sr-only">Chats</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b px-2 py-2 sm:px-4">
          <button className="grid size-10 place-items-center rounded-xl hover:bg-muted md:hidden" onClick={() => setMobileNav(true)} aria-label="Open chats">
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{active?.title ?? "Smart Calculator Pro AI"}</div>
            <StatusBadge />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="grid size-10 place-items-center rounded-xl hover:bg-muted" aria-label="Conversation options">
              <MoreVertical className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!hasMsgs} onClick={() => active && exportTxt(active.title, active.messages)}>
                <FileDown /> Export as TXT
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!hasMsgs} onClick={() => active && exportPdf(active.title, active.messages)}>
                <Download /> Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!hasMsgs}
                onClick={() => active && navigator.clipboard.writeText(conversationText(active.title, active.messages)).then(() => toast.success("Conversation copied"))}
              >
                <Copy /> Copy conversation
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!hasMsgs} onClick={share}>
                <Share2 /> Share conversation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!hasMsgs} className="text-destructive focus:text-destructive" onClick={clearActive}>
                <Eraser /> Clear conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        {ready && active ? <ChatView key={active.id} thread={active} onChange={update} /> : <div className="flex-1" />}
      </main>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
