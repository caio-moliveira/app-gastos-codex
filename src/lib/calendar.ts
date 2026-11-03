export function calendarDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Data inválida.");
  const parsed = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("Data inválida.");
  }
  return value;
}

export function formatDate(value: string): string {
  return calendarDate(value).split("-").reverse().join("/");
}

export function monthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Mês inválido.");
  const [year, number] = month.split("-").map(Number);
  if (year < 1900 || year > 9998) throw new Error("Ano inválido.");
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${days}` };
}
