import Image from "@11ty/eleventy-img";
import path from "node:path";

export async function imageShortcode(src, alt, sizes = "100vw", width = 128) {
  const inputPath = path.resolve("src", src);
  const metadata = await Image(inputPath, {
    widths: [width, width * 2],
    formats: ["webp"],
    outputDir: "./_site/img/",
    urlPath: "/img/",
  });

  return `<img src="${metadata.webp[0].url}" alt="${alt}" loading="lazy" decoding="async" width="${width}" height="${width}" srcset="${metadata.webp.map((s) => `${s.url} ${s.width}w`).join(", ")}" sizes="${sizes}">`;
}
