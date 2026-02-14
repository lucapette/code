import fs from "fs";
import path from "path";

const assetsDir = path.join(process.cwd(), "_site/assets");

const manifest = {};

const cssDir = path.join(assetsDir, "css");
const jsDir = path.join(assetsDir, "js");

if (fs.existsSync(cssDir)) {
  const cssFiles = fs.readdirSync(cssDir);
  const mainCss = cssFiles.find(
    (f) => f.startsWith("main.min.") && f.endsWith(".css"),
  );
  if (mainCss) {
    manifest["css/main.scss"] = `css/${mainCss}`;
  }
}

if (fs.existsSync(jsDir)) {
  const jsFiles = fs.readdirSync(jsDir);
  const mainJs = jsFiles.find(
    (f) => f.startsWith("main.min.") && f.endsWith(".js"),
  );
  if (mainJs) {
    manifest["js/main.js"] = `js/${mainJs}`;
  }
}

fs.writeFileSync(
  path.join(assetsDir, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);

console.log("Generated manifest.json:", manifest);
