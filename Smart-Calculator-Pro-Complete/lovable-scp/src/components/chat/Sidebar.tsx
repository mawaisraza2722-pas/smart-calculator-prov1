import { useState } from "react";
import { MessageSquare, MoreHorizontal, Pencil, Pin, PinOff, Plus, Search, Settings, Star, StarOff, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Thread } from "@/lib/chat/store";
import { cn } from "@/lib/utils";

export function Sidebar({
  threads,
  activeId,
  onSelect,
  onNew,
  onUpdate,
  onDelete,
  onDeleteAll,
  onSettings,
}: {
  threads: Thread[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onUpdate: (t: Thread) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  onSettings: () => void;
}) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const visible = threads.filter((t) => t.messages.length > 0 || t.id === activeId);
  const filtered = visible.filter(
    (t) =>
      !q ||
      t.title.toLowerCase().includes(q.toLowerCase()) ||
      t.messages.some((m) => m.parts.some((p) => p.type === "text" && p.text.toLowerCase().includes(q.toLowerCase()))),
  );
  const groups = [
    { label: "Pinned", items: filtered.filter((t) => t.pinned) },
    { label: "Favorites", items: filtered.filter((t) => !t.pinned && t.favorite) },
    { label: "Recent", items: filtered.filter((t) => !t.pinned && !t.favorite) },
  ];

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="space-y-3 p-3">
        <button onClick={onNew} className="flex w-full items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground shadow-glow active:scale-[0.98]">
          <Plus className="size-5" /> New chat
        </button>
        <div className="flex items-center gap-2 rounded-xl border bg-background/50 px-3">
          <Search className="size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" className="h-9 flex-1 bg-transparent text-sm outline-none" />
        </div>
      </div>
      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-2 pb-2">
        {groups.map(
          (g) =>
            g.items.length > 0 && (
              <div key={g.label}>
                <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</div>
                {g.items.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "group flex items-center gap-2 rounded-xl px-2 py-2 text-sm transition hover:bg-sidebar-accent",
                      t.id === activeId && "bg-sidebar-accent",
                    )}
                  >
                    {editing === t.id ? (
                      <input
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => {
                          onUpdate({ ...t, title: name.trim() || t.title });
                          setEditing(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        className="flex-1 rounded-md bg-background px-2 py-1 outline-none ring-1 ring-ring"
                      />
                    ) : (
                      <button onClick={() => onSelect(t.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        {t.pinned ? <Pin className="size-3.5 shrink-0 text-primary" /> : t.favorite ? <Star className="size-3.5 shrink-0 text-primary" /> : <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />}
                        <span className="truncate">{t.title}</span>
                      </button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="rounded-md p-1 opacity-100 hover:bg-background md:opacity-0 md:group-hover:opacity-100" aria-label="Chat options">
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => (setEditing(t.id), setName(t.title))}>
                          <Pencil /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUpdate({ ...t, pinned: !t.pinned })}>
                          {t.pinned ? <PinOff /> : <Pin />} {t.pinned ? "Unpin" : "Pin"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUpdate({ ...t, favorite: !t.favorite })}>
                          {t.favorite ? <StarOff /> : <Star />} {t.favorite ? "Unfavorite" : "Favorite"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(t.id)}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ),
        )}
        {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">{q ? "No chats found" : "No chats yet"}</p>}
      </div>
      <div className="space-y-1 border-t p-2">
        <button onClick={onSettings} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-sidebar-accent">
          <Settings className="size-4" /> Settings & AI providers
        </button>
        <button onClick={onDeleteAll} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-sidebar-accent">
          <Trash2 className="size-4" /> Delete all chats
        </button>
      </div>
    </div>
  );
}
