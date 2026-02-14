import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { formatDate, dateToRfc3339 } from "./src/_filters/date.js";
import { asset } from "./src/_filters/asset.js";
import { writings, writingsByYear, favouriteWritings, relatedWritings } from "./src/_collections/writings.js";
import { reading, readingByYear } from "./src/_collections/reading.js";
import { tagList, tagPosts } from "./src/_collections/tags.js";
import { drafts } from "./src/_preprocessors/drafts.js";
import { lucideShortcode } from "./src/_shortcodes/lucide.js";
import { messageShortcode } from "./src/_shortcodes/message.js";
import { leadingDevelopersShortcode } from "./src/_shortcodes/leading-developers.js";
import { typestreamShortcode } from "./src/_shortcodes/typestream.js";
import { imageShortcode } from "./src/_shortcodes/image.js";
import { bookShortcode } from "./src/_shortcodes/book.js";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);

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
  eleventyConfig.addFilter("dateToRfc3339", dateToRfc3339);
  eleventyConfig.addFilter("asset", asset);
  eleventyConfig.addFilter("getNewestItemDate", function (items) {
    if (!items || items.length === 0) return new Date();
    return items.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date;
  });

  eleventyConfig.addPreprocessor("drafts", "md,liquid", drafts);

  eleventyConfig.addPassthroughCopy("./src/assets/css/prism-nord.css");
  eleventyConfig.addPassthroughCopy("./src/assets/css/prism-line-numbers.css");
  eleventyConfig.addPassthroughCopy("./src/assets/img");
  eleventyConfig.addPassthroughCopy("./src/assets/reading");
  eleventyConfig.addPassthroughCopy("./src/static");

  eleventyConfig.addCollection("writings", writings);
  eleventyConfig.addCollection("writingsByYear", writingsByYear);
  eleventyConfig.addCollection("favouriteWritings", favouriteWritings);
  eleventyConfig.addCollection("relatedWritings", relatedWritings);
  eleventyConfig.addCollection("reading", reading);
  eleventyConfig.addCollection("readingByYear", readingByYear);
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
