import esbuild from "esbuild";

const srcDir = "src/assets/js/main.ts";
const distDir = "_site/assets/js";

const isProd = process.env.NODE_ENV === "production";

async function build(): Promise<void> {
  if (isProd) {
    await esbuild.build({
      entryPoints: [srcDir],
      bundle: true,
      minify: true,
      outdir: distDir,
      entryNames: "main.min.[hash]",
    });
    console.log("JS built for production");
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
}

async function watch(): Promise<void> {
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

const args = process.argv.slice(2);
const command = args[0];

if (command === "watch") {
  watch();
} else {
  build();
}
