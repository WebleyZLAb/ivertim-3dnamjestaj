import { corpusBoardPartKind, isCorpusFrontType, type CorpusS3dBoard, type CorpusS3dElement } from "./corpus-s3d.ts";
import { corpusCsvCell, corpusCsvText } from "./corpus-csv.ts";

export type CorpusCutListItem = {
  materialName: string;
  materialUid: string;
  frontType?: number | null;
  height: number;
  width: number;
  thickness: number;
  quantity: number;
  holeCount: number;
  hiddenCount: number;
  parts: readonly string[];
};

export type CorpusCutListResult = {
  items: CorpusCutListItem[];
  skippedBoards: number;
  skippedReasons?: Readonly<Record<string, number>>;
  totalBoards: number;
  excludedHiddenBoards: number;
  totalFronts?: number;
};

export type CorpusCutListPartCounts = {
  board: number;
  front: number;
  auxiliary: number;
  unknown: number;
};

type CorpusCutListBoard = CorpusS3dBoard & { height: number; width: number; thickness: number };

export function corpusCutListSkipReason(board: CorpusS3dBoard): string | null {
  const invalidMeasures = [
    ["VISINA", board.height],
    ["DUBINA", board.width],
    ["DEBLJINA", board.thickness],
  ].filter((entry): entry is [string, number | null] => {
    const value = entry[1];
    return typeof value !== "number" || !Number.isFinite(value) || value <= 0;
  });
  return invalidMeasures.length
    ? invalidMeasures.map(([name, value]) => `${name}=${String(value)}`).join(", ")
    : null;
}

function isCorpusCutListBoard(board: CorpusS3dBoard): board is CorpusCutListBoard {
  return corpusCutListSkipReason(board) === null;
}

export function buildCorpusCutList(elements: readonly CorpusS3dElement[], options: { includeHidden?: boolean; /** Ne zbrajaj iste ploče: jedan red po ploči (npr. bušenje šarki se razlikuje na lijevim i desnim vratima). */ separate?: boolean } = {}): CorpusCutListResult {
  const groups = new Map<string, Omit<CorpusCutListItem, "parts"> & { parts: Set<string> }>();
  const skippedReasons: Record<string, number> = {};
  let skippedBoards = 0;
  let totalBoards = 0;
  let excludedHiddenBoards = 0;
  let totalFronts = 0;

  const visit = (items: readonly CorpusS3dElement[], parentPath: string, parentHidden = false) => {
    items.forEach((element, elementIndex) => {
      const hidden = parentHidden || element.visible === false;
      const elementLabel = element.name || element.code || `Element ${elementIndex + 1}`;
      const path = parentPath ? `${parentPath} / ${elementLabel}` : elementLabel;
      element.boards.forEach((board, boardIndex) => {
        totalBoards += 1;
        const boardHidden = hidden || board.visible === false;
        if (boardHidden && !options.includeHidden) { excludedHiddenBoards += 1; return; }
        if (isCorpusFrontType(board.frontType)) totalFronts += 1;
        const skipReason = corpusCutListSkipReason(board);
        if (!isCorpusCutListBoard(board)) {
          skippedBoards += 1;
          skippedReasons[skipReason ?? "NEPOZNAT RAZLOG"] = (skippedReasons[skipReason ?? "NEPOZNAT RAZLOG"] ?? 0) + 1;
          return;
        }
        const materialName = board.materialName || "Materijal nije naveden";
        const materialUid = board.materialUid || "";
        const key = JSON.stringify([materialUid, materialName, board.frontType, board.height, board.width, board.thickness, options.separate ? totalBoards : null]);
        const existing = groups.get(key) ?? {
          materialName, materialUid, frontType: board.frontType, height: board.height, width: board.width, thickness: board.thickness,
          quantity: 0, holeCount: 0, hiddenCount: 0, parts: new Set<string>(),
        };
        existing.quantity += 1;
        existing.holeCount += board.holeCount;
        if (boardHidden) existing.hiddenCount += 1;
        existing.parts.add(`${path}: ${board.name || `Ploča ${boardIndex + 1}`}`);
        groups.set(key, existing);
      });
      visit(element.children, path, hidden);
    });
  };
  visit(elements, "");

  const items = [...groups.values()]
    .map((item) => ({ ...item, parts: [...item.parts].sort((left, right) => left.localeCompare(right, "hr")) }))
    .sort((left, right) => left.materialName.localeCompare(right.materialName, "hr")
      || right.thickness - left.thickness || right.height - left.height || right.width - left.width);
  return { items, skippedBoards, skippedReasons, totalBoards, excludedHiddenBoards, totalFronts };
}

export function corpusCutListPartCounts(result: CorpusCutListResult): CorpusCutListPartCounts {
  const counts: CorpusCutListPartCounts = { board: 0, front: 0, auxiliary: 0, unknown: 0 };
  for (const item of result.items) counts[corpusBoardPartKind(item.frontType ?? null)] += item.quantity;
  return counts;
}

export type CorpusCutListCsvOptions = {
  delimiter?: ";" | "," | "\t";
  decimalSeparator?: "," | ".";
  includeHeader?: boolean;
  includeBom?: boolean;
};

export function corpusCutListCsv(result: CorpusCutListResult, options: CorpusCutListCsvOptions = {}): string {
  const delimiter = options.delimiter ?? ";";
  const decimalSeparator = options.decimalSeparator ?? ",";
  const number = (value: number) => String(value).replace(".", decimalSeparator);
  const includePartIdentity = Object.keys(options).length === 0;
  const rows = [
    includePartIdentity
      ? ["Vrsta dijela", "TIPFRONTE", "Materijal", "UID materijala", "VISINA mm", "DUBINA mm", "Debljina mm", "Količina", "Rupe", "Skrivene", "Elementi i dijelovi"]
      : ["Materijal", "UID materijala", "VISINA mm", "DUBINA mm", "Debljina mm", "Količina", "Rupe", "Skrivene", "Elementi i ploče"],
    ...result.items.map((item) => [
      ...(includePartIdentity ? [
      corpusBoardPartKind(item.frontType ?? null) === "front" ? "Fronta" : corpusBoardPartKind(item.frontType ?? null) === "auxiliary" ? "Pomoćni dio" : corpusBoardPartKind(item.frontType ?? null) === "unknown" ? "Nepoznat dio" : "Ploča",
      item.frontType === null || item.frontType === 0 ? "" : String(item.frontType),
      ] : []),
      corpusCsvText(item.materialName),
      corpusCsvText(item.materialUid),
      number(item.height),
      number(item.width),
      number(item.thickness),
      String(item.quantity),
      String(item.holeCount),
      String(item.hiddenCount),
      corpusCsvText(item.parts.join(" | ")),
    ]),
  ];
  const exportedRows = options.includeHeader === false ? rows.slice(1) : rows;
  const bom = options.includeBom === false ? "" : "\uFEFF";
  return `${bom}${exportedRows.map(row => row.map(value => csvCell(value, delimiter)).join(delimiter)).join("\r\n")}\r\n`;
}

function csvCell(value: string, delimiter: string): string {
  return value.includes(delimiter) || /["\r\n]/.test(value) ? `"${value.replace(/"/g, '\"\"')}"` : value;
}
