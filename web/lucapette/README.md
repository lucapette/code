# lucapette.me Website

Source code for [lucapette.me](https://lucapette.me), migrated from Hugo to 11ty+Handlebars. See [web/main](../main) for
the original Hugo version.

## Goal: Feature Parity with web/main

This site is in active migration from Hugo to 11ty. The primary focus is reaching full feature parity with `web/main`.

### In Progress

### To Do (Feature Parity)

| Feature                                   | Status  |
|-------------------------------------------|---------|
| Tags taxonomy pages                       | Missing |
| Related posts partial                     | Missing |
| RSS/Atom feed                             | Missing |
| `book` shortcode                          | Missing |
| `leading-developers` shortcode            | Missing |
| `message` shortcode                       | Missing |
| `typestream` shortcode                    | Missing |
| Draft filtering                           | Done    |
| Image optimization (`@11ty/eleventy-img`) | Missing |

### "The books I read in 20XX" Articles

These require the `book` shortcode with image processing. Complex migration – blocked by image optimization.

### Post Migration

- [ ] Migrate all JS/TS files to TypeScript
- [ ] Move books article links from Goodreads to TheStoryGraph
- [ ] Use Eleventy bundle feature instead of esbuild
- [ ] Drop Sass in favor of vanilla CSS or PostCSS

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
