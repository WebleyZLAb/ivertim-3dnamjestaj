import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseCorpusCmk } from "../lib/corpus-cmk.ts";
import { decodeCorpusText } from "../lib/corpus-macro.ts";

const root = path.resolve(process.argv[2] ?? ".");
const files = await findFiles(root, ".cmk");
const sections = new Map<string, number>();
const failures: { file: string; error: string }[] = [];
let parsed = 0;
let empty = 0;
let entries = 0;
let supportedExpressions = 0;
let unparsedLines = 0;

for (const file of files) {
  try {
    const bytes = await readFile(file);
    if (!bytes.length) { empty += 1; continue; }
    const document = parseCorpusCmk(decodeCorpusText(bytes));
    parsed += 1;
    unparsedLines += document.unparsedLines.length;
    for (const section of document.sections) {
      sections.set(section.name, (sections.get(section.name) ?? 0) + 1);
      entries += section.entries.length;
      supportedExpressions += section.entries.filter(({ syntaxSupported }) => syntaxSupported).length;
    }
  } catch (reason) {
    failures.push({ file: path.relative(root, file), error: reason instanceof Error ? reason.message : String(reason) });
  }
}

console.log(JSON.stringify({
  root, files: files.length, parsed, empty, failed: failures.length, entries, supportedExpressions,
  nonExpressionValues: entries - supportedExpressions, unparsedLines,
  sections: Object.fromEntries([...sections.entries()].sort((left, right) => right[1] - left[1])),
  failures,
}, null, 2));

async function findFiles(directory: string, extension: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await findFiles(fullPath, extension));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) result.push(fullPath);
  }
  return result;
}
