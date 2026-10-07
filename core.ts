// Pure calculator engine shared by the chat's local fast path and the AI tools.
import { evaluate, format as mfmt, unit } from "mathjs";

export interface CalcResult {
  tool: string;
  question: string;
  formula: string;
  steps: string[];
  answer: string;
}

const n = (v: number, d = 2) =>
  Number.isFinite(v) ? Number(v.toFixed(d)).toLocaleString("en-US", { maximumFractionDigits: d }) : String(v);

export function percentage(mode: "of" | "what_percent" | "change", a: number, b: number): CalcResult {
  if (mode === "of") {
    const r = (a / 100) * b;
    return {
      tool: "Percentage Calculator",
      question: `${a}% of ${b}`,
      formula: "Result = (Percentage ÷ 100) × Value",
      steps: [`${a} ÷ 100 = ${a / 100}`, `${a / 100} × ${b} = ${n(r, 4)}`],
      answer: n(r, 4),
    };
  }
  if (mode === "what_percent") {
    const r = (a / b) * 100;
    return {
      tool: "Percentage Calculator",
      question: `${a} is what percent of ${b}?`,
      formula: "Percent = (Part ÷ Whole) × 100",
      steps: [`${a} ÷ ${b} = ${n(a / b, 6)}`, `${n(a / b, 6)} × 100 = ${n(r, 4)}%`],
      answer: `${n(r, 4)}%`,
    };
  }
  const r = ((b - a) / a) * 100;
  return {
    tool: "Percentage Calculator",
    question: `Percentage change from ${a} to ${b}`,
    formula: "Change % = ((New − Old) ÷ Old) × 100",
    steps: [`${b} − ${a} = ${b - a}`, `${b - a} ÷ ${a} = ${n((b - a) / a, 6)}`, `× 100 = ${n(r, 4)}%`],
    answer: `${r >= 0 ? "+" : ""}${n(r, 4)}%`,
  };
}

export function bmi(weightKg: number, heightCm: number): CalcResult {
  const m = heightCm / 100;
  const v = weightKg / (m * m);
  const cat = v < 18.5 ? "Underweight" : v < 25 ? "Normal weight" : v < 30 ? "Overweight" : "Obese";
  return {
    tool: "BMI Calculator",
    question: `BMI for ${weightKg} kg and ${heightCm} cm`,
    formula: "BMI = weight (kg) ÷ height (m)²",
    steps: [`Height = ${heightCm} ÷ 100 = ${m} m`, `${m}² = ${n(m * m, 4)}`, `${weightKg} ÷ ${n(m * m, 4)} = ${n(v, 1)}`],
    answer: `${n(v, 1)} (${cat})`,
  };
}

export function emi(principal: number, annualRate: number, months: number): CalcResult {
  const r = annualRate / 12 / 100;
  const e = r === 0 ? principal / months : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const total = e * months;
  return {
    tool: "EMI / Loan Calculator",
    question: `EMI for ${n(principal)} at ${annualRate}% for ${months} months`,
    formula: "EMI = P × r × (1+r)ⁿ ÷ ((1+r)ⁿ − 1)",
    steps: [
      `P = ${n(principal)}, monthly rate r = ${annualRate} ÷ 12 ÷ 100 = ${n(r, 6)}, n = ${months}`,
      `(1+r)ⁿ = ${n(Math.pow(1 + r, months), 6)}`,
      `EMI = ${n(e)}`,
      `Total payment = ${n(e)} × ${months} = ${n(total)}`,
      `Total interest = ${n(total - principal)}`,
    ],
    answer: `${n(e)} per month (total interest ${n(total - principal)})`,
  };
}

export function age(birth: string, on?: string | null): CalcResult {
  const b = new Date(birth);
  const t = on ? new Date(on) : new Date();
  if (isNaN(b.getTime()) || isNaN(t.getTime())) throw new Error("Invalid date");
  let y = t.getFullYear() - b.getFullYear();
  let m = t.getMonth() - b.getMonth();
  let d = t.getDate() - b.getDate();
  if (d < 0) {
    m -= 1;
    d += new Date(t.getFullYear(), t.getMonth(), 0).getDate();
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  const days = Math.floor((t.getTime() - b.getTime()) / 86400000);
  return {
    tool: "Age Calculator",
    question: `Age for birth date ${b.toDateString()} on ${t.toDateString()}`,
    formula: "Age = Target date − Birth date (in years, months, days)",
    steps: [`Years: ${y}`, `Months: ${m}`, `Days: ${d}`, `Total days lived: ${days.toLocaleString()}`],
    answer: `${y} years, ${m} months, ${d} days`,
  };
}

export function discount(price: number, pct: number): CalcResult {
  const off = (price * pct) / 100;
  return {
    tool: "Discount Calculator",
    question: `${pct}% discount on ${n(price)}`,
    formula: "Final price = Price − (Price × Discount% ÷ 100)",
    steps: [`Discount = ${n(price)} × ${pct} ÷ 100 = ${n(off)}`, `Final = ${n(price)} − ${n(off)} = ${n(price - off)}`],
    answer: `${n(price - off)} (you save ${n(off)})`,
  };
}

export function profit(cost: number, selling: number): CalcResult {
  const p = selling - cost;
  const pct = (p / cost) * 100;
  const margin = (p / selling) * 100;
  return {
    tool: "Profit Calculator",
    question: `Cost ${n(cost)}, selling ${n(selling)}`,
    formula: "Profit = SP − CP; Profit % = Profit ÷ CP × 100; Margin = Profit ÷ SP × 100",
    steps: [`Profit = ${n(selling)} − ${n(cost)} = ${n(p)}`, `Profit % = ${n(pct)}%`, `Margin = ${n(margin)}%`],
    answer: `${p >= 0 ? "Profit" : "Loss"} of ${n(Math.abs(p))} (${n(pct)}%)`,
  };
}

export function gst(amount: number, rate: number, inclusive: boolean): CalcResult {
  if (inclusive) {
    const base = amount / (1 + rate / 100);
    return {
      tool: "GST / Tax Calculator",
      question: `Remove ${rate}% tax from ${n(amount)}`,
      formula: "Base = Amount ÷ (1 + rate/100)",
      steps: [`Base = ${n(amount)} ÷ ${1 + rate / 100} = ${n(base)}`, `Tax = ${n(amount)} − ${n(base)} = ${n(amount - base)}`],
      answer: `Base ${n(base)}, tax ${n(amount - base)}`,
    };
  }
  const tax = (amount * rate) / 100;
  return {
    tool: "GST / Tax Calculator",
    question: `Add ${rate}% tax to ${n(amount)}`,
    formula: "Tax = Amount × rate/100; Total = Amount + Tax",
    steps: [`Tax = ${n(amount)} × ${rate} ÷ 100 = ${n(tax)}`, `Total = ${n(amount + tax)}`],
    answer: `Total ${n(amount + tax)} (tax ${n(tax)})`,
  };
}

export function convertUnit(value: number, from: string, to: string): CalcResult {
  const r = unit(value, from).toNumber(to);
  return {
    tool: "Unit Converter",
    question: `Convert ${value} ${from} to ${to}`,
    formula: `${from} → ${to}`,
    steps: [`1 ${from} = ${mfmt(unit(1, from).toNumber(to), { precision: 8 })} ${to}`, `${value} × that factor = ${mfmt(r, { precision: 8 })}`],
    answer: `${mfmt(r, { precision: 8 })} ${to}`,
  };
}

export function dateCalc(mode: "difference" | "add", start: string, end?: string | null, days?: number | null): CalcResult {
  const s = new Date(start);
  if (isNaN(s.getTime())) throw new Error("Invalid start date");
  if (mode === "add") {
    const d = days ?? 0;
    const r = new Date(s.getTime() + d * 86400000);
    return {
      tool: "Date & Time Calculator",
      question: `${s.toDateString()} ${d >= 0 ? "+" : "−"} ${Math.abs(d)} days`,
      formula: "Result = Start date + days",
      steps: [`Start: ${s.toDateString()}`, `Add ${d} days`],
      answer: r.toDateString(),
    };
  }
  const e = end ? new Date(end) : new Date();
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
  return {
    tool: "Date & Time Calculator",
    question: `Days between ${s.toDateString()} and ${e.toDateString()}`,
    formula: "Days = (End − Start) ÷ 86,400,000 ms",
    steps: [`Difference = ${diff} days`, `≈ ${n(diff / 7, 2)} weeks`, `≈ ${n(diff / 30.4375, 2)} months`],
    answer: `${diff} days`,
  };
}

function tzOffsetMinutes(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return (asUTC - date.getTime()) / 60000;
}

export function timezone(datetime: string, fromTz: string, toTz: string): CalcResult {
  const naive = new Date(datetime.replace(/Z$/, "") + "Z");
  if (isNaN(naive.getTime())) throw new Error("Invalid date/time");
  const off = tzOffsetMinutes(naive, fromTz);
  const utc = new Date(naive.getTime() - off * 60000);
  const out = new Intl.DateTimeFormat("en-US", { timeZone: toTz, dateStyle: "medium", timeStyle: "short" }).format(utc);
  return {
    tool: "Time Zone Converter",
    question: `${datetime} in ${fromTz} → ${toTz}`,
    formula: "Target = Source time − source UTC offset + target UTC offset",
    steps: [`${fromTz} offset: UTC${off >= 0 ? "+" : ""}${off / 60}`, `UTC time: ${utc.toISOString()}`],
    answer: `${out} (${toTz})`,
  };
}

export function calculate(expression: string): CalcResult {
  const clean = expression.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  const r = evaluate(clean);
  const out = typeof r === "number" ? mfmt(r, { precision: 12 }) : String(r);
  return {
    tool: "Scientific Calculator",
    question: expression,
    formula: clean,
    steps: [`Evaluate ${clean} (standard order of operations)`],
    answer: out,
  };
}

export function toMarkdown(r: CalcResult) {
  return [
    `**${r.tool}**`,
    "",
    `**Question:** ${r.question}`,
    "",
    `**Formula:** ${r.formula}`,
    "",
    `**Steps:**`,
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    `### Answer: ${r.answer}`,
  ].join("\n");
}

/** Instant on-device answers for common, unambiguous questions. Returns null when unsure. */
export function tryLocalSolve(input: string): CalcResult | null {
  const t = input.trim().toLowerCase().replace(/,/g, "");
  try {
    let m = t.match(/^(?:what\s+is\s+|calculate\s+|find\s+)?([\d.]+)\s*%\s*(?:of)\s*([\d.]+)\s*\??$/);
    if (m) return percentage("of", +m[1]!, +m[2]!);
    m = t.match(/^(?:what\s+is\s+)?([\d.]+)\s+is\s+what\s+(?:percent|%)\s+of\s+([\d.]+)\s*\??$/);
    if (m) return percentage("what_percent", +m[1]!, +m[2]!);
    if (/\bbmi\b/.test(t)) {
      const kg = t.match(/([\d.]+)\s*kg/);
      const cm = t.match(/([\d.]+)\s*cm/);
      if (kg && cm) return bmi(+kg[1]!, +cm[1]!);
    }
    m = t.match(/^(?:convert\s+)?([\d.]+)\s*([a-z°]+)\s+(?:to|in|into)\s+([a-z°]+)\s*\??$/);
    if (m && !/^(usd|pkr|eur|gbp|inr|aed|sar|cad|aud|jpy|cny)$/.test(m[2]!)) {
      try {
        return convertUnit(+m[1]!, m[2]!, m[3]!);
      } catch {
        /* not a unit */
      }
    }
    const expr = t.replace(/^(what\s+is|calculate|solve|evaluate)\s+/, "").replace(/[=?]\s*$/, "").trim();
    if (
      /^[\d\s+\-*/^().%!×÷−]+$|^[\d\s+\-*/^().!a-z×÷−]*(sqrt|sin|cos|tan|log|ln|pi|abs|exp)[\d\s+\-*/^().!a-z×÷−]*$/.test(expr) &&
      /\d/.test(expr) &&
      /[+\-*/^!×÷−]|sqrt|sin|cos|tan|log|abs|exp/.test(expr)
    ) {
      const r = calculate(expr.replace(/\bln\(/g, "log("));
      if (r.answer && !/function|undefined|NaN/.test(r.answer)) return r;
    }
  } catch {
    return null;
  }
  return null;
}
