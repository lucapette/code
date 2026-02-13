import { getFiles } from "./helper.js";

function getWritings(collectionApi) {
  return getFiles(collectionApi, "./src/writing/**/*.md");
}

export function writings(collectionApi) {
  return getWritings(collectionApi);
}

export function writingsByYear(collectionApi) {
  const writings = getWritings(collectionApi);

  const grouped = {};
  writings.forEach((article) => {
    const date = new Date(article.date);
    const year = date.getFullYear();
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate();

    if (!grouped[year]) {
      grouped[year] = [];
    }

    grouped[year].push({
      postUrl: article.data.page.url,
      title: article.data.title,
      formattedDate: `${month} ${day}`,
    });
  });

  return Object.keys(grouped)
    .sort((a, b) => b - a)
    .map((year) => ({
      year: year,
      articles: grouped[year],
    }));
}

export function favouriteWritings(collectionApi) {
  return getWritings(collectionApi).filter(item => item.data.favourite === true);
}
