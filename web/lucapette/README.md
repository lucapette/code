# lucapette.me

Migrated from Hugo to 11ty+Liquid.

## SEO

- [x] Create all /tags/* pages (they existed but weren't in sitemap - FIXED)
- [x] Add Twitter card metadata (twitter:title, twitter:description, twitter:image) to all pages
- [x] Add Open Graph image (og:image) to yearly book posts
- [x] Fix truncated descriptions (e.g., "Fourth article of the series")
- [x] Create /categories page (old site has empty /categories - not needed)

## Todo

- [ ] Make headers in main pages as fancy as home page
- [ ] Writing list page: add content padding compared to title
- [ ] Migrate all JS/TS files to TypeScript
- [ ] Move books article links from Goodreads to TheStoryGraph
- [ ] Improve RSS feed to include other sections
- [ ] Drop Sass in favor of vanilla CSS or PostCSS
- [ ] Update all content that refers to my repos (moved to monorepo)

## Dev

```bash
npm install
npm run build
npm run serve
```
