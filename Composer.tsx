import { useEffect, useRef, useState } from "react";
import { ArrowUp, Camera, FileText, Image as ImageIcon, Mic, MicOff, Paperclip, Palette, PenLine, Plus, ScanLine, Square, X } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ACCEPT_FILES, imageAttachment, processFile, type Attachment } from "@/lib/chat/files";
import { getSettings } from "@/lib/chat/settings";
import { CanvasPad } from "./CanvasPad";
import { CameraDialog } from "./CameraDialog";
import { cn } from "@/lib/utils";

export function Composer({ busy, onSend, onStop }: { busy: boolean; onSend: (text: string, att: Attachment[]) => void; onStop: () => void }) {
  const [text, setText] = useState("");
  const [att, setAtt] = useState<Attachment[]>([]);
  const [menu, setMenu] = useState(false);
  const [pad, setPad] = useState<"write" | "draw" | null>(null);
  const [cam, setCam] = useState<"camera" | "scan" | null>(null);
  const [listening, setListening] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const files = useRef<HTMLInputElement>(null);
  const capture = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec = useRef<any>(null);

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [text]);

  const addFiles = async (list: FileList | File[] | null) => {
    if (!list) return;
    for (const f of Array.from(list)) {
      try {
        const a = await processFile(f);
        setAtt((p) => [...p, a]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't read file");
      }
    }
  };
  const addImage = async (dataUrl: string, prompt?: string, name?: string) => {
    const a = await imageAttachment(dataUrl, name);
    setAtt((p) => [...p, a]);
    if (prompt) setText((t) => t || prompt);
    ta.current?.focus();
  };

  const submit = () => {
    if (busy || (!text.trim() && !att.length)) return;
    onSend(text.trim() || "Analyze this.", att);
    setText("");
    setAtt([]);
  };

  const toggleVoice = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input isn't supported in this browser. Try Chrome on Android or desktop.");
      return;
    }
    const r = new SR();
    r.lang = getSettings().voiceLang;
    r.interimResults = true;
    r.continuous = false;
    const base = text ? text + " " : "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      const t = Array.from(e.results as ArrayLike<{ 0: { transcript: string } }>).map((x) => x[0].transcript).join("");
      setText(base + t);
    };
    r.onerror = (e: { error: string }) => {
      if (e.error !== "aborted" && e.error !== "no-speech") toast.error(e.error === "not-allowed" ? "Microphone permission denied." : "Voice input error.");
    };
    r.onend = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  };

  const items = [
    { icon: Camera, label: "Camera", on: () => setCam("camera") },
    { icon: ImageIcon, label: "Gallery", on: () => gallery.current?.click() },
    { icon: ScanLine, label: "Scan", on: () => setCam("scan") },
    { icon: PenLine, label: "Write", on: () => setPad("write") },
    { icon: Palette, label: "Draw", on: () => setPad("draw") },
    { icon: Mic, label: "Voice", on: toggleVoice },
    { icon: Paperclip, label: "Files", on: () => files.current?.click() },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      <div
        className="rounded-3xl border bg-card p-2 shadow-float transition focus-within:border-primary/50"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        {att.length > 0 && (
          <div className="scrollbar-thin flex gap-2 overflow-x-auto p-1 pb-2">
            {att.map((a) => (
              <div key={a.id} className="relative shrink-0 animate-rise">
                {a.kind === "image" ? (
                  <img src={a.url} alt={a.name} className="size-16 rounded-xl border object-cover" />
                ) : (
                  <div className="flex h-16 w-36 items-center gap-2 rounded-xl border bg-surface px-2 text-xs">
                    <FileText className="size-5 shrink-0 text-primary" />
                    <span className="line-clamp-2 break-all">{a.name}</span>
                  </div>
                )}
                <button
                  onClick={() => setAtt((p) => p.filter((x) => x.id !== a.id))}
                  className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background"
                  aria-label="Remove attachment"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <Popover open={menu} onOpenChange={setMenu}>
            <PopoverTrigger asChild>
              <button aria-label="Add" className={cn("grid size-10 shrink-0 place-items-center rounded-full bg-muted transition hover:bg-accent", menu && "rotate-45 bg-accent")}>
                <Plus className="size-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-72 rounded-2xl p-2">
              <div className="grid grid-cols-4 gap-1">
                {items.map(({ icon: I, label, on }) => (
                  <button
                    key={label}
                    onClick={() => {
                      setMenu(false);
                      on();
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl p-2 text-xs transition hover:bg-muted"
                  >
                    <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                      <I className="size-5" />
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <textarea
            ref={ta}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => {
              const fs = Array.from(e.clipboardData.files);
              if (fs.length) {
                e.preventDefault();
                addFiles(fs);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={listening ? "Listening…" : "Ask anything, or solve a calculation…"}
            className="scrollbar-thin max-h-[200px] min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-[0.95rem] outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={toggleVoice}
            aria-label={listening ? "Stop voice input" : "Voice input"}
            className={cn("grid size-10 shrink-0 place-items-center rounded-full transition hover:bg-muted", listening && "animate-pulse bg-destructive text-destructive-foreground hover:bg-destructive")}
          >
            {listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>
          {busy ? (
            <button onClick={onStop} aria-label="Stop generating" className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground text-background">
              <Square className="size-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!text.trim() && !att.length}
              aria-label="Send"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition active:scale-90 disabled:opacity-40 disabled:shadow-none"
            >
              <ArrowUp className="size-5" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">AI can make mistakes. Check important results.</p>

      <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
      <input ref={files} type="file" accept={ACCEPT_FILES} multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
      <input ref={capture} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />

      {pad && (
        <CanvasPad
          mode={pad}
          onClose={() => setPad(null)}
          onRead={(url, prompt) => {
            setPad(null);
            addImage(url, prompt, pad === "write" ? "handwriting.png" : "drawing.png");
          }}
        />
      )}
      {cam && (
        <CameraDialog
          mode={cam}
          onClose={() => setCam(null)}
          onFallback={() => {
            setCam(null);
            capture.current?.click();
          }}
          onCapture={(url) => {
            const m = cam;
            setCam(null);
            addImage(
              url,
              m === "scan" ? "Scan this document: extract all its text and contents accurately (mark unclear text as (?)), then summarize or solve any questions." : undefined,
              m === "scan" ? "scan.jpg" : "photo.jpg",
            );
          }}
        />
      )}
    </div>
  );
}
