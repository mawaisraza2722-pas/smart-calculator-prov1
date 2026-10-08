import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { ChatApp } from "@/components/chat/ChatApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Calculator Pro AI — Chat, Solve & Scan" },
      { name: "description", content: "AI chat that solves math step by step, reads photos, handwriting and documents, in English, Urdu and Roman Urdu." },
      { property: "og:title", content: "Smart Calculator Pro AI" },
      { property: "og:description", content: "Solve math step by step, scan questions and chat with AI in English, Urdu and Roman Urdu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<div className="h-dvh bg-background" />}>
      <ChatApp />
    </ClientOnly>
  ),
});
