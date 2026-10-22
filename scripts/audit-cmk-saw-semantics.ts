import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseCorpusCmk } from "../lib/corpus-cmk.ts";
import { decodeCorpusText } from "../lib/corpus-macro.ts";

const root = path.resolve(process.argv[2] ?? ".");
const sampleLimit = Math.max(0, Number(process.argv[3] ?? 4) || 0);
const files = await findFiles(root, ".cmk");
const signatures = new Map<string, SignatureRecord>();
const fields = new Map<string, FieldRecord>();
const names = new Map<string, number>();
const failures: { file: string; error: string }[] = [];
let parsed = 0;
let sawOperations = 0;

for (const file of files) {
  try {
    const bytes = await readFile(file);
    if (!bytes.length) continue;
    const document = parseCorpusCmk(decodeCorpusText(bytes));
    parsed += 1;
    for (const section of document.sections.filter(({ name }) => /^PILA\d+$/i.test(name))) {
      sawOperations += 1;
      const keys = section.entries.map(({ key }) => key.toUpperCase());
      const signature = [...new Set(keys)].sort().join(",");
      const signatureRecord = signatures.get(signature) ?? { count: 0, files: new Set<string>(), samples: [] };
      signatureRecord.count += 1;
      signatureRecord.files.add(path.relative(root, file));
      if (signatureRecord.samples.length < sampleLimit) signatureRecord.samples.push({
        file: path.relative(root, file), section: section.name,
        values: Object.fromEntries(section.entries.map(({ key, value }) => [key.toUpperCase(), summarize(value)])),
      });
      signatures.set(signature, signatureRecord);

      for (const entry of section.entries) {
        const key = entry.key.toUpperCase();
        const field = fields.get(key) ?? { count: 0, literalValues: new Map<string, number>(), dependencies: new Map<string, number>() };
        field.count += 1;
        increment(field.literalValues, summarize(entry.value));
        for (const dependency of entry.dependencies) increment(field.dependencies, dependency.toUpperCase());
        fields.set(key, field);
        if (key === "GN") increment(names, entry.value || "(prazno)");
      }
    }
  } catch (reason) {
    failures.push({ file: path.relative(root, file), error: reason instanceof Error ? reason.message : String(reason) });
  }
}

console.log(JSON.stringify({
  root, files: files.length, parsed, failed: failures.length, sawOperations,
  operationNames: sortedCounts(names),
  signatures: Object.fromEntries([...signatures.entries()]
    .sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0]))
    .map(([signature, record]) => [signature, {
      count: record.count, fileCount: record.files.size, files: [...record.files].slice(0, 12), samples: record.samples,
    }])),
  fields: Object.fromEntries([...fields.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, field]) => [key, {
    count: field.count,
    values: sortedCounts(field.literalValues, 20),
    dependencies: sortedCounts(field.dependencies, 20),
  }])),
  failures,
}, null, 2));

interface SignatureRecord {
  count: number;
  files: Set<string>;
  samples: Array<{ file: string; section: string; values: Record<string, string> }>;
}

interface FieldRecord {
  count: number;
  literalValues: Map<string, number>;
  dependencies: Map<string, number>;
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sortedCounts(map: Map<string, number>, limit = Number.POSITIVE_INFINITY): Record<string, number> {
  return Object.fromEntries([...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit));
}

function summarize(value: string): string {
  if (value.length <= 160) return value;
  return `[${value.length} znakova, sha256:${createHash("sha256").update(value).digest("hex").slice(0, 12)}]`;
}

async function findFiles(directory: string, extension: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await findFiles(fullPath, extension));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) result.push(fullPath);
  }
  return result.sort((left, right) => left.localeCompare(right));
}
