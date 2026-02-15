import { CollectionItem } from "./index";
import { formatDateDayMonth } from "../_filters/date";

export function writings(collectionApi: { getFilteredByGlob: (path: string) => CollectionItem[] }) {
  return collectionApi
    .getFilteredByGlob("./src/writing/**/*.md")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function writingsByYear(collectionApi: { getFilteredByGlob: (path: string) => CollectionItem[] }) {
  const items = writings(collectionApi);

  const grouped: Record<
    string,
    { postUrl: string; title: string; formattedDate: string }[]
  > = {};
  items.forEach((article) => {
    const date = new Date(article.date);
    const year = date.getFullYear();

    if (!grouped[year]) {
      grouped[year] = [];
    }

    grouped[year].push({
      postUrl: article.url,
      title: article.data.title as string,
      formattedDate: formatDateDayMonth(article.date),
    });
  });

  return Object.keys(grouped)
    .sort((a, b) => Number(b) - Number(a))
    .map((year) => ({
      year: year,
      articles: grouped[year],
    }));
}

export function favouriteWritings(collectionApi: { getFilteredByGlob: (path: string) => CollectionItem[] }) {
  return writings(collectionApi)
    .filter((item) => item.data.favourite === true)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

export function relatedWritings(collectionApi: { getFilteredByGlob: (path: string) => CollectionItem[] }) {
  const items = writings(collectionApi);

  const related: Record<string, CollectionItem[]> = {};

  items.forEach((article) => {
    const otherArticles = items.filter((w) => w.url !== article.url);

    const scored = otherArticles.map((other) => ({
      article: other,
      score: calculateScore(article, other),
    }));

    const filtered = scored.filter((s) => s.score >= 80);
    const sorted = filtered.sort((a, b) => b.score - a.score);

    related[article.url] = sorted.slice(0, 5).map((s) => s.article);
  });

  return related;
}
