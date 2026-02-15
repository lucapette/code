interface TagPageData {
  tag: string;
  posts: { url: string; data: { title: string } }[];
  title: string;
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
            .map(
              (post) => `          <li class="article">
            <a href="${post.url}">
              <span>${post.data.title}</span>
            </a>
          </li>`,
            )
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
