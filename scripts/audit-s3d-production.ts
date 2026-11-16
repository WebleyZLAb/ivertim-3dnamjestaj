import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { buildCorpusConsumablesList, corpusConsumablesCsv } from "../lib/corpus-consumables.ts";
import { buildCorpusCutList, corpusCutListCsv, corpusCutListSkipReason } from "../lib/corpus-cutlist.ts";
import { flattenCorpusS3dElements, isCorpusFrontType, parseCorpusS3d } from "../lib/corpus-s3d.ts";
import { decodeCorpusTextDocument } from "../lib/corpus-text.ts";

const root = path.resolve(process.argv.slice(2).find((argument) => argument !== "--") ?? ".");
const files = await findS3dFiles(root);
const totals = {
  files: files.length,
  parsed: 0,
  failed: 0,
  boards: 0,
  fronts: 0,
  skippedBoards: 0,
  cutListGroups: 0,
  cutListQuantity: 0,
  cutListHoles: 0,
  consumableGroups: 0,
  consumableOccurrences: 0,
  consumableQuantity: 0,
  cutListCsvBytes: 0,
  consumablesCsvBytes: 0,
};
const failures: Array<{ file: string; error: string }> = [];
const frontTypes = new Map<string, number>();
const frontTypeSamples = new Map<string, Set<string>>();
const frontTypeDetails = new Map<string, { validMeasures: number; blankMaterial: number; boardTypes: Map<string, number>; materials: Set<string> }>();
const skippedBoardDetails = new Map<string, {
  count: number;
  frontTypes: Map<string, number>;
  boardTypes: Map<string, number>;
  samplesByFrontType: Map<string, Set<string>>;
}>();

for (const file of files) {
  try {
    const xml = decodeCorpusTextDocument(await readFile(file)).text;
    const project = parseCorpusS3d(xml);
    const flattened = flattenCorpusS3dElements(project.elements);
    const boards = flattened.flatMap((element) => element.boards);
    for (const element of flattened) {
      for (const board of element.boards) {
        const key = String(board.frontType);
        frontTypes.set(key, (frontTypes.get(key) ?? 0) + 1);
        const samples = frontTypeSamples.get(key) ?? new Set<string>();
        if (samples.size < 12) samples.add(`${element.className || "?"} / ${element.name || "?"} / ${board.name || "?"}`);
        frontTypeSamples.set(key, samples);
        const detail = frontTypeDetails.get(key) ?? { validMeasures: 0, blankMaterial: 0, boardTypes: new Map<string, number>(), materials: new Set<string>() };
        if ([board.height, board.width, board.thickness].every((value) => typeof value === "number" && Number.isFinite(value) && value > 0)) detail.validMeasures += 1;
        if (!board.materialName.trim() && !board.materialUid.trim()) detail.blankMaterial += 1;
        const boardType = String(board.boardType);
        detail.boardTypes.set(boardType, (detail.boardTypes.get(boardType) ?? 0) + 1);
        if (detail.materials.size < 12) detail.materials.add(board.materialName || board.materialUid || "(prazno)");
        frontTypeDetails.set(key, detail);

        const reason = corpusCutListSkipReason(board);
        if (reason) {
          const skipped = skippedBoardDetails.get(reason) ?? {
            count: 0, frontTypes: new Map<string, number>(), boardTypes: new Map<string, number>(), samplesByFrontType: new Map<string, Set<string>>(),
          };
          skipped.count += 1;
          skipped.frontTypes.set(key, (skipped.frontTypes.get(key) ?? 0) + 1);
          skipped.boardTypes.set(boardType, (skipped.boardTypes.get(boardType) ?? 0) + 1);
          const samples = skipped.samplesByFrontType.get(key) ?? new Set<string>();
          if (samples.size < 12) samples.add(`${path.basename(file)}: ${element.className || "?"} / ${element.name || "?"} / ${board.name || "?"}`);
          skipped.samplesByFrontType.set(key, samples);
          skippedBoardDetails.set(reason, skipped);
        }
      }
    }
    const cutList = buildCorpusCutList(project.elements);
    const consumables = buildCorpusConsumablesList(project.elements);
    const cutListQuantity = cutList.items.reduce((sum, item) => sum + item.quantity, 0);
    const cutListHoles = cutList.items.reduce((sum, item) => sum + item.holeCount, 0);
    const expectedFronts = boards.filter((board) => isCorpusFrontType(board.frontType)).length;

    if (cutList.totalBoards !== boards.length) throw new Error("Krojna lista nije obuhvatila tačan broj ploča.");
    if (cutListQuantity + cutList.skippedBoards !== boards.length) throw new Error("Količine i preskočene ploče ne daju ukupan broj ploča.");
    if (cutList.totalFronts !== expectedFronts) throw new Error("Krojna lista nije obuhvatila tačan broj fronti.");
    if (cutList.items.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0
      || ![item.height, item.width, item.thickness].every((value) => Number.isFinite(value) && value > 0))) {
      throw new Error("Krojna lista sadrži neupotrebljivu mjeru ili količinu.");
    }
    if (consumables.some((item) => !Number.isFinite(item.quantity) || !Number.isInteger(item.occurrences) || item.occurrences <= 0)) {
      throw new Error("Lista potrošnog materijala sadrži neupotrebljivu količinu ili broj pojavljivanja.");
    }

    const cutCsv = corpusCutListCsv(cutList);
    const consumablesCsv = corpusConsumablesCsv(consumables);
    validateCsv(cutCsv, "krojna lista");
    validateCsv(consumablesCsv, "potrošni materijal");

    totals.parsed += 1;
    totals.boards += boards.length;
    totals.fronts += expectedFronts;
    totals.skippedBoards += cutList.skippedBoards;
    totals.cutListGroups += cutList.items.length;
    totals.cutListQuantity += cutListQuantity;
    totals.cutListHoles += cutListHoles;
    totals.consumableGroups += consumables.length;
    totals.consumableOccurrences += consumables.reduce((sum, item) => sum + item.occurrences, 0);
    totals.consumableQuantity += consumables.reduce((sum, item) => sum + item.quantity, 0);
    totals.cutListCsvBytes += Buffer.byteLength(cutCsv, "utf8");
    totals.consumablesCsvBytes += Buffer.byteLength(consumablesCsv, "utf8");
  } catch (error) {
    totals.failed += 1;
    failures.push({ file, error: error instanceof Error ? error.message : String(error) });
  }
}

console.log(JSON.stringify({
  root,
  ...totals,
  frontTypes: Object.fromEntries([...frontTypes.entries()].sort()),
  frontTypeSamples: Object.fromEntries([...frontTypeSamples.entries()].sort().map(([key, values]) => [key, [...values]])),
  frontTypeDetails: Object.fromEntries([...frontTypeDetails.entries()].sort().map(([key, detail]) => [key, {
    validMeasures: detail.validMeasures,
    blankMaterial: detail.blankMaterial,
    boardTypes: Object.fromEntries([...detail.boardTypes.entries()].sort()),
    materials: [...detail.materials],
  }])),
  skippedBoardDetails: Object.fromEntries([...skippedBoardDetails.entries()]
    .sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0]))
    .map(([reason, detail]) => [reason, {
      count: detail.count,
      frontTypes: Object.fromEntries([...detail.frontTypes.entries()].sort()),
      boardTypes: Object.fromEntries([...detail.boardTypes.entries()].sort()),
      samplesByFrontType: Object.fromEntries([...detail.samplesByFrontType.entries()].sort().map(([key, samples]) => [key, [...samples]])),
    }])),
  consumableQuantityRounded: Number(totals.consumableQuantity.toFixed(6)),
  failures,
}, null, 2));
if (failures.length) process.exitCode = 1;

function validateCsv(csv: string, label: string): void {
  if (!csv.startsWith("\uFEFF")) throw new Error(`${label} nema UTF-8 BOM.`);
  if (!csv.endsWith("\r\n")) throw new Error(`${label} nema završni CRLF.`);
  if (csv.includes("\0")) throw new Error(`${label} sadrži NUL znak.`);
}

async function findS3dFiles(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await findS3dFiles(fullPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".s3d")) result.push(fullPath);
  }
  return result.sort((left, right) => left.localeCompare(right));
}
