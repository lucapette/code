# ISBN Redirect

ISBN Redirect is a Cloudflare Worker that provides a simple API endpoint to redirect ISBN numbers to their corresponding book pages on The StoryGraph.

## How It Works

The service accepts ISBN numbers as path parameters and redirects users to the respective book page on The StoryGraph. It works by:

1. Taking an ISBN as input in the URL path (`/redirect/{isbn}`)
2. Searching for the ISBN on The StoryGraph
3. Scraping the resulting HTML to extract the book link
4. Redirecting the user to the book page

## Usage

Make a GET request to:

```
https://your-worker.your-subdomain.workers.dev/redirect/{isbn}
```

For example:
```
https://your-worker.your-subdomain.workers.dev/redirect/9780226526812
```

## Development

### Prerequisites
- Node.js
- Wrangler CLI (`npm install -g wrangler`)

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```

### Deployment
```bash
npm run deploy
```

## License

MIT
