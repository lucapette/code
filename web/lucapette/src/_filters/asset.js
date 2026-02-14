import fs from "fs";
import path from "path";

export function asset(filename) {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    const ext = path.extname(filename);
    if (ext === ".scss") {
      filename = filename.replace(/\.scss$/, ".css");
    }
    return `/assets/${filename}`;
  }

  const manifestPath = path.join(process.cwd(), "_site/assets/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  return `/assets/${manifest[filename]}`;
}
