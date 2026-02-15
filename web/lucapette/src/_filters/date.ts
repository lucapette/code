export function formatDate(dateObj: unknown): string {
  if (!dateObj) return "";
  const date = new Date(dateObj as string | Date);
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

export function formatDateShort(dateObj: unknown): string {
  if (!dateObj) return "";
  const date = new Date(dateObj as string | Date);
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${month} ${year}`;
}

export function dateToRfc3339(dateObj: unknown): string {
  if (!dateObj) return "";
  const date = new Date(dateObj as string | Date);
  return date.toISOString();
}
