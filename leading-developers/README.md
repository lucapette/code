# Leading Developers

A comprehensive guide to engineering leadership, built with a custom publishing toolchain that generates multiple formats from a single source.

## Overview

This book provides practical insights into engineering leadership across six key areas:
- People management
- Team culture
- Communication strategies  
- Process design
- Team organization
- Personal sustainability

## Publishing Toolchain

The book uses a sophisticated multi-format publishing system built around Pandoc and custom scripts:

### Core Components
- **Source files**: Markdown files (`0-introduction.md` through `7-appendix.md`)
- **Build system**: Makefile orchestrating the entire publishing pipeline
- **Formatting**: Custom CSS processed via PostCSS with CSS variables support
- **Metadata**: Centralized in `metadata.yml` and `book.toml`

### Output Formats

#### Web Version
- Built with **mdBook** (static site generator)
- Enhanced with **Mermaid.js** for diagrams
- Custom HTML template and styling
- React-based web interface in `/web` directory using Vite, TypeScript, and Bulma

#### PDF
- Generated via **Pandoc** → **WeasyPrint**
- Uses custom HTML template (`assets/html.template`)
- Applies processed CSS styles
- Includes automatic table of contents

#### EPUB
- Generated directly via **Pandoc**
- Compatible with all major e-reader platforms
- Embeds custom styling and metadata

#### Table of Contents
- Auto-generated Ruby script creates both:
  - Static TOC.md for documentation
  - React component (`Toc.tsx`) for web version

### Build Process
1. **Preprocessing**: `bin/mdbookify` splits chapters into hierarchical structure for mdBook
2. **CSS Processing**: `postcss` compiles CSS with variable support
3. **Format Generation**: 
   - `make html` → builds web version with mdBook
   - `make pdf` → generates PDF via WeasyPrint
   - `make epub` → creates EPUB file
   - `make all` → builds all formats

### Key Scripts
- `bin/common`: Shared configuration and date handling
- `bin/mdbookify`: Transforms flat markdown into mdBook-compatible structure
- `bin/toc`: Generates table of contents in multiple formats
- `bin/pdf`/`bin/epub`: Format-specific Pandoc wrappers
- Lua filters: Handle link processing and content transformation

### Dependencies
- **Ruby**: For preprocessing scripts
- **Pandoc**: Core document conversion
- **WeasyPrint**: PDF generation
- **mdBook**: Web version static site generator
- **Node.js/Yarn**: CSS processing and web development
- **PostCSS**: CSS compilation with variables

The system ensures consistent content across all formats while maintaining a single source of truth in the original markdown files.