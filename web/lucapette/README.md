# lucapette.me Website

Source code for [lucapette.me](https://lucapette.me), migrated from Hugo to 11ty+Liquid. See [web/main](../main) for
the original Hugo version.

## Goal: Feature Parity with web/main

This site is in active migration from Hugo to 11ty. The primary focus is reaching full feature parity with `web/main`.

### Naming Conventions

The new site uses **"article"** everywhere instead of **"post"** (Hugo's terminology). This applies to CSS classes,
variable names, etc.

### Done

- Complete migration from Handlebars to Liquid
- Removed unused filters (eq, limit, getTagPosts, getRelatedPosts)
- Cleaned up shortcode registration pattern
- Renamed shortcodes to avoid Liquid conflicts (e.g., `leaddevbook`)
- Removed unused dependencies

### To Do (Feature Parity)

| Feature                                   | Status  |
|-------------------------------------------|---------|
| Tags taxonomy pages                       | Done    |
| Related posts partial                     | Done    |
| RSS/Atom feed                             | Done    |
| `book` shortcode                          | Missing |
| `leaddevbook` shortcode                  | Done    |
| `message` shortcode                       | Done    |
| `typestream` shortcode                   | Done    |
| Draft filtering                           | Done    |
| Image optimization (`@11ty/eleventy-img`) | Done    |

### "The books I read in 20XX" Articles

These require the `book` shortcode with image processing. Complex migration – blocked by image optimization.

| Article                  | Status  |
|--------------------------|---------|
| the-books-i-read-in-2022 | Missing |
| the-books-i-read-in-2023 | Missing |
| the-books-i-read-in-2024 | Missing |
| the-books-i-read-in-2025 | Missing |

### Post Migration

- [ ] Make headers in main pages as fancy as home page
- [ ] Migrate all JS/TS files to TypeScript
- [ ] Move books article links from Goodreads to TheStoryGraph
- [ ] Improve RSS feed to include other sections (reading, hire, etc)
- [ ] Drop Sass in favor of vanilla CSS or PostCSS
- [ ] Update all content that refers to my repos (moved to monorepo)

## Tech Stack

- **SSG:** 11ty
- **Templating:** Liquid
- **Styling:** SCSS → CSS
- **Icons:** Lucide (esbuild bundled)
- **Build:** npm scripts + esbuild

## Development

```bash
npm install
npm run build    # Production build
npm run serve    # Dev server with hot reload
npm run css:build
npm run js:build
npm run prettier:write
```

## Project Structure

```
src/
├── _collections/     # 11ty collections
├── _data/            # Site data
├── _filters/         # Liquid filters
├── _includes/        # Partials (head, nav, footer)
├── _layouts/         # Templates
├── _shortcodes/      # Shortcodes
├── _preprocessors/   # Preprocessors (drafts)
├── assets/           # SCSS, JS, images
├── writing/          # Articles/Writings
├── reading/          # Book reviews
├── about/
├── hire/
└── credits/
```

## Project Structure

```
src/
├── _collections/     # 11ty collections
├── _data/            # Site data
├── _filters/         # Handlebars filters
├── _includes/        # Partials (head, nav, footer)
├── _layouts/         # Templates
├── _shortcodes/      # Icon shortcodes
├── assets/           # SCSS, JS, images
├── writing/          # Articles/Writings
├── reading/          # Book reviews
├── about/
├── hire/
└── credits/
```
