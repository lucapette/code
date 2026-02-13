import handlebarsPlugin from "@11ty/eleventy-plugin-handlebars";
import { eq } from "./src/_filters/comparison.js";
import { formatDate } from "./src/_filters/date.js";
import { writings, writingsByYear, favouriteWritings } from "./src/_collections/writings.js";
import { reading, readingByYear } from "./src/_collections/reading.js";
import { drafts } from "./src/_preprocessors/drafts.js";
import lucideShortcode from "./src/_shortcodes/lucide.js";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(handlebarsPlugin);

  lucideShortcode(eleventyConfig);

  eleventyConfig.addGlobalData(
    "today",
    () => new Date().toISOString().split("T")[0],
  );

  eleventyConfig.addFilter("eq", eq);
  eleventyConfig.addFilter("formatDate", formatDate);
  eleventyConfig.addFilter("limit", (array, n) => array ? array.slice(0, n) : []);
  eleventyConfig.addFilter("getTagPosts", function (tagPosts, tag) {
    return tagPosts[tag] || [];
  });

  eleventyConfig.addPreprocessor("drafts", "md,hbs", drafts);

  eleventyConfig.addPassthroughCopy("./src/assets");
  eleventyConfig.addPassthroughCopy("./src/static");

  eleventyConfig.addCollection("writings", writings);
  eleventyConfig.addCollection("writingsByYear", writingsByYear);
  eleventyConfig.addCollection("favouriteWritings", favouriteWritings);
  eleventyConfig.addCollection("reading", reading);
  eleventyConfig.addCollection("readingByYear", readingByYear);

  eleventyConfig.addCollection("tagList", function (collectionApi) {
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
  });

  eleventyConfig.addCollection("tagPosts", function (collectionApi) {
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
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
    },
    markdownTemplateEngine: "hbs",
  };
}
