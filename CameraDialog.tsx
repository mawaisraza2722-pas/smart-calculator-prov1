import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCcw, X } from "lucide-react";

/** Live camera capture. In "scan" mode the photo is enhanced (grayscale + contrast) like a document scanner. */
export function CameraDialog({
  mode,
  onClose,
  onCapture,
  onFallback,
}: {
  mode: "camera" | "scan";
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  onFallback: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 } }, audio: false });
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
        }
      } catch {
        setErr("Camera access is blocked or unavailable.");
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [facing]);

  const snap = () => {
    const v = video.current!;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    if (mode === "scan") ctx.filter = "grayscale(1) contrast(1.6) brightness(1.1)";
    ctx.drawImage(v, 0, 0);
    onCapture(c.toDataURL("image/jpeg", 0.92));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 px-3 py-2">
        <button className="grid size-10 place-items-center rounded-xl hover:bg-muted" onClick={onClose} aria-label="Close">
          <X className="size-5" />
        </button>
        <h2 className="font-semibold">{mode === "scan" ? "Scan document" : "Camera"}</h2>
      </div>
      <div className="relative flex-1 overflow-hidden bg-surface">
        {err ? (
          <div className="grid h-full place-items-center p-6 text-center">
            <div className="space-y-4">
              <p className="text-muted-foreground">{err}</p>
              <button onClick={onFallback} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground">
                Choose a photo instead
              </button>
            </div>
          </div>
        ) : (
          <>
            <video ref={video} playsInline muted className="size-full object-cover" />
            {mode === "scan" && <div className="pointer-events-none absolute inset-8 rounded-3xl border-2 border-dashed border-primary/80" />}
          </>
        )}
      </div>
      {!err && (
        <div className="flex items-center justify-center gap-10 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="size-11" />
          <button onClick={snap} aria-label="Capture" className="grid size-18 place-items-center rounded-full border-4 border-primary bg-primary/20 active:scale-95">
            <Camera className="size-7 text-primary" />
          </button>
          <button onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} aria-label="Switch camera" className="grid size-11 place-items-center rounded-full bg-muted">
            <RefreshCcw className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
