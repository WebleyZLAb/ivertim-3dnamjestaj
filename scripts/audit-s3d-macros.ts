import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { analyzeCorpusMacroPayload, decodeCorpusText } from "../lib/corpus-macro.ts";
import { flattenCorpusS3dElements, parseCorpusS3d } from "../lib/corpus-s3d.ts";

const root = path.resolve(process.argv[2] ?? ".");
const files = await findS3dFiles(root);
const macroNames = new Map<string, {
  occurrences: number; sections: Set<string>; payloadHashes: Set<string>;
  inputVariables: Set<string>; assignments: number; unsupportedAssignments: number;
}>();
let macroLinks = 0;
let encodedSections = 0;
let decodeFailures = 0;
let assignments = 0;
let supportedAssignments = 0;

for (const file of files) {
  const project = parseCorpusS3d(await readFile(file, "utf8"));
  for (const element of flattenCorpusS3dElements(project.elements)) {
    for (const link of element.macroLinks) {
      macroLinks += 1;
      const name = link.name || "(bez naziva)";
      const record = macroNames.get(name) ?? {
        occurrences: 0, sections: new Set<string>(), payloadHashes: new Set<string>(),
        inputVariables: new Set<string>(), assignments: 0, unsupportedAssignments: 0,
      };
      record.occurrences += 1;
      for (const payloadSet of [link.encodedPayloads, link.secondaryEncodedPayloads]) {
        for (const [section, encodedValues] of Object.entries(payloadSet)) {
          record.sections.add(section);
          for (const encoded of encodedValues) {
            encodedSections += 1;
            try {
              const decoded = inflateSync(Buffer.from(encoded.replaceAll(/\s/g, ""), "base64"));
              record.payloadHashes.add(createHash("sha256").update(decoded).digest("hex"));
              const analysis = analyzeCorpusMacroPayload(decodeCorpusText(decoded));
              assignments += analysis.assignments.length;
              record.assignments += analysis.assignments.length;
              const supported = analysis.assignments.filter(({ syntaxSupported }) => syntaxSupported).length;
              supportedAssignments += supported;
              record.unsupportedAssignments += analysis.assignments.length - supported;
              for (const variable of analysis.externalVariables) record.inputVariables.add(variable);
            } catch {
              decodeFailures += 1;
            }
          }
        }
      }
      macroNames.set(name, record);
    }
  }
}

console.log(JSON.stringify({
  root, files: files.length, macroLinks, macroNames: macroNames.size, encodedSections,
  decodeFailures, assignments, supportedAssignments,
  syntaxCoverage: assignments ? Number((supportedAssignments / assignments).toFixed(4)) : null,
  macros: [...macroNames.entries()]
    .sort((left, right) => right[1].occurrences - left[1].occurrences || left[0].localeCompare(right[0]))
    .map(([name, record]) => ({
      name, occurrences: record.occurrences, sections: [...record.sections].sort(),
      uniquePayloads: record.payloadHashes.size, assignments: record.assignments,
      unsupportedAssignments: record.unsupportedAssignments,
      inputVariables: [...record.inputVariables].sort(),
    })),
}, null, 2));

async function findS3dFiles(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await findS3dFiles(fullPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".s3d")) result.push(fullPath);
  }
  return result;
}
