import { describe, expect, it } from "vitest";
import { money, safeNext } from "./validation";
describe("server input boundaries", () => {
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/a\r\nb"])("rejects unsafe redirect %s", (value) => expect(safeNext(value)).toBe("/dashboard"));
  it("keeps internal invitation redirects", () => expect(safeNext("/convite/abc")).toBe("/convite/abc"));
  it.each(["0", "0.00", "-1", "1.001", "abc", "1e3", "1000000000000"])("rejects invalid money %s", (value) => expect(money.safeParse(value).success).toBe(false));
  it("accepts exact decimal bounds", () => expect(money.parse("999999999999.99")).toBe("999999999999.99"));
});
