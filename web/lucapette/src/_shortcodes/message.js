import markdownIt from "markdown-it";

const md = markdownIt({
  html: true,
  breaks: true,
  linkify: true,
});

export function messageShortcode(eleventyConfig) {
  eleventyConfig.addPairedShortcode("message", function (content, className = "is-info") {
    const renderedContent = md.render(content);
    return `<article class="message ${className}">
  <div class="message-body">${renderedContent}</div>
</article>`;
  });
}
