import type { CorpusS3dElement } from "./corpus-s3d.ts";

export type CorpusCutListItem = {
  materialName: string;
  materialUid: string;
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
  totalBoards: number;
  excludedHiddenBoards: number;
};

export function buildCorpusCutList(elements: readonly CorpusS3dElement[], options: { includeHidden?: boolean } = {}): CorpusCutListResult {
  const groups = new Map<string, Omit<CorpusCutListItem, "parts"> & { parts: Set<string> }>();
  let skippedBoards = 0;
  let totalBoards = 0;
  let excludedHiddenBoards = 0;

  const visit = (items: readonly CorpusS3dElement[], parentPath: string, parentHidden = false) => {
    items.forEach((element, elementIndex) => {
      const hidden = parentHidden || element.visible === false;
      const elementLabel = element.name || element.code || `Element ${elementIndex + 1}`;
      const path = parentPath ? `${parentPath} / ${elementLabel}` : elementLabel;
      element.boards.forEach((board, boardIndex) => {
        totalBoards += 1;
        const boardHidden = hidden || board.visible === false;
        if (boardHidden && !options.includeHidden) { excludedHiddenBoards += 1; return; }
        if (board.height === null || board.width === null || board.thickness === null
          || !Number.isFinite(board.height) || !Number.isFinite(board.width) || !Number.isFinite(board.thickness)
          || board.height <= 0 || board.width <= 0 || board.thickness <= 0) {
          skippedBoards += 1;
          return;
        }
        const materialName = board.materialName || "Materijal nije naveden";
        const materialUid = board.materialUid || "";
        const key = JSON.stringify([materialUid, materialName, board.height, board.width, board.thickness]);
        const existing = groups.get(key) ?? {
          materialName, materialUid, height: board.height, width: board.width, thickness: board.thickness,
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
  return { items, skippedBoards, totalBoards, excludedHiddenBoards };
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
  const rows = [
    ["Materijal", "UID materijala", "VISINA mm", "DUBINA mm", "Debljina mm", "Količina", "Rupe", "Skrivene", "Elementi i ploče"],
    ...result.items.map((item) => [
      item.materialName,
      item.materialUid,
      number(item.height),
      number(item.width),
      number(item.thickness),
      String(item.quantity),
      String(item.holeCount),
      String(item.hiddenCount),
      item.parts.join(" | "),
    ]),
  ];
  const exportedRows = options.includeHeader === false ? rows.slice(1) : rows;
  const bom = options.includeBom === false ? "" : "\uFEFF";
  return `${bom}${exportedRows.map(row => row.map(value => csvCell(value, delimiter)).join(delimiter)).join("\r\n")}\r\n`;
}

function csvCell(value: string, delimiter: string): string {
  return value.includes(delimiter) || /["\r\n]/.test(value) ? `"${value.replace(/"/g, '\"\"')}"` : value;
}
