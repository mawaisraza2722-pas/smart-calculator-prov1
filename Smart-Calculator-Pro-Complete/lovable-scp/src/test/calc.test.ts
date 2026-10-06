import { describe, expect, it } from "vitest";
import { bmi, emi, percentage, tryLocalSolve } from "@/lib/calc/core";

describe("calculator engine", () => {
  it("15% of 850 is 127.5", () => expect(percentage("of", 15, 850).answer).toBe("127.5"));
  it("BMI for 70kg/175cm is 22.9 normal", () => expect(bmi(70, 175).answer).toBe("22.9 (Normal weight)"));
  it("EMI 500000 @12% for 24 months", () => expect(emi(500000, 12, 24).answer).toMatch(/^23,536\.\d+ per month/));
  it("solves simple questions on device", () => expect(tryLocalSolve("Calculate 15% of 850")?.answer).toBe("127.5"));
  it("leaves currency to the online tool", () => expect(tryLocalSolve("Convert 10 USD to PKR")).toBeNull());
});
