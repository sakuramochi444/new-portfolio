import { mkdir, readdir, stat } from "node:fs/promises";
import { extname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = fileURLToPath(new URL(".", import.meta.url));
const worksDirectory = join(scriptDirectory, "..", "public", "images", "works");
const displayDirectory = join(worksDirectory, "display");
const variants = [
  { suffix: "-480.webp", width: 480, quality: 76 },
  { suffix: "-960.webp", width: 960, quality: 82 },
];

async function needsUpdate(sourcePath, outputPath) {
  try {
    const [sourceInfo, outputInfo] = await Promise.all([stat(sourcePath), stat(outputPath)]);
    return sourceInfo.mtimeMs > outputInfo.mtimeMs;
  } catch {
    return true;
  }
}

const sourceFiles = (await readdir(worksDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".png")
  .map((entry) => entry.name)
  .sort();

let generatedCount = 0;

await mkdir(displayDirectory, { recursive: true });

for (const sourceFile of sourceFiles) {
  const sourcePath = join(worksDirectory, sourceFile);
  const sourceName = parse(sourceFile).name;

  for (const variant of variants) {
    const outputPath = join(displayDirectory, `${sourceName}${variant.suffix}`);
    if (!(await needsUpdate(sourcePath, outputPath))) continue;

    await sharp(sourcePath)
      .rotate()
      .resize({ width: variant.width, withoutEnlargement: true })
      .webp({ quality: variant.quality, effort: 5 })
      .toFile(outputPath);
    generatedCount += 1;
  }
}

console.log(
  generatedCount > 0
    ? `Generated ${generatedCount} responsive WebP image(s).`
    : `All ${sourceFiles.length} work image(s) are already optimized.`,
);
