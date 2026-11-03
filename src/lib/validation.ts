import { z } from "zod";
import { calendarDate } from "./calendar";

export const uuid = z.uuid();
export const money = z
  .string()
  .regex(
    /^\d{1,12}(\.\d{1,2})?$/,
    "Use um valor positivo com até duas casas decimais.",
  )
  .refine(
    (s) =>
      /^\d{1,12}(\.\d{1,2})?$/.test(s) &&
      BigInt(s.replace(".", "").replace(/^0+/, "") || "0") > 0n,
    "O valor deve ser maior que zero.",
  );
export const date = z.string().refine((v) => {
  try {
    calendarDate(v);
    return v >= "1900-01-01" && v <= "9998-12-31";
  } catch {
    return false;
  }
}, "Data inválida.");
export function safeNext(value: unknown, fallback = "/dashboard") {
  return typeof value === "string" &&
    /^\/(?!\/)/.test(value) &&
    !/[\\\r\n]/.test(value) &&
    !value.includes(":")
    ? value
    : fallback;
}
export const transactionInput = z.object({
  space_id: uuid,
  type: z.enum(["income", "expense"]),
  amount: money,
  description: z.string().trim().min(1).max(500),
  category_id: uuid,
  occurred_on: date,
});
