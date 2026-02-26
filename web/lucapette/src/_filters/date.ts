function parseDate(dateObj: unknown): { month: string; year: number } | null {
  if (!dateObj) return null;
  const date = new Date(dateObj as string | Date);
  return {
    month: date.toLocaleString("en-US", { month: "short" }),
    year: date.getFullYear(),
  };
}

export function formatDate(dateObj: unknown): string {
  const parsed = parseDate(dateObj);
  if (!parsed) return "";
  const { month, year } = parsed;
  return `${month} ${year}`;
}

export function dateToRfc3339(dateObj: unknown): string {
  if (!dateObj) return "";
  return new Date(dateObj as string | Date).toISOString();
}
