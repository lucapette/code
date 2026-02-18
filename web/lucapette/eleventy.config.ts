import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { IdAttributePlugin } from "@11ty/eleventy";
import {
  formatDate,
  formatDateShort,
  dateToRfc3339,
} from "./src/_filters/date.js";
import { asset } from "./src/_filters/asset.js";
import {
  writings,
  writingsByYear,
  favouriteWritings,
  relatedWritings,
} from "./src/_collections/writings.js";
import { notes, notesByCategory } from "./src/_collections/notes.js";
import { tagList, tagPosts } from "./src/_collections/tags.js";
import { drafts } from "./src/_preprocessors/drafts.js";
import { lucideShortcode } from "./src/_shortcodes/lucide.js";
import { messageShortcode } from "./src/_shortcodes/message.js";
import { leadingDevelopersShortcode } from "./src/_shortcodes/leading-developers.js";
import { typestreamShortcode } from "./src/_shortcodes/typestream.js";
import { imageShortcode } from "./src/_shortcodes/image.js";
import { bookShortcode } from "./src/_shortcodes/book.js";

import type { EleventyConfig } from "@11ty/eleventy";

export default function (eleventyConfig: EleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(IdAttributePlugin, {
    selector: "h1,h2,h3,h4,h5,h6",
  });

  eleventyConfig.addShortcode("lucide", lucideShortcode);
  eleventyConfig.addPairedShortcode("message", messageShortcode);
  eleventyConfig.addShortcode("leaddevbook", leadingDevelopersShortcode);
  eleventyConfig.addShortcode("typestream", typestreamShortcode);
  eleventyConfig.addAsyncShortcode("image", imageShortcode);
  eleventyConfig.addPairedLiquidShortcode("book", bookShortcode);

  eleventyConfig.addGlobalData(
    "today",
    () => new Date().toISOString().split("T")[0],
  );

  eleventyConfig.addGlobalData(
    "node_env",
    () => process.env.NODE_ENV || "development",
  );

  eleventyConfig.addFilter("formatDate", formatDate);
  eleventyConfig.addFilter("formatDateShort", formatDateShort);
  eleventyConfig.addFilter("dateToRfc3339", dateToRfc3339);
  eleventyConfig.addFilter("asset", asset);

  eleventyConfig.addPreprocessor("drafts", "md,liquid", drafts);

  eleventyConfig.addPassthroughCopy("./src/assets/css/prism-nord.css");
  eleventyConfig.addPassthroughCopy("./src/assets/css/prism-line-numbers.css");
  eleventyConfig.addPassthroughCopy("./src/assets/img");
  eleventyConfig.addPassthroughCopy("./src/assets/notes/reading");
  eleventyConfig.addPassthroughCopy("./src/static");

  eleventyConfig.addCollection("writings", writings);
  eleventyConfig.addCollection("writingsByYear", writingsByYear);
  eleventyConfig.addCollection("favouriteWritings", favouriteWritings);
  eleventyConfig.addCollection("relatedWritings", relatedWritings);
  eleventyConfig.addCollection("notes", notes);
  eleventyConfig.addCollection("notesByCategory", notesByCategory);
  eleventyConfig.addCollection("tagList", tagList);
  eleventyConfig.addCollection("tagPosts", tagPosts);

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
    },
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    liquidOptions: {
      dynamicPartials: true,
    },
  };
}
