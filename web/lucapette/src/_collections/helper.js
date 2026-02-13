export function getFiles(collectionApi, path) {
  return collectionApi
    .getFilteredByGlob(path)
    .filter(item => !item.fileSlug.includes("_index"))
    .sort((a, b) => b.date - a.date);
}
