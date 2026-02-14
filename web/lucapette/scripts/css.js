import postcss from "postcss";
import postcssImport from "postcss-import";
import fs from "fs";
import path from "path";
import esbuild from "esbuild";

const srcDir = path.join(process.cwd(), "src/assets/css");
const distDir = path.join(process.cwd(), "_site/assets/css");

async function dev() {
  const mainCss = path.join(srcDir, "main.css");
  const css = fs.readFileSync(mainCss, "utf8");
  const result = await postcss([postcssImport()]).process(css, {
    from: mainCss,
  });
  fs.writeFileSync(path.join(distDir, "main.css"), result.css);
  console.log("CSS built for development");
}

async function prod() {
  const mainCss = path.join(srcDir, "main.css");
  const css = fs.readFileSync(mainCss, "utf8");
  const result = await postcss([postcssImport()]).process(css, {
    from: mainCss,
  });

  const prismNord = fs.readFileSync(path.join(srcDir, "prism-nord.css"), "utf8");
  const prismLineNumbers = fs.readFileSync(
    path.join(srcDir, "prism-line-numbers.css"),
    "utf8"
  );

  const combined = result.css + "\n" + prismNord + "\n" + prismLineNumbers;
  const tempFile = path.join(process.cwd(), "main.css");
  fs.writeFileSync(tempFile, combined);

  await esbuild.build({
    entryPoints: [tempFile],
    bundle: true,
    minify: true,
    outdir: distDir,
    entryNames: "main.min.[hash]",
  });

  fs.unlinkSync(tempFile);
  console.log("CSS built for production");
}

const args = process.argv.slice(2);
const command = args[0];

if (command === "prod") {
  prod();
} else {
  dev();
}
