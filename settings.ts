import { useSyncExternalStore } from "react";

export type Provider = "claude" | "chatgpt" | "gemini" | "auto";
export interface Settings {
  provider: Provider;
  theme: "dark" | "light";
  preferOffline: boolean;
  voiceLang: "en-US" | "ur-PK";
  localSolve: boolean;
}

const KEY = "scp-ai-settings";
const defaults: Settings = { provider: "auto", theme: "dark", preferOffline: false, voiceLang: "en-US", localSolve: true };
let state: Settings = defaults;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    state = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    /* ignore */
  }
}

export function getSettings() {
  load();
  return state;
}

export function updateSettings(patch: Partial<Settings>) {
  load();
  state = { ...state, ...patch };
  localStorage.setItem(KEY, JSON.stringify(state));
  subs.forEach((f) => f());
}

export function useSettings() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    getSettings,
    () => defaults,
  );
}

export const PROVIDER_LABELS: Record<Provider, { name: string; desc: string }> = {
  auto: { name: "Auto AI", desc: "Calculator first, offline AI if chosen, then the best online AI" },
  claude: { name: "AI 1 — Claude", desc: "Great for long explanations and writing" },
  chatgpt: { name: "AI 2 — ChatGPT", desc: "Strong reasoning, math and images" },
  gemini: { name: "AI 3 — Gemini", desc: "Fast, good with images and documents" },
};
