import markdownIt from "markdown-it";

const md = markdownIt({
  html: true,
  breaks: false,
  linkify: true,
});

export function messageShortcode(
  content: string,
  className = "is-info",
): string {
  const renderedContent = md.render(content);
  return `<article class="message ${className}">
  <div class="message-body">${renderedContent}</div>
</article>`;
}
