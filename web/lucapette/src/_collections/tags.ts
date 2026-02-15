interface CollectionItem {
  data: {
    tags?: string | string[];
    [key: string]: unknown;
  };
  date: Date;
  url?: string;
}

export function tagList(collectionApi: { getAll: () => CollectionItem[] }) {
  const tags = new Set<string>();
  collectionApi.getAll().forEach((item) => {
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

export function tagPosts(collectionApi: { getAll: () => CollectionItem[] }) {
  const tagMap: Record<string, CollectionItem[]> = {};
  collectionApi.getAll().forEach((item) => {
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
