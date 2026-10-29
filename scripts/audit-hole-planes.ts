import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { decodeCorpusText } from "../lib/corpus-macro.ts";
import { flattenCorpusS3dElements, parseCorpusE3d, parseCorpusS3d } from "../lib/corpus-s3d.ts";

const root = path.resolve(process.argv[2] ?? ".");
const sampleLimit = Math.max(0, Number(process.argv[3] ?? 3) || 0);
const files = await findCorpusFiles(root);
const planes = new Map<string, number>();
const combinations = new Map<string, number>();
const samples = new Map<string, Array<Record<string, unknown>>>();
let parsed = 0;
let failed = 0;
let boards = 0;
let holes = 0;

for (const file of files) {
  try {
    const xml = decodeCorpusText(await readFile(file));
    const extension = path.extname(file).toLowerCase();
    const inspection = extension === ".s3d" ? parseCorpusS3d(xml) : parseCorpusE3d(xml);
    parsed += 1;
    for (const element of flattenCorpusS3dElements(inspection.elements)) {
      for (const board of element.boards) {
        boards += 1;
        for (const hole of board.holes) {
          holes += 1;
          const plane = hole.plane === null ? "null" : String(hole.plane);
          increment(planes, plane);
          const key = `SMJER=${board.direction ?? "null"} RPL=${plane} RAA=${hole.angle ?? "null"}`;
          increment(combinations, key);
          const list = samples.get(key) ?? [];
          if (list.length < sampleLimit) list.push({
            file: path.relative(root, file), element: element.name, board: board.name,
            dimensions: [board.height, board.width, board.thickness],
            hole: hole.name, x: hole.xExpression, y: hole.yExpression,
            diameter: hole.diameter, depth: hole.depth, machining: hole.machining,
          });
          samples.set(key, list);
        }
      }
    }
  } catch {
    failed += 1;
  }
}

console.log(JSON.stringify({
  root, files: files.length, parsed, failed, boards, holes,
  planes: sortedRecord(planes),
  combinations: Object.fromEntries([...combinations.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key, count]) => [key, { count, samples: samples.get(key) ?? [] }])),
}, null, 2));

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sortedRecord(map: Map<string, number>): Record<string, number> {
  return Object.fromEntries([...map.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
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
