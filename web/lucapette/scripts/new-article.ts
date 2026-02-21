import fs from "fs";
import path from "path";
import readline from "readline";

function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const filenameArg = process.argv[2];
  const titleArg = filenameArg || "";

  const title =
    (await ask(`"Title"${filenameArg ? ` (${filenameArg})` : ""}: `)) ||
    titleArg;

  if (!title) {
    console.error("Title is required");
    process.exit(1);
  }

  const filename = `${kebabCase(title)}.md`;
  const filePath = path.join(process.cwd(), "src/writing", filename);

  if (fs.existsSync(filePath)) {
    console.error(`File already exists: ${filename}`);
    process.exit(1);
  }

  const today = new Date().toISOString().split("T")[0];
  const description = await ask('"Description": ');
  const keywords = await ask("Keywords (comma separated): ");
  const tags = await ask("Tags (comma separated): ");

  const tagsList = tags
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t)
    .map((t) => `  - ${t}`)
    .join("\n");

  const content = `---
title: ${title}
description: ${description}
date: "${today}"
tags:
${tagsList}
keywords: ${keywords}
draft: true
---

`;

  fs.writeFileSync(filePath, content);
  console.log(`Created: ${filename}`);
}

main();
