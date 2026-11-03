const MAX_AMOUNT_CENTS = 99_999_999_999_999n;

/** Database NUMERIC(14,2) is transported as a string; arithmetic uses cents. */
export function toCents(amount: string): bigint {
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(amount)) {
    throw new Error("Informe um valor decimal válido, com até duas casas.");
  }
  const [whole, fraction = ""] = amount.split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents > MAX_AMOUNT_CENTS) throw new Error("Valor acima do limite permitido.");
  return cents;
}

export function toDecimal(cents: bigint): string {
  const absolute = cents < 0n ? -cents : cents;
  return `${cents < 0n ? "-" : ""}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

export function formatBRL(cents: bigint): string {
  const [whole, fraction] = toDecimal(cents < 0n ? -cents : cents).split(".");
  const grouped = BigInt(whole).toLocaleString("pt-BR");
  return `${cents < 0n ? "-" : ""}R$\u00a0${grouped},${fraction}`;
}

export type FinancialTransaction = { type: "income" | "expense"; amount: string };

export function summarize(transactions: readonly FinancialTransaction[]) {
  let income = 0n;
  let expense = 0n;
  for (const transaction of transactions) {
    const amount = toCents(transaction.amount);
    if (transaction.type === "income") income += amount;
    else expense += amount;
  }
  const result = income - expense;
  return { income, expense, result, savingsPercent: income > 0n ? (result * 10_000n) / income : null };
}

/** Percentage is expressed in hundredths: 12000 = 120.00%. */
export function budgetStatus(spent: bigint, limit: bigint) {
  if (spent < 0n || limit <= 0n) throw new Error("Orçamento inválido.");
  return {
    remaining: limit - spent,
    percent: (spent * 10_000n) / limit,
    warning: spent * 100n >= limit * 80n,
    exceeded: spent > limit,
  };
}
