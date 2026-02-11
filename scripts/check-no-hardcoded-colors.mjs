import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = path.resolve(process.cwd(), "src");
const allowlist = new Set([path.join("styles", "index.css")]);
const colorLiteralPattern = /#[\da-fA-F]{3,8}\b|rgba?\(\s*\d|hsla?\(\s*\d/g;

async function collectCssFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const nextPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        return collectCssFiles(nextPath);
      }
      if (!entry.isFile() || !entry.name.endsWith(".css")) {
        return [];
      }
      return [nextPath];
    })
  );
  return files.flat();
}

async function main() {
  const cssFiles = await collectCssFiles(rootDir);
  const violations = [];

  for (const absoluteFilePath of cssFiles) {
    const relativeFilePath = path.relative(rootDir, absoluteFilePath);
    if (allowlist.has(relativeFilePath)) {
      continue;
    }

    const content = await readFile(absoluteFilePath, "utf8");
    if (!colorLiteralPattern.test(content)) {
      continue;
    }
    colorLiteralPattern.lastIndex = 0;

    const lines = content.split("\n");
    lines.forEach((line, index) => {
      if (!colorLiteralPattern.test(line)) {
        return;
      }
      colorLiteralPattern.lastIndex = 0;
      violations.push(`${path.join("src", relativeFilePath)}:${index + 1}: ${line.trim()}`);
    });
  }

  if (violations.length === 0) {
    console.log("No hardcoded color literals found outside src/styles/index.css.");
    return;
  }

  console.error("Hardcoded color literals are not allowed outside src/styles/index.css:");
  violations.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

main().catch((error) => {
  console.error("Failed to run hardcoded color check.");
  console.error(error);
  process.exit(1);
});
