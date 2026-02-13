import handlebarsPlugin from "@11ty/eleventy-plugin-handlebars";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { eq } from "./src/_filters/comparison.js";
import { formatDate, dateToRfc3339 } from "./src/_filters/date.js";
import { writings, writingsByYear, favouriteWritings, relatedWritings } from "./src/_collections/writings.js";
import { reading, readingByYear } from "./src/_collections/reading.js";
import { tagList, tagPosts, getTagPosts } from "./src/_collections/tags.js";
import { drafts } from "./src/_preprocessors/drafts.js";
import lucideShortcode from "./src/_shortcodes/lucide.js";
import { messageShortcode } from "./src/_shortcodes/message.js";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(handlebarsPlugin);
  eleventyConfig.addPlugin(syntaxHighlight);

  lucideShortcode(eleventyConfig);
  messageShortcode(eleventyConfig);

  eleventyConfig.addGlobalData(
    "today",
    () => new Date().toISOString().split("T")[0],
  );

  eleventyConfig.addFilter("eq", eq);
  eleventyConfig.addFilter("formatDate", formatDate);
  eleventyConfig.addFilter("dateToRfc3339", dateToRfc3339);
  eleventyConfig.addFilter("getNewestItemDate", function (items) {
    if (!items || items.length === 0) return new Date();
    return items.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date;
  });
  eleventyConfig.addFilter("limit", (array, n) => array ? array.slice(0, n) : []);
  eleventyConfig.addFilter("getTagPosts", getTagPosts);
  eleventyConfig.addFilter("getRelatedPosts", function (relatedWritingsMap, url) {
    return relatedWritingsMap ? (relatedWritingsMap.get(url) || []) : [];
  });

  eleventyConfig.addPreprocessor("drafts", "md,hbs", drafts);

  eleventyConfig.addPassthroughCopy("./src/assets");
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
    markdownTemplateEngine: "hbs",
  };
}
