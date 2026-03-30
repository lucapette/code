import { CollectionItem } from "./index";
import { writings } from "./writings";
import { notes } from "./notes";

export function tagList(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  const tags = new Set<string>();

  const allItems = [...writings(collectionApi), ...notes(collectionApi)];

  allItems.forEach((item) => {
    if ("tags" in item.data) {
      const itemTags = item.data.tags;
      if (typeof itemTags === "string") {
        tags.add(itemTags);
      } else if (Array.isArray(itemTags)) {
        itemTags.forEach((tag) => tags.add(tag));
      }
    }
  });
  return [...tags].sort();
}

export function tagPosts(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  const tagMap: Record<string, CollectionItem[]> = {};

  const allItems = [...writings(collectionApi), ...notes(collectionApi)];

  allItems.forEach((item) => {
    if (item.data.tags) {
      const tags = Array.isArray(item.data.tags)
        ? item.data.tags
        : [item.data.tags];
      tags.forEach((tag) => {
        if (!tagMap[tag]) {
          tagMap[tag] = [];
        }
        tagMap[tag].push(item);
      });
    }
  });
  Object.keys(tagMap).forEach((tag) => {
    tagMap[tag].sort((a, b) => b.date.getTime() - a.date.getTime());
  });
  return tagMap;
}
