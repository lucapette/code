import { CollectionItem } from "./index";

export function reading(collectionApi: {
  getFilteredByGlob: (path: string) => CollectionItem[];
}) {
  return collectionApi
    .getFilteredByGlob("./src/reading/**/*.md")
    .filter((item) => !item.fileSlug.includes("_index"));
}
