"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatBRL, toCents } from "@/lib/finance";

export function EvolutionChart({
  months,
}: {
  months: { month: string; income: string; expense: string }[];
}) {
  const data = months.map((m) => ({
    name: m.month.split("-").reverse().join("/"),
    income: Number(toCents(m.income)),
    expense: Number(toCents(m.expense)),
  }));
  return (
    <div
      className="chart-container"
      role="img"
      aria-label="Evolução mensal: receitas em verde e despesas em laranja"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <YAxis
            tickFormatter={(v: number) => `${Math.round(v / 100000)} mil`}
            tickLine={false}
            axisLine={false}
            width={55}
            fontSize={11}
          />
          <Tooltip
            formatter={(v) => formatBRL(BigInt(Math.round(Number(v))))}
          />
          <Bar
            isAnimationActive={false}
            dataKey="income"
            name="Receitas"
            fill="var(--primary)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            isAnimationActive={false}
            dataKey="expense"
            name="Despesas"
            fill="var(--expense)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
