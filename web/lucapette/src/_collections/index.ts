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
