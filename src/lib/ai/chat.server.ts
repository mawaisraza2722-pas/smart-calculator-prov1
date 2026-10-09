import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { calculatorTools } from "./tools.server";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "./run-id.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

// Provider registry — swap models here without touching the UI.
export const PROVIDER_MODELS = {
  claude: "anthropic/claude-sonnet-5",
  chatgpt: "openai/gpt-6-astra",
  gemini: "google/gemini-3.8-flash",
  auto: "openai/gpt-6-astra",
} as const;

const bodySchema = z.object({
  messages: z.array(z.any()),
  provider: z.enum(["claude", "chatgpt", "gemini", "auto"]).default("auto"),
  timezone: z.string().optional(),
});

function systemPrompt(tz?: string) {
  const now = new Date().toLocaleString("en-US", { timeZone: tz || "UTC", dateStyle: "full", timeStyle: "short" });
  return `You are "Smart Calculator Pro AI", the assistant inside the Smart Calculator Pro app.
Current date/time for the user: ${now} (${tz || "UTC"}).

LANGUAGE: Understand English, Urdu (اردو) and Roman Urdu. Reply in the same language/script the user writes in.

STYLE: Clear, well-structured Markdown. Short by default; detailed when the user asks for detail. Use LaTeX with $...$ or $$...$$ for math, tables for tabular data.

HONESTY: Never invent facts. If information is uncertain, outdated or unverifiable, say so plainly. You have no web browsing except the currency tool.

CALCULATIONS: Always use the calculator tools (calculate, percentage, bmi, emi, age, discount, profit, gst, unit_convert, date_calc, timezone_convert, currency_convert) instead of mental math whenever a tool fits. Never guess numbers. If required inputs are missing (e.g. EMI interest rate or tenure), ask for them briefly. Present calculation answers as:
**Question** → **Formula** → **Steps** (numbered) → **Answer**. Explain in simple language.

IMAGES & DOCUMENTS: When given an image or file, first write a short "🔍 Detected" section listing what you see/read (text, handwriting, equations, tables, charts). Mark unreadable words as "(?)" — never fill them in. Then answer/solve. For file contents provided as text blocks, summarize, extract and analyze as asked.

FILES: When the user asks to create/make/export a file (PDF, TXT, CSV, report, notes...), call create_file with the complete content, then briefly describe it. Don't paste the whole file again in chat.

APP TOOLS available to the user: Basic & Scientific Calculator, Unit Converter, Currency Converter, Percentage, Age, BMI, Discount, Profit, EMI/Loan, GST/Tax, Date & Time, Time Zone Converter, AI Chat, Draw Pad.`;
}

function friendlyError(error: unknown): string {
  const e = error as { statusCode?: number; message?: string; responseBody?: string };
  const status = e?.statusCode;
  if (status === 402) return "AI credits are used up for this workspace. Please add credits to continue using online AI.";
  if (status === 429) return "Too many requests right now. Please wait a moment and try again.";
  if (status === 403) return "This AI provider refused the request or is not available. Try another provider in Settings.";
  if (status === 400) return "The AI couldn't process this request (the file may be unsupported or too large).";
  console.error("AI error", error);
  return "Something went wrong reaching the AI. Please try again.";
}

export async function handleChat(request: Request): Promise<Response> {

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return new Response("Invalid request", { status: 400 });
  }
  const messages = parsed.messages as UIMessage[];
  const provider = parsed.provider;
  const apiKey =
    provider === "gemini"
        ? process.env["GEMINI_API_KEY"]
            : process.env["LOVABLE_API_KEY"];

            if (!apiKey) {
              return new Response("AI API key is missing on the server.", {
                  status: 500,
                    });
                    }
  const modelId = PROVIDER_MODELS[provider];
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));

  let model;
  let providerOptions: Record<string, Record<string, unknown>> = {};
  let extra: { maxOutputTokens?: number } = {};

  if (provider === "claude") {
    const anthropic = createAnthropic({
      baseURL: GATEWAY,
      apiKey,
      headers: { "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    model = anthropic(modelId);
    extra = { maxOutputTokens: 16000 };
  } else if (provider === "gemini") {
      const google = createGoogleGenerativeAI({
          apiKey,
            });
              model = google("gemini-2.5-flash");
  } else {
    const openai = createOpenAI({
      baseURL: GATEWAY,
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    model = openai.responses(modelId);
    providerOptions = {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    };
  }

  const result = streamText({
    model,
    system: systemPrompt(parsed.timezone),
    messages: await convertToModelMessages(messages),
    tools: calculatorTools,
    stopWhen: stepCountIs(8),
    abortSignal: request.signal,
    maxRetries: 0,
    providerOptions: providerOptions as never,
    ...extra,
  });

  return withLovableAiGatewayRunIdHeader(
    result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      messageMetadata: ({ part }) => (part.type === "start" ? { source: provider, model: modelId } : undefined),
      onError: friendlyError,
    }),
    runIdFetch,
  );
}
