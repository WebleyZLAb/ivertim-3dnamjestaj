import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { analyzeCorpusMacroPayload, decodeCorpusText } from "../lib/corpus-macro.ts";
import { flattenCorpusS3dElements, parseCorpusE3d, parseCorpusS3d } from "../lib/corpus-s3d.ts";

const root = path.resolve(process.argv[2] ?? ".");
const sampleLimit = Math.max(0, Number(process.argv[3] ?? 4) || 0);
const files = await findCorpusFiles(root);
const macros = new Map<string, MacroRecord>();
const signatures = new Map<string, number>();
const fieldValues = new Map<string, Map<string, number>>();
let parsed = 0;
let failed = 0;
let sawPayloads = 0;
let decodeFailures = 0;

for (const file of files) {
  try {
    const xml = await readFile(file, "utf8");
    const inspection = path.extname(file).toLowerCase() === ".s3d" ? parseCorpusS3d(xml) : parseCorpusE3d(xml);
    parsed += 1;
    for (const element of flattenCorpusS3dElements(inspection.elements)) {
      for (const link of element.macroLinks) {
        for (const [macroName, payloads] of [[link.name, link.encodedPayloads.MSPI], [link.secondaryName, link.secondaryEncodedPayloads.MSPI]] as const) {
          if (!payloads) continue;
          for (const encoded of payloads) {
            sawPayloads += 1;
            try {
              const decoded = decodeCorpusText(inflateSync(Buffer.from(encoded.replaceAll(/\s/g, ""), "base64")));
              const analysis = analyzeCorpusMacroPayload(decoded);
              const entries = analysis.assignments.map(({ name, expression }) => [name.toUpperCase(), expression] as const);
              const signature = [...new Set(entries.map(([key]) => key))].sort().join(",");
              increment(signatures, signature);
              for (const [key, value] of entries) {
                const values = fieldValues.get(key) ?? new Map<string, number>();
                increment(values, summarize(value));
                fieldValues.set(key, values);
              }
              const name = macroName || "(bez naziva)";
              const record = macros.get(name) ?? { count: 0, files: new Set<string>(), payloadHashes: new Set<string>(), samples: [] };
              record.count += 1;
              record.files.add(path.relative(root, file));
              record.payloadHashes.add(createHash("sha256").update(decoded).digest("hex"));
              if (record.samples.length < sampleLimit) record.samples.push({
                file: path.relative(root, file), element: element.name,
                values: Object.fromEntries(entries.map(([key, value]) => [key, summarize(value)])),
              });
              macros.set(name, record);
            } catch {
              decodeFailures += 1;
            }
          }
        }
      }
    }
  } catch {
    failed += 1;
  }
}

console.log(JSON.stringify({
  root, files: files.length, parsed, failed, sawPayloads, decodeFailures,
  signatures: sortedCounts(signatures),
  macros: Object.fromEntries([...macros.entries()]
    .sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0]))
    .map(([name, record]) => [name, {
      count: record.count, fileCount: record.files.size, uniquePayloads: record.payloadHashes.size,
      files: [...record.files].slice(0, 12), samples: record.samples,
    }])),
  fields: Object.fromEntries([...fieldValues.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, values]) => [key, sortedCounts(values, 20)])),
}, null, 2));

interface MacroRecord {
  count: number;
  files: Set<string>;
  payloadHashes: Set<string>;
  samples: Array<{ file: string; element: string; values: Record<string, string> }>;
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

async function findCorpusFiles(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await findCorpusFiles(fullPath));
    else if (entry.isFile() && [".s3d", ".e3d"].includes(path.extname(entry.name).toLowerCase())) result.push(fullPath);
  }
  return result.sort((left, right) => left.localeCompare(right));
}
