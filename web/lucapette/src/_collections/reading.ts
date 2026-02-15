import { formatDate } from "../_filters/date";
import { getFiles } from "./helper";

interface CollectionItem {
  fileSlug: string;
  date: Date;
  url: string;
  data: {
    [key: string]: unknown;
    title?: string;
    page?: { url: string };
  };
}

function getReading(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  return getFiles(collectionApi, "./src/reading/**/*.md");
}

export function reading(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  return getReading(collectionApi);
}

export function readingByYear(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  const reading = getReading(collectionApi);
  const grouped: Record<
    string,
    { postUrl: string; title: string; formattedDate: string }[]
  > = {};
  reading.forEach((item) => {
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
