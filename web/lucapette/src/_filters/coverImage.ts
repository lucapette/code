import Image from "@11ty/eleventy-img";
import path from "node:path";
import fs from "node:fs";

interface CoverImageFilterThis {
  page?: {
    fileSlug?: string;
    inputPath?: string;
    [key: string]: unknown;
  };
}

async function getCoverImageMetadata(
  imagePath: string,
  width = 1200,
): Promise<{ webp: string; jpeg: string } | null> {
  if (!fs.existsSync(imagePath)) {
    return null;
  }

  try {
    const metadata = await Image(imagePath, {
      widths: [width],
      formats: ["webp", "jpeg"],
      outputDir: "./_site/img/",
      urlPath: "/img/",
    });

    const webp = metadata.webp?.[0];
    const jpeg = metadata.jpeg?.[0];

    if (!webp) {
      return null;
    }

    return {
      webp: webp.url,
      jpeg: jpeg?.url || "",
    };
  } catch (e) {
    console.error("Error processing cover image:", e);
    return null;
  }
}

export async function coverImageFilter(
  this: CoverImageFilterThis,
  width = 1200,
): Promise<string> {
  const page = this.page;

  if (!page?.fileSlug) {
    return "";
  }

  const slug = page.fileSlug;
  const coversDir = path.resolve("src/assets/covers");
  const imagePath = path.resolve(coversDir, `${slug}.jpg`);

  const result = await getCoverImageMetadata(imagePath, width);

  if (!result) {
    return "";
  }

  return JSON.stringify({
    ...result,
    hasCover: true,
  });
}

export async function coverImageWebp(
  this: CoverImageFilterThis,
  width = 1200,
): Promise<string> {
  const result = await coverImageFilter.call(this, width);
  if (!result) return "";
  const data = JSON.parse(result);
  return data.webp || "";
}

export async function coverImageJpeg(
  this: CoverImageFilterThis,
  width = 1200,
): Promise<string> {
  const result = await coverImageFilter.call(this, width);
  if (!result) return "";
  const data = JSON.parse(result);
  return data.jpeg || "";
}

export async function hasCover(this: CoverImageFilterThis): Promise<boolean> {
  const result = await coverImageFilter.call(this);
  if (!result) return false;
  const data = JSON.parse(result);
  return data.hasCover || false;
}
