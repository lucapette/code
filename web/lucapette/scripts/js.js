import esbuild from "esbuild";

const srcDir = "src/assets/js/main.js";
const distDir = "_site/assets/js";

async function dev() {
  const ctx = await esbuild.context({
    entryPoints: [srcDir],
    bundle: true,
    outdir: distDir,
    format: "esm",
    target: "es2020",
  });
  await ctx.watch();
  console.log("JS watching for changes...");
}

async function prod() {
  await esbuild.build({
    entryPoints: [srcDir],
    bundle: true,
    minify: true,
    outdir: distDir,
    entryNames: "main.min.[hash]",
  });
  console.log("JS built for production");
}

const args = process.argv.slice(2);
const command = args[0];

if (command === "prod") {
  prod();
} else if (command === "watch") {
  dev();
} else {
  await esbuild.build({
    entryPoints: [srcDir],
    bundle: true,
    outdir: distDir,
    format: "esm",
    target: "es2020",
  });
  console.log("JS built for development");
}
