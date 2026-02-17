import { CollectionItem } from "./index";

export function tagList(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  const tags = new Set<string>();

  //TODO use "official" way to get these collections
  const writings = collectionApi.getFilteredByGlob("./src/writing/**/*.md");
  const notes = collectionApi.getFilteredByGlob("./src/notes/**/*.md");
  const allItems = [...writings, ...notes];

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

  // TODO Same here: use "official" way to get these collections
  const writings = collectionApi.getFilteredByGlob("./src/writing/**/*.md");
  const notes = collectionApi.getFilteredByGlob("./src/notes/**/*.md");
  const allItems = [...writings, ...notes];

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
