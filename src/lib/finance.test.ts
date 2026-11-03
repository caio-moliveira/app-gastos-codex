import { describe, expect, it } from "vitest";
import { budgetStatus, formatBRL, summarize, toCents, toDecimal } from "./finance";

describe("exact money", () => {
  it("adds decimal fractions without floating point drift", () => {
    expect(toDecimal(toCents("0.10") + toCents("0.20"))).toBe("0.30");
    expect(toDecimal(-1n)).toBe("-0.01");
    expect(toCents("999999999999.99")).toBe(99_999_999_999_999n);
    expect(formatBRL(120000n)).toBe("R$\u00a01.200,00");
  });

  it.each(["-1", "1.001", "1e3", "1,20", "", "NaN", "1000000000000", " 1"])("rejects invalid amount %s", (value) => {
    expect(() => toCents(value)).toThrow();
  });

  it("matches PRD scenario A and handles no income", () => {
    expect(summarize([
      { type: "income", amount: "8000" },
      { type: "expense", amount: "1200" },
      { type: "expense", amount: "2000" },
    ])).toEqual({ income: 800000n, expense: 320000n, result: 480000n, savingsPercent: 6000n });
    expect(summarize([]).savingsPercent).toBeNull();
    expect(summarize([{ type: "expense", amount: "1" }]).result).toBe(-100n);
  });

  it("matches budget scenario C and exact warning boundaries", () => {
    expect(budgetStatus(120000n, 100000n)).toEqual({ remaining: -20000n, percent: 12000n, warning: true, exceeded: true });
    expect(budgetStatus(79999n, 100000n).warning).toBe(false);
    expect(budgetStatus(80000n, 100000n).warning).toBe(true);
    expect(budgetStatus(100000n, 100000n).exceeded).toBe(false);
    expect(() => budgetStatus(0n, 0n)).toThrow();
  });
});
