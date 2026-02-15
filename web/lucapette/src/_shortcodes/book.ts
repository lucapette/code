import Image from "@11ty/eleventy-img";
import path from "node:path";
import fs from "node:fs";

interface BookShortcodeThis {
  page?: {
    inputPath?: string;
    [key: string]: unknown;
  };
}

export async function bookShortcode(
  this: BookShortcodeThis,
  content: string,
  id: string,
  title: string,
  name: string,
  width = 200,
): Promise<string> {
  const page = this.page;

  let imageHtml = "";
  let imagePath = "";

  if (page && name) {
    imagePath = path.resolve(path.dirname(page.inputPath as string), name);

    if (fs.existsSync(imagePath)) {
      try {
        const metadata = await Image(imagePath, {
          widths: [200, 400],
          formats: ["webp"],
          outputDir: "./_site/img/",
          urlPath: "/img/",
        });

        if (metadata && metadata.webp && metadata.webp.length > 0) {
          const small = metadata.webp[0];
          const medium = metadata.webp[1] || metadata.webp[0];

          imageHtml = `
    <a class="book-cover" href="https://www.goodreads.com/book/show/${id}">
      <img src="${small.url}" srcset="${small.url} 200w, ${medium.url} 400w" sizes="(max-width: 600px) 128px, 800px" alt="${title}" width="${width}" />
    </a>`;
        }
      } catch (e) {
        console.error("Error processing image:", e);
      }
    }
  }

  return `<div class="book">
  ${imageHtml}

  <div class="book-review">
    ${content}
  </div>
</div>`;
}
