export interface CollectionItem {
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

export function getFiles(
  collectionApi: {
    getFilteredByGlob: (path: string) => CollectionItem[];
  },
  path: string,
): CollectionItem[] {
  return collectionApi
    .getFilteredByGlob(path)
    .filter((item: CollectionItem) => !item.fileSlug.includes("_index"))
    .sort(
      (a: CollectionItem, b: CollectionItem) =>
        b.date.getTime() - a.date.getTime(),
    );
}
