function parseDate(dateObj: unknown): { month: string; day: number; year: number } | null {
  if (!dateObj) return null;
  const date = new Date(dateObj as string | Date);
  return {
    month: date.toLocaleString("en-US", { month: "short" }),
    day: date.getDate(),
    year: date.getFullYear(),
  };
}

export function formatDate(dateObj: unknown): string {
  const parsed = parseDate(dateObj);
  if (!parsed) return "";
  const { month, day, year } = parsed;
  return `${month} ${day}, ${year}`;
}

export function formatDateShort(dateObj: unknown): string {
  const parsed = parseDate(dateObj);
  if (!parsed) return "";
  const { month, year } = parsed;
  return `${month} ${year}`;
}

export function formatDateDayMonth(dateObj: unknown): string {
  const parsed = parseDate(dateObj);
  if (!parsed) return "";
  const { month, day } = parsed;
  return `${month} ${day.toString().padStart(2, "0")}`;
}

export function dateToRfc3339(dateObj: unknown): string {
  if (!dateObj) return "";
  return new Date(dateObj as string | Date).toISOString();
}
