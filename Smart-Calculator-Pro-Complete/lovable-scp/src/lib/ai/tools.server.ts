import { tool } from "ai";
import { z } from "zod";
import * as calc from "@/lib/calc/core";

const safe = (fn: () => calc.CalcResult) => {
  try {
    return { ok: true as const, ...fn() };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Calculation failed" };
  }
};

// Every schema is strict-compatible: all keys required, optional values nullable.
export const calculatorTools = {
  calculate: tool({
    description: "Scientific/basic calculator. Evaluate a math expression exactly (supports sqrt, sin, cos, log, ^, factorial, pi, e).",
    inputSchema: z.object({ expression: z.string() }),
    execute: async ({ expression }) => safe(() => calc.calculate(expression)),
  }),
  percentage: tool({
    description: "Percentage calculator. mode 'of' = a% of b; 'what_percent' = a is what % of b; 'change' = % change from a to b.",
    inputSchema: z.object({ mode: z.enum(["of", "what_percent", "change"]), a: z.number(), b: z.number() }),
    execute: async ({ mode, a, b }) => safe(() => calc.percentage(mode, a, b)),
  }),
  bmi: tool({
    description: "BMI calculator. Convert to kg and cm first.",
    inputSchema: z.object({ weight_kg: z.number(), height_cm: z.number() }),
    execute: async (i) => safe(() => calc.bmi(i.weight_kg, i.height_cm)),
  }),
  emi: tool({
    description: "EMI / loan calculator. Ask for rate and tenure if the user didn't give them.",
    inputSchema: z.object({ principal: z.number(), annual_rate_percent: z.number(), tenure_months: z.number() }),
    execute: async (i) => safe(() => calc.emi(i.principal, i.annual_rate_percent, i.tenure_months)),
  }),
  age: tool({
    description: "Age calculator. Dates in YYYY-MM-DD. on_date null = today.",
    inputSchema: z.object({ birth_date: z.string(), on_date: z.string().nullable() }),
    execute: async (i) => safe(() => calc.age(i.birth_date, i.on_date)),
  }),
  discount: tool({
    description: "Discount calculator.",
    inputSchema: z.object({ price: z.number(), discount_percent: z.number() }),
    execute: async (i) => safe(() => calc.discount(i.price, i.discount_percent)),
  }),
  profit: tool({
    description: "Profit / loss calculator.",
    inputSchema: z.object({ cost_price: z.number(), selling_price: z.number() }),
    execute: async (i) => safe(() => calc.profit(i.cost_price, i.selling_price)),
  }),
  gst: tool({
    description: "GST / sales tax calculator. inclusive=true removes tax from a tax-inclusive amount.",
    inputSchema: z.object({ amount: z.number(), rate_percent: z.number(), inclusive: z.boolean() }),
    execute: async (i) => safe(() => calc.gst(i.amount, i.rate_percent, i.inclusive)),
  }),
  unit_convert: tool({
    description: "Unit converter (length, mass, volume, temperature as degC/degF/K, area, speed, data, time, energy...). Use mathjs unit names like km, mi, kg, lb, degC, degF, l, gal, m^2, km/h, GB.",
    inputSchema: z.object({ value: z.number(), from_unit: z.string(), to_unit: z.string() }),
    execute: async (i) => safe(() => calc.convertUnit(i.value, i.from_unit, i.to_unit)),
  }),
  date_calc: tool({
    description: "Date calculator. mode 'difference' between start_date and end_date (null = today); mode 'add' adds days (negative to subtract). Dates YYYY-MM-DD.",
    inputSchema: z.object({
      mode: z.enum(["difference", "add"]),
      start_date: z.string(),
      end_date: z.string().nullable(),
      days: z.number().nullable(),
    }),
    execute: async (i) => safe(() => calc.dateCalc(i.mode, i.start_date, i.end_date, i.days)),
  }),
  timezone_convert: tool({
    description: "Time zone converter. datetime as YYYY-MM-DDTHH:mm, IANA zones like Asia/Karachi, America/New_York.",
    inputSchema: z.object({ datetime: z.string(), from_timezone: z.string(), to_timezone: z.string() }),
    execute: async (i) => safe(() => calc.timezone(i.datetime, i.from_timezone, i.to_timezone)),
  }),
  currency_convert: tool({
    description: "Currency converter using a live exchange-rate source. ISO codes like USD, PKR, EUR.",
    inputSchema: z.object({ amount: z.number(), from: z.string(), to: z.string() }),
    execute: async ({ amount, from, to }) => {
      try {
        const f = from.toUpperCase();
        const t = to.toUpperCase();
        const res = await fetch(`https://open.er-api.com/v6/latest/${f}`);
        if (!res.ok) throw new Error("Rate service unavailable");
        const data = (await res.json()) as { result: string; rates: Record<string, number>; time_last_update_utc: string };
        const rate = data.rates?.[t];
        if (data.result !== "success" || !rate) throw new Error(`No rate for ${f}→${t}`);
        return {
          ok: true as const,
          tool: "Currency Converter",
          question: `${amount} ${f} to ${t}`,
          formula: "Result = Amount × Exchange rate",
          steps: [`1 ${f} = ${rate} ${t}`, `${amount} × ${rate} = ${(amount * rate).toFixed(2)}`],
          answer: `${(amount * rate).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${t}`,
          rate_updated: data.time_last_update_utc,
          source: "open.er-api.com (indicative mid-market rate)",
        };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Currency lookup failed" };
      }
    },
  }),
  create_file: tool({
    description:
      "Generate a downloadable file for the user (txt, md, csv, json, html, pdf). Put the COMPLETE file content in `content`. For pdf, write plain text/markdown-like content; it will be rendered into a PDF on the user's device.",
    inputSchema: z.object({
      filename: z.string(),
      format: z.enum(["txt", "md", "csv", "json", "html", "pdf"]),
      title: z.string().nullable(),
      content: z.string(),
    }),
    execute: async ({ filename, format }) => ({ ok: true, filename, format, note: "File is ready; the user sees a Download button." }),
  }),
};
