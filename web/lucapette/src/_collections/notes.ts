import { CollectionItem } from "./index";

export function notes(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  return collectionApi
    .getFilteredByGlob("./src/notes/**/*.md")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function notesByCategory(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  const items = notes(collectionApi);

  const grouped: Record<
    string,
    { postUrl: string; title: string; tags: string[] }[]
  > = {};

  items.forEach((note) => {
    const parts = note.url.split("/").filter(Boolean);
    const category = parts.length >= 2 ? parts[1] : "uncategorized";

    if (!grouped[category]) {
      grouped[category] = [];
    }

    const tags = Array.isArray(note.data.tags)
      ? note.data.tags
      : note.data.tags
        ? [note.data.tags]
        : [];

    grouped[category].push({
      postUrl: note.url,
      title: note.data.title as string,
      tags: tags as string[],
    });
  });

  return Object.keys(grouped)
    .sort()
    .map((category) => ({
      category: category,
      notes: grouped[category],
    }));
}
