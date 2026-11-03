import { describe, expect, it } from "vitest";
import { calendarDate, formatDate, monthRange } from "./calendar";

describe("calendar dates", () => {
  it("formats dates without time zone conversion", () => {
    expect(formatDate("2026-11-03")).toBe("03/11/2026");
  });
  it("handles leap years and month ends", () => {
    expect(monthRange("2024-02")).toEqual({ start: "2024-02-01", end: "2024-02-29" });
    expect(monthRange("2026-02").end).toBe("2026-02-28");
    expect(monthRange("2026-12").end).toBe("2026-12-31");
  });
  it.each(["2026-02-29", "2026-04-31", "2026-13-01", "03/11/2026", "2026-11-03T00:00:00Z"])("rejects invalid date %s", (date) => {
    expect(() => calendarDate(date)).toThrow();
  });
});
