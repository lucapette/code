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
