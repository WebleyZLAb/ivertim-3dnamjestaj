import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { flattenCorpusS3dElements, parseCorpusE3d } from "../lib/corpus-s3d.ts";
import { updateCorpusElement } from "../lib/corpus-model.ts";
import { writeCorpusE3dGeometryCopy } from "../lib/corpus-s3d-writer.ts";

const root = path.resolve(process.argv[2] ?? ".");
const files = await findFiles(root, ".e3d");
const failures: { file: string; error: string }[] = [];
const versions = new Map<string, number>();
const categories = new Map<string, number>();
const macroNames = new Map<string, number>();
let parsed = 0;
let elements = 0;
let boards = 0;
let holes = 0;
let macroLinks = 0;
let consumables = 0;
let byteExactNoChangeWrites = 0;
let geometryWriteCandidates = 0;
let geometryWritesVerified = 0;

for (const file of files) {
  try {
    const xml = await readFile(file, "utf8");
    const inspection = parseCorpusE3d(xml);
    parsed += 1;
    versions.set(inspection.version || "(bez verzije)", (versions.get(inspection.version || "(bez verzije)") ?? 0) + 1);
    const category = path.relative(root, file).split(path.sep)[0] || "(korijen)";
    categories.set(category, (categories.get(category) ?? 0) + 1);
    const flattened = flattenCorpusS3dElements(inspection.elements);
    if (writeCorpusE3dGeometryCopy(xml, inspection.elements, inspection.elements) === xml) byteExactNoChangeWrites += 1;
    const candidate = inspection.elements[0];
    if (candidate && candidate.position.every((value) => value !== null) && candidate.width !== null && candidate.height !== null && candidate.depth !== null) {
      geometryWriteCandidates += 1;
      const patch = {
        position: [candidate.position[0]! + 1, candidate.position[1]!, candidate.position[2]!] as const,
        width: candidate.width, height: candidate.height, depth: candidate.depth,
        angle: candidate.angle ?? 0, xAngle: candidate.xAngle ?? 0, zAngle: candidate.zAngle ?? 0,
      };
      const changed = updateCorpusElement(inspection.elements, candidate, patch);
      const written = writeCorpusE3dGeometryCopy(xml, inspection.elements, changed.elements);
      if (parseCorpusE3d(written).elements[0]?.position[0] === patch.position[0]) geometryWritesVerified += 1;
    }
    elements += flattened.length;
    for (const element of flattened) {
      boards += element.boards.length;
      holes += element.boards.reduce((sum, board) => sum + board.holes.length, 0);
      consumables += element.consumables.length + element.boards.reduce((sum, board) => sum + board.consumables.length, 0);
      macroLinks += element.macroLinks.length;
      for (const link of element.macroLinks) macroNames.set(link.name || "(bez naziva)", (macroNames.get(link.name || "(bez naziva)") ?? 0) + 1);
    }
  } catch (reason) {
    failures.push({ file: path.relative(root, file), error: reason instanceof Error ? reason.message : String(reason) });
  }
}

console.log(JSON.stringify({
  root, files: files.length, parsed, failed: failures.length, elements, boards, holes, consumables, macroLinks,
  byteExactNoChangeWrites, geometryWriteCandidates, geometryWritesVerified,
  versions: Object.fromEntries([...versions.entries()].sort()),
  categories: Object.fromEntries([...categories.entries()].sort((left, right) => right[1] - left[1])),
  macroNames: Object.fromEntries([...macroNames.entries()].sort((left, right) => right[1] - left[1])),
  failures: failures.slice(0, 50),
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
