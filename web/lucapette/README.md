# lucapette.me

Migrated from Hugo to 11ty+Liquid.

## SEO

- [x] Create all /tags/\* pages (they existed but weren't in sitemap - FIXED)
- [x] Add Twitter card metadata (twitter:title, twitter:description, twitter:image) to all pages
- [x] Add Open Graph image (og:image) to yearly book posts
- [x] Fix truncated descriptions (e.g., "Fourth article of the series")
- [x] Create /categories page (old site has empty /categories - not needed)

## Todo

- [ ] Make headers in main pages as fancy as home page
- [x] Writing list page: add content padding compared to title
- [ ] Migrate all JS/TS files to TypeScript
- [ ] Move books article links from Goodreads to TheStoryGraph
- [ ] Improve RSS feed to include other sections
- [x] Drop Sass in favor of vanilla CSS or PostCSS

### CSS Migration Plan

1. [x] Remove `sass` and `include-media` from dependencies
2. [x] Create single `main.css` with all styles flattened
3. [x] Convert Sass variables to CSS custom properties in `:root`
4. [x] Replace `include-media` breakpoints with CSS `@media` queries
5. [x] Replace `color.adjust()` with computed hex values
6. [x] Flatten all nesting to standard CSS selectors
7. [x] Update npm scripts to copy CSS instead of compile

**Sass features replaced:**

- `@use` modules → flat CSS file
- `sass:color.adjust()` → hardcoded hex values
- Variables → CSS custom properties
- Mixins → CSS rules
- Nesting → flattened selectors
- `include-media` → CSS `@media`
- [ ] Update all content that refers to my repos (moved to monorepo)

## Dev

```bash
npm install
npm run build
npm run serve
```

## Tests

```bash
npm run test:lint     # CSS linting with stylelint
npm run test:build    # Build test
npm run test:visual:baseline  # Take baseline screenshots
```

Screenshots are in `tests/visual/baseline/` (old) and `tests/visual/new/` (new).
