import { formatDate } from "../_filters/date.js";

export default {
  data() {
    return {
      pagination: {
        data: "collections.tagList",
        size: 1,
        alias: "tag"
      },
      permalink: (data) => `/tags/${data.tag}/`,
      layout: "base.liquid",
      eleventyComputed: {
        title: (data) => data.tag,
        posts: (data) => {
          const tagPosts = data.collections.tagPosts;
          return tagPosts ? (tagPosts[data.tag] || []) : [];
        }
      }
    };
  },
  render(data) {
    const posts = data.posts || [];
    const postsHtml = posts.length > 0 
      ? posts.map(post => `          <li class="article">
            <a href="${post.url}">
              <span>${post.data.title}</span>
              <span class="date">${formatDate(post.date)}</span>
            </a>
          </li>`).join('\n')
      : '';
    
    return `\
<section>
  <h1>${data.title}</h1>
</section>

<section class="section">
  <div class="columns">
    <div class="column">
      <div class="content">
        <ul class="articles">
${postsHtml}
        </ul>
      </div>
    </div>
  </div>
</section>`;
  }
};
