interface TagPageData {
  tag: string;
  posts: {
    url: string;
    data: {
      title: string;
      tags?: string[];
    };
  }[];
  title: string;
}

function getContentType(url: string): string {
  if (url.startsWith("/writing/")) return "📝";
  if (url.startsWith("/notes/")) return "📋";
  return "";
}

export default {
  data() {
    return {
      pagination: {
        data: "collections.tagList",
        size: 1,
        alias: "tag",
      },
      permalink: (data: { tag: string }) => `/tags/${data.tag}/`,
      layout: "base.liquid",
      eleventyComputed: {
        title: (data: { tag: string }) =>
          data.tag.charAt(0).toUpperCase() + data.tag.slice(1),
        posts: (data: {
          collections: { tagPosts?: Record<string, TagPageData["posts"]> };
          tag: string;
        }) => {
          const tagPosts = data.collections.tagPosts;
          return tagPosts ? tagPosts[data.tag] || [] : [];
        },
      },
    };
  },
  render(data: TagPageData): string {
    const posts = data.posts || [];
    const postsHtml =
      posts.length > 0
        ? posts
            .map((post) => {
              const contentType = getContentType(post.url);
              const tags = post.data.tags || [];
              const tagsHtml =
                tags.length > 0
                  ? `<span class="tags">${tags.map((tag) => `<a href="/tags/${tag}" class="tag">#${tag}</a>`).join(" ")}</span>`
                  : "";

              return `          <li class="article">
            <a href="${post.url}">
              <span>${contentType} ${post.data.title}</span>
            </a>
            ${tagsHtml}
          </li>`;
            })
            .join("\n")
        : "";

    return `\
<section>
  <h1>${data.title}</h1>
</section>

<section class="section">
  <div class="columns">
    <div class="column">
      <ul class="articles">
${postsHtml}
      </ul>
    </div>
  </div>
</section>`;
  },
};
