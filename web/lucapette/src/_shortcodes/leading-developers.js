import markdownIt from "markdown-it";

const md = markdownIt({
  html: true,
  breaks: true,
  linkify: true,
});

export function leadingDevelopersShortcode(eleventyConfig) {
  eleventyConfig.addShortcode("leading-developers", function () {
    const content = `<p>Hey! 👋</p>
<p>Thank you for reading my content. I appreciate it.</p>
<p>If you like what you're reading, you may want to check out my book <a href="https://leadthe.dev">Leading developers</a>.</p>`;
    const renderedContent = md.render(content);
    return `<article class="message is-info">
  <div class="message-body">${renderedContent}</div>
</article>`;
  });
}
