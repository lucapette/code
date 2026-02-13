# lucapette.me Website

Source code for [lucapette.me](https://lucapette.me), migrated from Hugo to 11ty+Handlebars. See [web/main](../main) for
the original Hugo version.

## Goal: Feature Parity with web/main

This site is in active migration from Hugo to 11ty. The primary focus is reaching full feature parity with `web/main`.

### Naming Conventions

The new site uses **"article"** everywhere instead of **"post"** (Hugo's terminology). This applies to CSS classes,
variable names, etc.

### In Progress

### To Do (Feature Parity)

| Feature                                   | Status  |
|-------------------------------------------|---------|
| Tags taxonomy pages                       | Done    |
| Related posts partial                     | Done    |
| RSS/Atom feed                             | Done    |
| `book` shortcode                          | Missing |
| `leading-developers` shortcode            | Done    |
| `message` shortcode                       | Done    |
| `typestream` shortcode                    | Done    |
| Draft filtering                           | Done    |
| Image optimization (`@11ty/eleventy-img`) | Missing |

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
- [ ] Use Eleventy bundle feature instead of esbuild (attempted - not working well with ESM lucide package)
- [ ] Drop Sass in favor of vanilla CSS or PostCSS
- [ ] Update all content that refers to my repos (moved to monorepo)

## Tech Stack

- **SSG:** 11ty
- **Templating:** Handlebars
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
