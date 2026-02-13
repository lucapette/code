export function writings(collectionApi) {
  return collectionApi
    .getFilteredByGlob("./src/writing/**/*.md")
    .filter(item => !item.fileSlug.includes("_index"))
    .sort((a, b) => {
      return b.date - a.date;
    });
}

export function writingsByYear(collectionApi) {
  const writings = collectionApi
    .getFilteredByGlob("./src/writing/**/*.md")
    .filter(item => !item.fileSlug.includes("_index"))
    .sort((a, b) => {
      return b.date - a.date;
    });

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
  return collectionApi
    .getFilteredByGlob("./src/writing/**/*.md")
    .filter(item => item.data.favourite === true)
    .sort((a, b) => b.date - a.date);
}
