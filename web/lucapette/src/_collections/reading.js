import { formatDate } from "../_filters/date.js";

export function reading(collectionApi) {
  return collectionApi
    .getFilteredByGlob("./src/reading/**/*.md")
    .filter(item => !item.fileSlug.includes("_index"))
    .sort((a, b) => {
      return b.date - a.date;
    });
}

export function readingByYear(collectionApi) {
  const reading = collectionApi
    .getFilteredByGlob("./src/reading/**/*.md")
    .filter(item => !item.fileSlug.includes("_index"))
    .sort((a, b) => {
      return b.date - a.date;
    });
  const grouped = {};
  reading.forEach((item) => {
    const date = new Date(item.date);
    const year = date.getFullYear();
    if (!grouped[year]) {
      grouped[year] = [];
    }
    grouped[year].push({
      postUrl: item.data.page.url,
      title: item.data.title,
      formattedDate: formatDate(item.date),
    });
  });
  return Object.keys(grouped)
    .sort((a, b) => b - a)
    .map((year) => ({
      year: year,
      books: grouped[year],
    }));
}
