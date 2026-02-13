export function drafts(data, content) {
  if (data.draft && process.env.NODE_ENV !== "development") {
    return false;
  }
  return content;
}
