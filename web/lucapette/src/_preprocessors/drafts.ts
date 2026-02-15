export function drafts(
  data: { draft?: boolean },
  content: string,
): string | false {
  if (data.draft && process.env.NODE_ENV !== "development") {
    return false;
  }
  return content;
}
