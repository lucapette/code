# ISBN Redirect

Cloudflare Worker that redirects ISBN numbers to their corresponding book pages on The StoryGraph.

## Overview

Simple API endpoint that takes ISBN numbers as input and redirects users to the respective book page on The StoryGraph. Built as a serverless function for fast, global distribution.

## Features

- ISBN to book page redirection
- Serverless deployment via Cloudflare Workers
- Fast global edge network
- Lightweight and minimal dependencies

## How It Works

1. Accepts ISBN as path parameter (`/redirect/{isbn}`)
2. Queries The StoryGraph for the book
3. Extracts the book page URL
4. Issues HTTP redirect to the target page

## Usage

Make a GET request to the worker endpoint:

```
https://your-worker.your-subdomain.workers.dev/redirect/{isbn}
```

Example:
```
https://your-worker.your-subdomain.workers.dev/redirect/9780226526812
```

## Tech Stack

- Cloudflare Workers
- TypeScript
- Hono framework
- node-html-parser for HTML parsing
- Zod for validation
- Wrangler CLI for deployment

## Development

Install dependencies and run locally:
```bash
npm install
npm run dev
```

Deploy to Cloudflare:
```bash
npm run deploy
```

## License

[MIT](/LICENSE) Copyright (c) [Luca Pette](https://lucapette.me)