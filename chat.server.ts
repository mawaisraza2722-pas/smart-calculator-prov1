import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { calculatorTools } from "./tools.server";

const AIMLAPI_BASE_URL = "https://api.aimlapi.com/v1";

// Models available through AIMLAPI's OpenAI-compatible chat-completions API.
export const PROVIDER_MODELS = {
  claude: "anthropic/claude-sonnet-5.5",
  chatgpt: "openai/gpt-5-chat-latest",
  gemini: "google/gemini-3.5-flash-lite",
  auto: "openai/gpt-5.5",
} as const;

const bodySchema = z.object({
  messages: z.array(z.any()),
  provider: z.enum(["claude", "chatgpt", "gemini", "auto"]).default("auto"),
  timezone: z.string().optional(),
});

function systemPrompt(tz?: string) {
  const now = new Date().toLocaleString("en-US", {
    timeZone: tz || "UTC",
    dateStyle: "full",
    timeStyle: "short",
  });
  return `You are "Smart Calculator Pro AI", the assistant inside the Smart Calculator Pro app.
Current date/time for the user: ${now} (${tz || "UTC"}).

LANGUAGE: Understand English, Urdu (اردو) and Roman Urdu. Reply in the same language/script the user writes in.

STYLE: Clear, well-structured Markdown. Short by default; detailed when the user asks for detail. Use LaTeX with $...$ or $$...$$ for math, tables for tabular data.

HONESTY: Never invent facts. If information is uncertain, outdated or unverifiable, say so plainly.

CALCULATIONS: Always use the calculator tools (calculate, percentage, bmi, emi, age, discount, profit, gst, unit_convert, date_calc, timezone_convert, currency_convert) instead of mental math whenever a tool fits. Never guess numbers. If required inputs are missing, ask briefly. Present calculation answers as: **Question** → **Formula** → **Steps** → **Answer**.

IMAGES & DOCUMENTS: When given an image or file, first write a short "🔍 Detected" section listing what you see/read. Mark unreadable words as "(?)" — never fill them in. Then answer/solve.

APP TOOLS available to the user: Basic & Scientific Calculator, Unit Converter, Currency Converter, Percentage, Age, BMI, Discount, Profit, EMI/Loan, GST/Tax, Date & Time, Time Zone Converter, AI Chat, Draw Pad.`;
}

function friendlyError(error: unknown): string {
  const e = error as { statusCode?: number; status?: number; message?: string };
  const status = e?.statusCode ?? e?.status;
  if (status === 401) return "AIMLAPI key is missing or invalid. Add AIMLAPI_KEY in your deployment environment variables.";
  if (status === 402) return "AIMLAPI credits are unavailable. Please check your AIMLAPI account/balance.";
  if (status === 429) return "Too many requests right now. Please wait a moment and try again.";
  if (status === 400) return "The AI couldn't process this request. The file/image may be unsupported or too large.";
  console.error("AIMLAPI error", error);
  return "Something went wrong reaching the AI. Please try again.";
}

export async function handleChat(request: Request): Promise<Response> {
  const apiKey = process.env.AIMLAPI_KEY;
  if (!apiKey) return new Response("AI is not configured on the server. Add AIMLAPI_KEY to the deployment environment variables.", { status: 500 });

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return new Response("Invalid request", { status: 400 });
  }

  const messages = parsed.messages as UIMessage[];
  const provider = parsed.provider;
  const modelId = PROVIDER_MODELS[provider];

  // AIMLAPI exposes an OpenAI-compatible chat-completions endpoint.
  // The secret stays server-side in AIMLAPI_KEY and is never sent to the browser.
  const openai = createOpenAI({
    baseURL: AIMLAPI_BASE_URL,
    apiKey,
  });

  const model = openai.chat(modelId);

  const result = streamText({
    model,
    system: systemPrompt(parsed.timezone),
    messages: await convertToModelMessages(messages),
    tools: calculatorTools,
    stopWhen: stepCountIs(8),
    abortSignal: request.signal,
    maxRetries: 0,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    messageMetadata: ({ part }) => (part.type === "start" ? { source: provider, model: modelId } : undefined),
    onError: friendlyError,
  });
}
