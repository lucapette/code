# lucapette.me

Personal website built with 11ty. Serves as my blog (writing) and reading tracker.

## Stack

- **11ty** - Static site generator
- **Liquid** - Templating engine
- **TypeScript** - Shortcodes and build scripts
- **PostCSS + esbuild** - CSS/JS bundling
- **Prettier** - Code formatting

## Project Structure

```
src/
├── _collections/     # Eleventy collections (writings, reading, tags)
├── _filters/         # Liquid filters (dates, assets)
├── _layouts/         # Page templates (base, article, section, home)
├── _preprocessors/   # Content preprocessors (drafts)
├── _shortcodes/      # Custom Liquid shortcodes
├── assets/           # Static assets (CSS, JS, images)
├── reading/          # Reading page content
├── static/           # Static files (robots.txt, etc.)
├── writing/          # Blog posts
├── *.liquid          # Page templates (index, reading, writing, etc.)
```

## Content

### Writing (Blog)

Articles in `src/writing/*.md` (or directories with `index.md` for image-heavy posts) with frontmatter:

- `title` - Article title
- `date` - Publication date
- `tags` - Array of tags
- `draft` - Set to true to exclude from build
- `featured` - Mark as favorite

### Reading

Notes on books I've read. Each book is a separate markdown file in `src/reading/*.md` with frontmatter containing book metadata (author, ISBN, etc.). The body contains quotes and commentary organized by page numbers.

## Shortcodes

- `{% book %}` - Embed book cover with link to Goodreads (used in articles, not reading collection)
- `{% image %}` - Optimized image with srcset
- `{% lucide %}` - SVG icon
- `{% message %}` - Callout box
- `{% leaddevbook %}` - Leading Developers book card
- `{% typestream %}` - Typestream embed

## Dev

```bash
npm install
npm run build
npm run dev
npm run typecheck
npm run lint
npm run prettier:write
```

## Todo

- [ ] Move books article links from Goodreads to TheStoryGraph
- [ ] Update all content that refers to my repos (moved to monorepo)
