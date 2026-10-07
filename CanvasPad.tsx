import { useEffect, useRef, useState } from "react";
import { Eraser, Pen, ScanText, Trash2, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ["#111827", "#2563eb", "#dc2626", "#16a34a", "#f59e0b"];

export function CanvasPad({
  mode,
  onClose,
  onRead,
}: {
  mode: "write" | "draw";
  onClose: () => void;
  onRead: (dataUrl: string, prompt: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const history = useRef<ImageData[]>([]);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState<string>(COLORS[0]!);
  const [size, setSize] = useState(mode === "write" ? 3 : 4);
  const [, force] = useState(0);

  useEffect(() => {
    const c = canvas.current!;
    const fit = () => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const snap = c.width ? c.toDataURL() : null;
      c.width = r.width * dpr;
      c.height = r.height * dpr;
      const ctx = c.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (snap) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height);
        img.src = snap;
      }
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = (e: React.PointerEvent) => {
    const c = canvas.current!;
    c.setPointerCapture(e.pointerId);
    history.current.push(c.getContext("2d")!.getImageData(0, 0, c.width, c.height));
    if (history.current.length > 40) history.current.shift();
    drawing.current = true;
    last.current = pos(e);
    force((n) => n + 1);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvas.current!.getContext("2d")!;
    const p = pos(e);
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = tool === "eraser" ? size * 6 : size * (e.pressure ? 0.6 + e.pressure : 1);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const end = () => {
    drawing.current = false;
    last.current = null;
  };

  const undo = () => {
    const d = history.current.pop();
    if (d) canvas.current!.getContext("2d")!.putImageData(d, 0, 0);
    force((n) => n + 1);
  };
  const clear = () => {
    const c = canvas.current!;
    history.current.push(c.getContext("2d")!.getImageData(0, 0, c.width, c.height));
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    force((n) => n + 1);
  };
  const read = () => {
    const c = canvas.current!;
    const out = document.createElement("canvas");
    out.width = c.width;
    out.height = c.height;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(c, 0, 0);
    onRead(
      out.toDataURL("image/png"),
      mode === "write"
        ? "Read my handwriting exactly. Show what you detected, then answer or solve it."
        : "Analyze this drawing. Describe what you detect; if it contains math, a diagram or a question, solve or explain it.",
    );
  };

  const btn = "grid size-10 place-items-center rounded-xl transition hover:bg-muted";
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in">
      <div className="flex items-center gap-1 border-b px-2 py-2 sm:px-4">
        <button className={btn} onClick={onClose} aria-label="Close">
          <X className="size-5" />
        </button>
        <h2 className="ml-1 mr-auto text-base font-semibold">{mode === "write" ? "Writing pad" : "Draw pad"}</h2>
        <button className={cn(btn, tool === "pen" && "bg-accent text-accent-foreground")} onClick={() => setTool("pen")} aria-label="Pen">
          <Pen className="size-5" />
        </button>
        <button className={cn(btn, tool === "eraser" && "bg-accent text-accent-foreground")} onClick={() => setTool("eraser")} aria-label="Eraser">
          <Eraser className="size-5" />
        </button>
        <button className={btn} onClick={undo} disabled={!history.current.length} aria-label="Undo">
          <Undo2 className="size-5" />
        </button>
        <button className={btn} onClick={clear} aria-label="Clear">
          <Trash2 className="size-5" />
        </button>
      </div>
      <div className={cn("relative flex-1 touch-none", mode === "write" ? "paper-lines" : "bg-card")}>
        <canvas
          ref={canvas}
          className="absolute inset-0 size-full cursor-crosshair touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {mode === "draw" &&
          COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setTool("pen");
              }}
              aria-label={`Color ${c}`}
              className={cn("size-7 rounded-full border-2", color === c ? "border-primary scale-110" : "border-transparent")}
              style={{ background: c }}
            />
          ))}
        <input type="range" min={1} max={12} value={size} onChange={(e) => setSize(+e.target.value)} className="w-28 accent-primary" aria-label="Brush size" />
        <button onClick={read} className="ml-auto flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-glow active:scale-95">
          <ScanText className="size-5" /> {mode === "write" ? "Read" : "Analyze"}
        </button>
      </div>
    </div>
  );
}
