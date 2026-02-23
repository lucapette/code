import postcss from "postcss";
import postcssImport from "postcss-import";
import esbuild from "esbuild";
import fs from "fs";
import path from "path";

const srcDir = path.join(process.cwd(), "src/assets");
const distDir = path.join(process.cwd(), "_site/assets");
const cssSrcDir = path.join(srcDir, "css");
const cssDistDir = path.join(distDir, "css");
const jsSrcDir = path.join(srcDir, "js");
const jsDistDir = path.join(distDir, "js");

const isProd = process.env.NODE_ENV === "production";

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function buildCss(): Promise<void> {
  const mainCss = path.join(cssSrcDir, "main.css");
  const css = fs.readFileSync(mainCss, "utf8");
  const result = await postcss([postcssImport()]).process(css, {
    from: mainCss,
  });

  if (isProd) {
    const prismNord = fs.readFileSync(
      path.join(cssSrcDir, "prism-nord.css"),
      "utf8",
    );
    const prismLineNumbers = fs.readFileSync(
      path.join(cssSrcDir, "prism-line-numbers.css"),
      "utf8",
    );

    const combined = result.css + "\n" + prismNord + "\n" + prismLineNumbers;
    const tempFile = path.join(process.cwd(), "main.css");
    fs.writeFileSync(tempFile, combined);

    await esbuild.build({
      entryPoints: [tempFile],
      bundle: true,
      minify: true,
      outdir: cssDistDir,
      entryNames: "main.min.[hash]",
    });

    fs.unlinkSync(tempFile);
    console.log("CSS built for production");
  } else {
    ensureDir(cssDistDir);
    fs.writeFileSync(path.join(cssDistDir, "main.css"), result.css);
    console.log("CSS built for development");
  }
}

export async function buildJs(): Promise<void> {
  const srcFile = path.join(jsSrcDir, "main.ts");

  if (isProd) {
    await esbuild.build({
      entryPoints: [srcFile],
      bundle: true,
      minify: true,
      outdir: jsDistDir,
      entryNames: "main.min.[hash]",
    });
    console.log("JS built for production");
  } else {
    await esbuild.build({
      entryPoints: [srcFile],
      bundle: true,
      outdir: jsDistDir,
      format: "esm",
      target: "es2020",
    });
    console.log("JS built for development");
  }
}

export function generateManifest(): void {
  if (!isProd) return;

  const manifest: Record<string, string> = {};

  const cssFiles = fs.readdirSync(cssDistDir);
  const mainCss = cssFiles.find(
    (f) => f.startsWith("main.min.") && f.endsWith(".css"),
  );
  if (mainCss) {
    manifest["css/main.css"] = `css/${mainCss}`;
  }

  const jsFiles = fs.readdirSync(jsDistDir);
  const mainJs = jsFiles.find(
    (f) => f.startsWith("main.min.") && f.endsWith(".js"),
  );
  if (mainJs) {
    manifest["js/main.js"] = `js/${mainJs}`;
  }

  fs.writeFileSync(
    path.join(distDir, "manifest.json"),
    JSON.stringify(manifest),
  );
  console.log("Generated manifest.json:", manifest);
}

export function hasChanged(
  files: string[] | undefined,
  type: "css" | "js",
): boolean {
  if (!files) return true;
  const dir = type === "css" ? "/css/" : "/js/";
  return files.some((f) => f.includes(dir));
}

export async function buildAll(): Promise<void> {
  await buildCss();
  await buildJs();
  generateManifest();
}
