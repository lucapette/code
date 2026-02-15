import { CollectionItem } from "./index";
import { formatDate } from "../_filters/date";

export function reading(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  return collectionApi
    .getFilteredByGlob("./src/reading/**/*.md")
    .filter((item) => !item.fileSlug.includes("_index"));
}

export function readingByYear(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  const items = reading(collectionApi);
  const grouped: Record<
    string,
    { postUrl: string; title: string; formattedDate: string }[]
  > = {};
  items.forEach((item) => {
    const date = new Date(item.date);
    const year = date.getFullYear();
    if (!grouped[year]) {
      grouped[year] = [];
    }
    grouped[year].push({
      postUrl: item.data.page?.url || "",
      title: item.data.title as string,
      formattedDate: formatDate(item.date),
    });
  });
  return Object.keys(grouped)
    .sort((a, b) => Number(b) - Number(a))
    .map((year) => ({
      year: year,
      books: grouped[year],
    }));
}
