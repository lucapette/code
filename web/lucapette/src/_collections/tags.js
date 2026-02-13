export function tagList(collectionApi) {
  const tags = new Set();
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

export function tagPosts(collectionApi) {
  const tagMap = {};
  collectionApi.getAll().forEach((item) => {
    if (item.data.tags) {
      item.data.tags.forEach((tag) => {
        if (!tagMap[tag]) {
          tagMap[tag] = [];
        }
        tagMap[tag].push(item);
      });
    }
  });
  return tagMap;
}

export function getTagPosts(tagPosts, tag) {
  return tagPosts[tag] || [];
}
