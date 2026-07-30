import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(projectRoot, "src/js");

async function javascriptFiles(directory, relativePrefix = "") {
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => path.join(relativePrefix, entry.name));
}

const files = [
  ...(await javascriptFiles(projectRoot)),
  ...(await javascriptFiles(sourceRoot, "src/js"))
];

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: projectRoot,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log(`verified ${files.length} JavaScript files`);
}
