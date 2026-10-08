import { useEffect } from "react";
import { Check, Download, Loader2, Moon, Sun, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { PROVIDER_LABELS, updateSettings, useSettings, type Provider } from "@/lib/chat/settings";
import { LOCAL_MODELS, loadLocal, refreshCache, removeLocal, useLocalAI, webgpuSupported, type LocalSize } from "@/lib/ai/local-llm";
import { cn } from "@/lib/utils";

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useSettings();
  const local = useLocalAI();
  useEffect(() => {
    if (open) refreshCache();
  }, [open]);
  const busy = local.status === "downloading" || local.status === "preparing";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scrollbar-thin max-h-[90dvh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">AI Provider</h3>
          {(["claude", "chatgpt", "gemini", "auto"] as Provider[]).map((p) => (
            <button
              key={p}
              onClick={() => updateSettings({ provider: p })}
              className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition", s.provider === p ? "border-primary bg-accent/50" : "hover:bg-muted")}
            >
              <div className="flex-1">
                <div className="text-sm font-semibold">{PROVIDER_LABELS[p].name}</div>
                <div className="text-xs text-muted-foreground">{PROVIDER_LABELS[p].desc}</div>
              </div>
              {s.provider === p && <Check className="size-5 text-primary" />}
            </button>
          ))}
          <p className="text-xs text-muted-foreground">Online AI runs securely on our server — no API key needed. Usage is limited by the app's AI credits, it isn't unlimited.</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Offline AI</h3>
          {!webgpuSupported() ? (
            <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">Offline AI unavailable — this browser/device doesn't support WebGPU (try latest Chrome on desktop or a recent Android).</p>
          ) : (
            <>
              {(Object.keys(LOCAL_MODELS) as LocalSize[]).map((k) => {
                const m = LOCAL_MODELS[k];
                const isActive = local.active === k;
                return (
                  <div key={k} className="space-y-2 rounded-2xl border p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{m.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.size} · {isActive && local.status === "ready" ? "Ready Offline" : local.cached[k] ? "Downloaded" : "Not downloaded"}
                        </div>
                      </div>
                      <button
                        disabled={busy || (isActive && local.status === "ready")}
                        onClick={() => loadLocal(k)}
                        className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {busy && isActive ? <Loader2 className="size-4 animate-spin" /> : isActive && local.status === "ready" ? <Check className="size-4" /> : <Download className="size-4" />}
                        {isActive && local.status === "ready" ? "Active" : local.cached[k] ? "Load" : `Download ${m.label}`}
                      </button>
                      {local.cached[k] && (
                        <button disabled={busy} onClick={() => removeLocal(k)} className="rounded-xl p-2 text-muted-foreground hover:bg-muted" aria-label="Remove">
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                    {isActive && busy && (
                      <div className="space-y-1">
                        <Progress value={local.progress * 100} />
                        <p className="text-xs text-muted-foreground">
                          {local.status === "downloading" ? "Downloading…" : "Preparing AI…"} {Math.round(local.progress * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
              {local.status === "error" && <p className="text-xs text-destructive">{local.text}</p>}
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>
                  Prefer offline AI in Auto mode
                  <span className="block text-xs text-muted-foreground">Offline AI is always used when there's no internet.</span>
                </span>
                <Switch checked={s.preferOffline} onCheckedChange={(v) => updateSettings({ preferOffline: v })} />
              </label>
            </>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">General</h3>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              Instant calculator answers
              <span className="block text-xs text-muted-foreground">Solve simple math on your device first (Auto mode).</span>
            </span>
            <Switch checked={s.localSolve} onCheckedChange={(v) => updateSettings({ localSolve: v })} />
          </label>
          <div className="flex items-center justify-between text-sm">
            <span>Theme</span>
            <div className="flex rounded-xl bg-muted p-1">
              {(["dark", "light"] as const).map((t) => (
                <button key={t} onClick={() => updateSettings({ theme: t })} className={cn("flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs", s.theme === t && "bg-card shadow")}>
                  {t === "dark" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />} {t === "dark" ? "Dark" : "Light"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Voice language</span>
            <div className="flex rounded-xl bg-muted p-1">
              {(["en-US", "ur-PK"] as const).map((l) => (
                <button key={l} onClick={() => updateSettings({ voiceLang: l })} className={cn("rounded-lg px-3 py-1.5 text-xs", s.voiceLang === l && "bg-card shadow")}>
                  {l === "en-US" ? "English" : "اردو"}
                </button>
              ))}
            </div>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
