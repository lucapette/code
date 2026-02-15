import { getFiles } from "./helper";

interface CollectionItem {
  fileSlug: string;
  date: Date;
  url: string;
  data: {
    [key: string]: unknown;
    title?: string;
    tags?: string | string[];
    favourite?: boolean;
    keywords?: string;
    page?: { url: string };
  };
}

function getWritings(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  return getFiles(collectionApi, "./src/writing/**/*.md");
}

export function writings(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  return getWritings(collectionApi);
}

export function writingsByYear(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  const writings = getWritings(collectionApi);

  const grouped: Record<
    string,
    { postUrl: string; title: string; formattedDate: string }[]
  > = {};
  writings.forEach((article) => {
    const date = new Date(article.date);
    const year = date.getFullYear();
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate();

    if (!grouped[year]) {
      grouped[year] = [];
    }

    grouped[year].push({
      postUrl: article.url,
      title: article.data.title as string,
      formattedDate: `${month} ${day.toString().padStart(2, "0")}`,
    });
  });

  return Object.keys(grouped)
    .sort((a, b) => Number(b) - Number(a))
    .map((year) => ({
      year: year,
      articles: grouped[year],
    }));
}

export function favouriteWritings(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  return getWritings(collectionApi).filter(
    (item) => item.data.favourite === true,
  );
}

function normalizeToArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);
  }
  return [];
}

function calculateScore(
  article1: CollectionItem,
  article2: CollectionItem,
): number {
  let score = 0;

  const keywords1 = normalizeToArray(article1.data.keywords);
  const keywords2 = normalizeToArray(article2.data.keywords);
  const sharedKeywords = keywords1.filter((k) => keywords2.includes(k));
  score += sharedKeywords.length * 100;

  const tags1 = normalizeToArray(article1.data.tags);
  const tags2 = normalizeToArray(article2.data.tags);
  const sharedTags = tags1.filter((t) => tags2.includes(t));
  score += sharedTags.length * 50;

  return score;
}

export function relatedWritings(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  const writings = getWritings(collectionApi);

  const related: Record<string, CollectionItem[]> = {};

  writings.forEach((article) => {
    const otherArticles = writings.filter((w) => w.url !== article.url);

    const scored = otherArticles.map((other) => ({
      article: other,
      score: calculateScore(article, other),
    }));

    const filtered = scored.filter((s) => s.score >= 80);
    const sorted = filtered.sort((a, b) => b.score - a.score);
    const top5 = sorted.slice(0, 5).map((s) => s.article);

    related[article.url] = top5;
  });

  return related;
}
