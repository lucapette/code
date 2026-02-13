import { formatDate } from "../_filters/date.js";

function getReading(collectionApi) {
  return collectionApi
    .getFilteredByGlob("./src/reading/**/*.md")
    .filter(item => !item.fileSlug.includes("_index"))
    .sort((a, b) => b.date - a.date);
}

export function reading(collectionApi) {
  return getReading(collectionApi);
}

export function readingByYear(collectionApi) {
  const reading = getReading(collectionApi);
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
