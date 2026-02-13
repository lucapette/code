import handlebarsPlugin from "@11ty/eleventy-plugin-handlebars";
import { eq } from "./src/_filters/comparison.js";
import { formatDate } from "./src/_filters/date.js";
import { posts, postsByYear } from "./src/_collections/posts.js";
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
  eleventyConfig.addFilter("limit", (array, n) => array.slice(0, n));

  eleventyConfig.addPassthroughCopy("./src/assets");
  eleventyConfig.addPassthroughCopy("./src/static");

  eleventyConfig.addCollection("posts", posts);
  eleventyConfig.addCollection("postsByYear", postsByYear);

  eleventyConfig.addCollection("favourites", function(collectionApi) {
    return collectionApi
      .getFilteredByGlob("./src/writing/**/*.md")
      .filter(item => item.data.favourite === true)
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("reading", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("./src/reading/**/*.md")
      .filter(item => !item.fileSlug.includes("_index"))
      .sort((a, b) => {
        return b.date - a.date;
      });
  });

  eleventyConfig.addCollection("readingByYear", function (collectionApi) {
    const reading = collectionApi
      .getFilteredByGlob("./src/reading/**/*.md")
      .filter(item => !item.fileSlug.includes("_index"))
      .sort((a, b) => {
        return b.date - a.date;
      });
    const grouped = {};
    reading.forEach((item) => {
      const date = new Date(item.date);
      const year = date.getFullYear();
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push({
        postUrl: item.data.page.url,
        title: item.data.title,
        formattedDate: formatDate(item.date),
      });
    });
    return Object.keys(grouped)
      .sort((a, b) => b - a)
      .map((year) => ({
        year: year,
        posts: grouped[year],
      }));
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
