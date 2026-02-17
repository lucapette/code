import { CollectionItem } from "./index";
import { formatDateDayMonth } from "../_filters/date";

export function notes(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  return collectionApi
    .getFilteredByGlob("./src/notes/**/*.md")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function notesByYear(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  const items = notes(collectionApi);

  const grouped: Record<
    string,
    { postUrl: string; title: string; formattedDate: string; tags: string[] }[]
  > = {};

  items.forEach((note) => {
    const date = new Date(note.date);
    const year = date.getFullYear();

    if (!grouped[year]) {
      grouped[year] = [];
    }

    const tags = Array.isArray(note.data.tags)
      ? note.data.tags
      : note.data.tags
        ? [note.data.tags]
        : [];

    grouped[year].push({
      postUrl: note.url,
      title: note.data.title as string,
      formattedDate: formatDateDayMonth(note.date),
      tags: tags as string[],
    });
  });

  return Object.keys(grouped)
    .sort((a, b) => Number(b) - Number(a))
    .map((year) => ({
      year: year,
      notes: grouped[year],
    }));
}
