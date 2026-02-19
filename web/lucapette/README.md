# lucapette.me

Personal website built with 11ty. Serves as my blog (writing), notes, and reading tracker.

## Stack

- **11ty** - Static site generator
- **Liquid** - Templating engine
- **TypeScript** - Shortcodes, filters, and build scripts
- **PostCSS + esbuild** - CSS/JS bundling
- **Prettier** - Code formatting
- **markdown-it** - Markdown parsing in shortcodes

## Project Structure

```
src/
├── _collections/     # Eleventy collections (writings, notes, tags)
├── _filters/         # Liquid filters (dates, assets)
├── _includes/       # Page includes (head, navigation, footer)
├── _layouts/         # Page templates (base, article, section, home, note)
├── _preprocessors/   # Content preprocessors (drafts)
├── _shortcodes/      # Custom Liquid shortcodes
├── assets/           # Static assets (CSS, JS, images)
│   └── notes/
│       └── reading/  # Reading notes (books read)
├── credits/          # Credits page
├── notes/            # Notes organized by category
│   └── programming/  # Programming notes
├── static/           # Static files (robots.txt, etc.)
├── writing/          # Blog posts
├── *.liquid          # Page templates (index, writing, notes, etc.)
```

## Content

### Writing (Blog)

Articles in `src/writing/*.md` (or directories with `index.md` for image-heavy posts) with frontmatter:

- `title` - Article title
- `date` - Publication date
- `tags` - Array of tags
- `draft` - Set to true to exclude from build
- `favourite` - Mark as favorite

### Notes

Notes organized by category (e.g., `src/notes/programming/`). Each note has frontmatter:

- `title` - Note title
- `date` - Creation date
- `tags` - Array of tags
- `author` - Author (if referencing external content)

### Reading

Notes on books I've read. Each book is a separate markdown file in `src/assets/notes/reading/*.md` with frontmatter containing book metadata (author, ISBN, etc.). The body contains quotes and commentary organized by page numbers.

## Shortcodes

- `{% book %}` - Embed book cover with link to Goodreads
- `{% image %}` - Optimized image with srcset
- `{% lucide %}` - SVG icon
- `{% message %}` - Callout box
- `{% leaddevbook %}` - Leading Developers book card
- `{% typestream %}` - Typestream embed

## Collections

- `writings` - All blog posts sorted by date
- `writingsByYear` - Blog posts grouped by year
- `favouriteWritings` - Favorited posts
- `relatedWritings` - Posts with matching tags
- `notes` - All notes sorted by date
- `notesByCategory` - Notes grouped by category
- `tagList` - All unique tags
- `tagPosts` - Posts grouped by tag

## Dev

```bash
npm install
npm run build
npm run dev
npm run typecheck
npm run lint
npm run prettier:write
```

## Credits

See [src/credits/credits.md](src/credits/credits.md) for a list of tools and libraries used.
