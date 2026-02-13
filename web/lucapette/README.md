# lucapette.me Website

This is the source code for [lucapette.me](https://lucapette.me), migrated from Hugo to 11ty+Handlebars.

## Current Status

This project is in a **partially working state**. While the basic functionality is operational, there are several visual and functional issues that need to be addressed:

- ✅ Basic layout and navigation work
- ✅ Icons and theme toggle functionality work
- ✅ CSS styling - all CSS files loaded properly
- ✅ Reading page shows book covers in grid
- ✅ Home page highlights section works
- ⚠️ Drafts showing in production
- ⚠️ "The books I read in 20XX" articles missing (complex Hugo shortcode migration)
- ⚠️ Writing page list shows bullets (should be clean list)
- ⚠️ Single post layout missing tags and proper dates
- ⚠️ Image optimization not set up (need @11ty/eleventy-img)

## Tech Stack

- **Static Site Generator:** 11ty
- **Template Engine:** Handlebars
- **Styling:** SCSS compiled to CSS
- **Icons:** Lucide icons (bundled with esbuild)
- **Build Tool:** npm scripts + esbuild for JS bundling

## Project Structure

```
src/
├── _collections/     # 11ty collections (posts, reading, etc.)
├── _data/           # Global site data
├── _filters/        # Handlebars filters
├── _includes/       # Reusable partials (head, nav, footer)
├── _layouts/        # Page templates
├── _shortcodes/     # Icon shortcode definitions
├── assets/          # SCSS, JS, and images
├── writing/         # Writing posts
├── reading/         # Book review posts
├── about/           # About page
├── hire/            # Hire me page
└── credits/         # Credits page
```

## Development Commands

```bash
# Install dependencies
npm install

# Build the site
npm run build

# Serve with hot reload
npm run serve

# Format code
npm run prettier:write

# Compile SCSS
npm run css:build

# Bundle JS
npm run js:build
```

## Known Issues

1. **Drafts showing:** The site is showing draft posts - need to filter them out
2. **"The books I read in 20XX" articles:** These posts use Hugo shortcodes that need manual conversion. The shortcode `{{< book >}}` wraps book reviews and needs image processing support.
3. **Writing list shows bullets:** CSS issue - the list should be styled without bullets
4. **Single post layout:** Tags and dates are not displaying correctly
5. **Image optimization:** Need to install and configure @11ty/eleventy-img for proper image handling

## Fixes Applied

1. Added esbuild to bundle JavaScript for Lucide icons and theme toggle
2. Fixed SCSS node_modules paths to match project structure
3. Fixed CSS loading - now all CSS files (content, layout, elements, dark, reading) are included in head
4. Fixed home layout to use bundled JS
5. Added book cover images to reading page and updated template to show grid layout
6. Copied book cover images from main site to src/assets/reading/
7. Added favourites collection and fixed highlights section on home page
8. Copied me.png profile image

## Migration Notes

This site was migrated from a Hugo-based setup to the Club Matto 11ty+Handlebars stack. The migration included:
- Converting all content from Hugo's markdown format
- Migrating shortcodes to 11ty-compatible formats (partially complete)
- Updating templates from Hugo layouts to Handlebars
- Adapting the SCSS/CSS pipeline to work with 11ty
- Adding esbuild for JS bundling

## What's Missing from Original Site

- Tags taxonomy pages and functionality
- Related posts partial
- RSS feed configuration
- Some shortcodes (book, leading-developers, message, typestream)
- Image optimization pipeline
- Draft filtering
