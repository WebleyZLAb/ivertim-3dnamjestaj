import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { flattenCorpusS3dElements, parseCorpusE3d } from "../lib/corpus-s3d.ts";

const root = path.resolve(process.argv[2] ?? ".");
const query = (process.argv[3] ?? "").toLocaleLowerCase();
const sampleLimit = Math.max(0, Number(process.argv[4] ?? 20) || 0);
const files = await findFiles(root, ".e3d");
const samples: unknown[] = [];
let matchedElements = 0;
let matchedLinks = 0;
let matchedElementsWithHoles = 0;
let matchedBoardsWithHoles = 0;
let matchedHoles = 0;
const primaryPayloadSections = new Map<string, number>();
const secondaryPayloadSections = new Map<string, number>();

for (const file of files) {
  const inspection = parseCorpusE3d(await readFile(file, "utf8"));
  for (const element of flattenCorpusS3dElements(inspection.elements)) {
    const links = element.macroLinks.filter(({ name }) => !query || name.toLocaleLowerCase().includes(query));
    if (!links.length) continue;
    matchedElements += 1;
    matchedLinks += links.length;
    for (const link of links) {
      for (const [section, values] of Object.entries(link.encodedPayloads)) primaryPayloadSections.set(section, (primaryPayloadSections.get(section) ?? 0) + values.length);
      for (const [section, values] of Object.entries(link.secondaryEncodedPayloads)) secondaryPayloadSections.set(section, (secondaryPayloadSections.get(section) ?? 0) + values.length);
    }
    const boards = element.boards.map((board, index) => ({
      index,
      name: board.name,
      direction: board.direction,
      dimensions: [board.height, board.width, board.thickness],
      position: board.position,
      holes: board.holes.map((hole) => ({
        groupType: hole.groupType,
        name: hole.name,
        xExpression: hole.xExpression,
        yExpression: hole.yExpression,
        diameter: hole.diameter,
        depth: hole.depth,
        plane: hole.plane,
        angle: hole.angle,
        machiningMode: hole.machiningMode,
      })),
    })).filter(({ holes }) => holes.length);
    if (boards.length) matchedElementsWithHoles += 1;
    matchedBoardsWithHoles += boards.length;
    matchedHoles += boards.reduce((sum, board) => sum + board.holes.length, 0);
    if (samples.length < sampleLimit) samples.push({
      file: path.relative(root, file),
      element: element.name,
      links: links.map(({ name, object1, object2, corpusFlag, encodedPayloads, secondaryName, secondaryEncodedPayloads }) => ({
        name, object1, object2, corpusFlag,
        sections: Object.fromEntries(Object.entries(encodedPayloads).map(([key, values]) => [key, values.length])),
        secondaryName,
        secondarySections: Object.fromEntries(Object.entries(secondaryEncodedPayloads).map(([key, values]) => [key, values.length])),
      })),
      boardCount: element.boards.length,
      boards,
    });
  }
}

console.log(JSON.stringify({
  root,
  query: query || null,
  files: files.length,
  matchedElements,
  matchedLinks,
  matchedElementsWithHoles,
  matchedBoardsWithHoles,
  matchedHoles,
  primaryPayloadSections: Object.fromEntries([...primaryPayloadSections.entries()].sort()),
  secondaryPayloadSections: Object.fromEntries([...secondaryPayloadSections.entries()].sort()),
  samples,
}, null, 2));

async function findFiles(directory: string, extension: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await findFiles(fullPath, extension));
    else if (entry.isFile() && entry.name.toLocaleLowerCase().endsWith(extension)) result.push(fullPath);
  }
  return result;
}
