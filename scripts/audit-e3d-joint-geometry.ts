import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { analyzeCorpusBoardContact } from "../lib/corpus-board-contact.ts";
import { flattenCorpusS3dElements, parseCorpusE3d, parseCorpusS3d } from "../lib/corpus-s3d.ts";

const root = path.resolve(process.argv[2] ?? ".");
const sampleLimit = Math.max(0, Number(process.argv[3] ?? 30) || 0);
const files = await findFiles(root, new Set([".e3d", ".s3d"]));
const formats = new Map<string, number>();
const statuses = new Map<string, number>();
const reasons = new Map<string, number>();
const directionPairs = new Map<string, number>();
const facePairs = new Map<string, number>();
const macroNames = new Map<string, number>();
const failures: { file: string; error: string }[] = [];
const samples: unknown[] = [];
let parsed = 0;
let links = 0;
let concretePairs = 0;
let invalidObjectReferences = 0;

for (const file of files) {
  try {
    const extension = path.extname(file).toLocaleLowerCase();
    const xml = await readFile(file, "utf8");
    const inspection = extension === ".s3d" ? parseCorpusS3d(xml) : parseCorpusE3d(xml);
    formats.set(extension, (formats.get(extension) ?? 0) + 1);
    parsed += 1;
    for (const element of flattenCorpusS3dElements(inspection.elements)) {
      for (const link of element.macroLinks) {
        links += 1;
        if (link.object1 === null || link.object2 === null || link.object1 < 0 || link.object2 < 0) continue;
        const object1 = element.boards[link.object1];
        const object2 = element.boards[link.object2];
        if (!object1 || !object2) { invalidObjectReferences += 1; continue; }
        concretePairs += 1;
        const contact = analyzeCorpusBoardContact(object1, object2);
        statuses.set(contact.status, (statuses.get(contact.status) ?? 0) + 1);
        reasons.set(contact.reason, (reasons.get(contact.reason) ?? 0) + 1);
        macroNames.set(link.name || "(bez naziva)", (macroNames.get(link.name || "(bez naziva)") ?? 0) + 1);
        const directionPair = `${object1.direction ?? "?"}→${object2.direction ?? "?"}`;
        directionPairs.set(directionPair, (directionPairs.get(directionPair) ?? 0) + 1);
        if (contact.object1Face && contact.object2Face) {
          const facePair = `${contact.object1Face.localAxis}:${contact.object1Face.side}→${contact.object2Face.localAxis}:${contact.object2Face.side}`;
          facePairs.set(facePair, (facePairs.get(facePair) ?? 0) + 1);
        }
        if (samples.length < sampleLimit && contact.status === "contact") samples.push({
          file: path.relative(root, file), element: element.name, macro: link.name,
          object1: { index: link.object1, name: object1.name, direction: object1.direction, position: object1.position, dimensions: [object1.height, object1.width, object1.thickness], holes: object1.holeCount },
          object2: { index: link.object2, name: object2.name, direction: object2.direction, position: object2.position, dimensions: [object2.height, object2.width, object2.thickness], holes: object2.holeCount },
          contact,
        });
      }
    }
  } catch (reason) {
    failures.push({ file: path.relative(root, file), error: reason instanceof Error ? reason.message : String(reason) });
  }
}

console.log(JSON.stringify({
  root, files: files.length, formats: sortedRecord(formats), parsed, failed: failures.length, links, concretePairs, invalidObjectReferences,
  statuses: sortedRecord(statuses), reasons: sortedRecord(reasons), directionPairs: sortedRecord(directionPairs), facePairs: sortedRecord(facePairs), macroNames: sortedRecord(macroNames),
  samples, failures: failures.slice(0, 50),
}, null, 2));

function sortedRecord(source: Map<string, number>) {
  return Object.fromEntries([...source.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

async function findFiles(directory: string, extensions: ReadonlySet<string>): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await findFiles(fullPath, extensions));
    else if (entry.isFile() && extensions.has(path.extname(entry.name).toLocaleLowerCase())) result.push(fullPath);
  }
  return result;
}
