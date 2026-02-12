# Leading Developers

A comprehensive guide to engineering leadership, built with a custom multi-format publishing toolchain (PDF, EPUB, web).

## Overview

Practical insights into engineering leadership across six key areas:
- People management
- Team culture
- Communication strategies
- Process design
- Team organization
- Personal sustainability

## Building the Book

The publishing system generates multiple formats from a single Markdown source:

- **Web Version**: Built with mdBook static site generator
- **PDF**: Generated via Pandoc → WeasyPrint
- **EPUB**: Generated directly via Pandoc

### Build Commands

```bash
make html  # Build web version
make pdf   # Build PDF
make epub  # Build EPUB
make all   # Build all formats
```

### Tech Stack

Built with Ruby scripts, Pandoc, mdBook, PostCSS, and custom HTML/CSS templates.

## Structure

- Source files: `0-introduction.md` through `7-appendix.md`
- Build system: Custom toolchain orchestrated by Makefile
- Output: Multi-platform compatible formats

## License

[MIT](/LICENSE) Copyright (c) [Luca Pette](https://lucapette.me)