import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { analyzeCorpusMacroPayload, decodeCorpusText } from "../lib/corpus-macro.ts";
import { flattenCorpusS3dElements, parseCorpusE3d } from "../lib/corpus-s3d.ts";

const root = path.resolve(process.argv[2] ?? ".");
const files = await findE3dFiles(root);
const signatures = new Map<string, { count: number; macros: Set<string>; examples: string[] }>();
let rasterPayloads = 0;
let decodeFailures = 0;

for (const file of files) {
  const project = parseCorpusE3d(await readFile(file, "utf8"));
  for (const element of flattenCorpusS3dElements(project.elements)) {
    for (const link of element.macroLinks) {
      for (const [section, payloads] of Object.entries(link.encodedPayloads)) {
        if (section.toUpperCase() !== "MSRA") continue;
        for (const payload of payloads) {
          rasterPayloads += 1;
          try {
            const text = decodeCorpusText(inflateSync(Buffer.from(payload.replaceAll(/\s/g, ""), "base64")));
            const fields = Object.fromEntries(analyzeCorpusMacroPayload(text).assignments.map(({ name, expression }) => [name, expression]));
            const signature = ["GB", "GX", "GY", "GS", "GK", "GP", "GR"].map((key) => `${key}=${fields[key] ?? "?"}`).join(" | ");
            const record = signatures.get(signature) ?? { count: 0, macros: new Set<string>(), examples: [] };
            record.count += 1;
            record.macros.add(link.name || "(bez naziva)");
            if (record.examples.length < 3) record.examples.push(path.relative(root, file));
            signatures.set(signature, record);
          } catch {
            decodeFailures += 1;
          }
        }
      }
    }
  }
}

console.log(JSON.stringify({
  root, files: files.length, rasterPayloads, decodeFailures, uniqueSignatures: signatures.size,
  signatures: [...signatures.entries()].sort((left, right) => right[1].count - left[1].count).map(([signature, record]) => ({
    count: record.count, macros: [...record.macros].sort(), signature, examples: record.examples,
  })),
}, null, 2));

async function findE3dFiles(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await findE3dFiles(fullPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".e3d")) result.push(fullPath);
  }
  return result;
}
