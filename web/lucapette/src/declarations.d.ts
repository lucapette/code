declare module "@11ty/eleventy" {
  export interface IdAttributePluginOptions {
    selector?: string;
  }

  export const IdAttributePlugin: {
    (eleventyConfig: unknown, options?: IdAttributePluginOptions): void;
  };

  export interface EleventyConfig {
    addPlugin: (plugin: unknown, options?: unknown) => void;
    addShortcode: (name: string, fn: unknown) => void;
    addPairedShortcode: (name: string, fn: unknown) => void;
    addAsyncShortcode: (name: string, fn: unknown) => void;
    addPairedLiquidShortcode: (name: string, fn: unknown) => void;
    addGlobalData: (name: string, fn: unknown) => void;
    addFilter: (name: string, fn: unknown) => void;
    addPreprocessor: (name: string, formats: string, fn: unknown) => void;
    addPassthroughCopy: (path: string) => void;
    addCollection: (name: string, fn: unknown) => void;
    addWatchTarget: (
      target: string,
      options?: { resetConfig?: boolean },
    ) => void;
    on: (event: string, fn: (data?: unknown) => void | Promise<void>) => void;
  }
}

declare module "@11ty/eleventy-plugin-syntaxhighlight" {
  const syntaxHighlight: unknown;
  export default syntaxHighlight;
}

declare module "@11ty/eleventy-img" {
  interface ImageMetadata {
    url: string;
    width: number;
    height: number;
  }

  interface ImageFormats {
    webp: ImageMetadata[];
    jpeg?: ImageMetadata[];
    png?: ImageMetadata[];
  }

  interface ImageOptions {
    widths: number[];
    formats: string[];
    outputDir: string;
    urlPath: string;
  }

  export default function Image(
    inputPath: string,
    options: ImageOptions,
  ): Promise<ImageFormats>;
}

declare module "lucide-static/icon-nodes.json" {
  const icons: Record<string, unknown>;
  export default icons;
}
