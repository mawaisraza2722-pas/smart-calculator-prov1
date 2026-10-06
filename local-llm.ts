// On-device AI via WebLLM (WebGPU). Loaded lazily so it never affects first page load.
import { useSyncExternalStore } from "react";

export type LocalSize = "small" | "large";
export const LOCAL_MODELS: Record<LocalSize, { id: string; label: string; size: string }> = {
  small: { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Small AI", size: "≈ 0.4 GB" },
  large: { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", label: "Large AI", size: "≈ 1.8 GB" },
};

export type LocalStatus = "idle" | "downloading" | "preparing" | "ready" | "unavailable" | "error";
interface State {
  status: LocalStatus;
  progress: number;
  text: string;
  active: LocalSize | null;
  cached: Record<LocalSize, boolean>;
}

let state: State = { status: "idle", progress: 0, text: "", active: null, cached: { small: false, large: false } };
const subs = new Set<() => void>();
const setState = (p: Partial<State>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let engine: any = null;

export const webgpuSupported = () => typeof navigator !== "undefined" && "gpu" in navigator;

export function useLocalAI() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
    () => state,
  );
}

export async function refreshCache() {
  if (!webgpuSupported()) {
    setState({ status: "unavailable" });
    return;
  }
  try {
    const w = await import("@mlc-ai/web-llm");
    const cached = {
      small: await w.hasModelInCache(LOCAL_MODELS.small.id),
      large: await w.hasModelInCache(LOCAL_MODELS.large.id),
    };
    setState({ cached });
  } catch {
    /* ignore */
  }
}

export async function loadLocal(size: LocalSize) {
  if (!webgpuSupported()) {
    setState({ status: "unavailable", text: "This browser/device doesn't support WebGPU." });
    return;
  }
  try {
    setState({ status: "downloading", progress: 0, text: "Starting…", active: size });
    const w = await import("@mlc-ai/web-llm");
    if (engine) await engine.unload?.();
    engine = await w.CreateMLCEngine(LOCAL_MODELS[size].id, {
      initProgressCallback: (r: { progress: number; text: string }) => {
        const fetching = /fetch|download/i.test(r.text) && r.progress < 1;
        setState({ status: fetching ? "downloading" : "preparing", progress: r.progress, text: r.text });
      },
    });
    setState({ status: "ready", progress: 1, text: "", cached: { ...state.cached, [size]: true } });
  } catch (e) {
    engine = null;
    setState({ status: "error", text: e instanceof Error ? e.message : "Failed to load offline AI" });
  }
}

export async function removeLocal(size: LocalSize) {
  const w = await import("@mlc-ai/web-llm");
  if (state.active === size && engine) {
    await engine.unload?.();
    engine = null;
    setState({ status: "idle", active: null });
  }
  await w.deleteModelAllInfoInCache(LOCAL_MODELS[size].id);
  setState({ cached: { ...state.cached, [size]: false } });
}

export const localReady = () => state.status === "ready" && !!engine;

export async function localChat(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  onDelta: (t: string) => void,
) {
  if (!engine) throw new Error("Offline AI not loaded");
  const stream = await engine.chat.completions.create({ messages, stream: true, temperature: 0.4 });
  for await (const chunk of stream) {
    const d = chunk.choices?.[0]?.delta?.content;
    if (d) onDelta(d);
  }
}

export const stopLocal = () => engine?.interruptGenerate?.();
