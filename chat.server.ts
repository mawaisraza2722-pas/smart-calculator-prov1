import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { calculatorTools } from "./tools.server";

const AIMLAPI_BASE_URL = "https://api.aimlapi.com/v1";

// AIMLAPI is OpenAI-compatible. The key is read only on the server, so it is
// never shipped to the browser. Keep model IDs here so the UI can keep its
// existing provider selector without exposing provider credentials.
export const PROVIDER_MODELS = {
  claude: "anthropic/claude-sonnet-4.6",
  chatgpt: "openai/gpt-5-5",
  gemini: "google/gemini-3.7-flash",
  auto: "openai/gpt-5-5",
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

HONESTY: Never invent facts. If information is uncertain, outdated or unverifiable, say so plainly.

CALCULATIONS: Always use the calculator tools (calculate, percentage, bmi, emi, age, discount, profit, gst, unit_convert, date_calc, timezone_convert, currency_convert) instead of mental math whenever a tool fits. Never guess numbers. If required inputs are missing (e.g. EMI interest rate or tenure), ask for them briefly. Present calculation answers as:
**Question** → **Formula** → **Steps** (numbered) → **Answer**. Explain in simple language.

IMAGES & DOCUMENTS: When given an image or file, first write a short "🔍 Detected" section listing what you see/read (text, handwriting, equations, tables, charts). Mark unreadable words as "(?)" — never fill them in. Then answer/solve. For file contents provided as text blocks, summarize, extract and analyze as asked.

FILES: When the user asks to create/make/export a file (PDF, TXT, CSV, report, notes...), call create_file with the complete content, then briefly describe it. Don't paste the whole file again in chat.

APP TOOLS available to the user: Basic & Scientific Calculator, Unit Converter, Currency Converter, Percentage, Age, BMI, Discount, Profit, EMI/Loan, GST/Tax, Date & Time, Time Zone Converter, AI Chat, Draw Pad.`;
}

function friendlyError(error: unknown): string {
  const e = error as { statusCode?: number; status?: number; message?: string; responseBody?: string };
  const status = e?.statusCode ?? e?.status;
  if (status === 401) return "AIMLAPI key invalid or expired. Check the AIMLAPI_KEY environment variable.";
  if (status === 402) return "AIMLAPI has no available credits for this request. Check your AIMLAPI account balance/plan.";
  if (status === 403) return "AIMLAPI refused this request. Check that the API key is active and the selected model is available to your account.";
  if (status === 429) return "AIMLAPI rate limit reached. Please wait a moment and try again.";
  if (status === 400) return "AIMLAPI could not process this request. The image/file may be unsupported or too large.";
  console.error("AIMLAPI error", error);
  return "Something went wrong reaching AIMLAPI. Please try again.";
}

export async function handleChat(request: Request): Promise<Response> {
  // Read the secret per request. Never put this value in client code or a VITE_ variable.
  const apiKey = process.env["AIMLAPI_KEY"];
  if (!apiKey) return new Response("AIMLAPI is not configured on the server.", { status: 500 });

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return new Response("Invalid request", { status: 400 });
  }

  const messages = parsed.messages as UIMessage[];
  const modelId = PROVIDER_MODELS[parsed.provider];
  const aimlapi = createOpenAICompatible({
    name: "aimlapi",
    baseURL: AIMLAPI_BASE_URL,
    apiKey,
  });
  const model = aimlapi(modelId);

  try {
    const result = streamText({
      model,
      system: systemPrompt(parsed.timezone),
      messages: await convertToModelMessages(messages),
      tools: calculatorTools,
      stopWhen: stepCountIs(8),
      abortSignal: request.signal,
      maxRetries: 0,
      maxOutputTokens: 16000,
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      messageMetadata: ({ part }) => (part.type === "start" ? { source: parsed.provider, model: modelId } : undefined),
      onError: friendlyError,
    });
  } catch (error) {
    console.error("AIMLAPI request failed", error);
    return new Response(friendlyError(error), { status: 502 });
  }
}
