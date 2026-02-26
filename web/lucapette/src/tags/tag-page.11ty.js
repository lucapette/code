function getContentType(url) {
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
      permalink: (data) => `/tags/${data.tag}/`,
      layout: "base.liquid",
      eleventyComputed: {
        title: (data) => data.tag.charAt(0).toUpperCase() + data.tag.slice(1),
        posts: (data) => {
          const tagPosts = data.collections.tagPosts;
          return tagPosts ? tagPosts[data.tag] || [] : [];
        },
      },
    };
  },
  render(data) {
    const posts = data.posts || [];
    const postsHtml =
      posts.length > 0
        ? posts
            .map((post) => {
              const contentType = getContentType(post.url);
              const tags = post.data.tags || [];
              const tagsHtml =
                tags.length > 0
                  ? `<span class="date"></span><span class="separator">·</span>` +
                    tags
                      .map((tag) => `<span class="tag">#${tag}</span>`)
                      .join(" ")
                  : "";

              return `          <li class="entry">
            <a href="${post.url}">
              <span class="title">${contentType} ${post.data.title}</span>
              <span class="meta">${tagsHtml}</span>
            </a>
          </li>`;
            })
            .join("\n")
        : "";

    return `\
<section>
  <h1>${data.title}</h1>
</section>

<section class="section">
  <ul class="feed">
${postsHtml}
  </ul>
</section>`;
  },
};
