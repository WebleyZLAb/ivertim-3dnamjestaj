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
};

export function buildCorpusCutList(elements: readonly CorpusS3dElement[]): CorpusCutListResult {
  const groups = new Map<string, Omit<CorpusCutListItem, "parts"> & { parts: Set<string> }>();
  let skippedBoards = 0;
  let totalBoards = 0;

  const visit = (items: readonly CorpusS3dElement[], parentPath: string) => {
    items.forEach((element, elementIndex) => {
      const elementLabel = element.name || element.code || `Element ${elementIndex + 1}`;
      const path = parentPath ? `${parentPath} / ${elementLabel}` : elementLabel;
      element.boards.forEach((board, boardIndex) => {
        totalBoards += 1;
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
        if (board.visible === false) existing.hiddenCount += 1;
        existing.parts.add(`${path}: ${board.name || `Ploča ${boardIndex + 1}`}`);
        groups.set(key, existing);
      });
      visit(element.children, path);
    });
  };
  visit(elements, "");

  const items = [...groups.values()]
    .map((item) => ({ ...item, parts: [...item.parts].sort((left, right) => left.localeCompare(right, "hr")) }))
    .sort((left, right) => left.materialName.localeCompare(right.materialName, "hr")
      || right.thickness - left.thickness || right.height - left.height || right.width - left.width);
  return { items, skippedBoards, totalBoards };
}

export function corpusCutListCsv(result: CorpusCutListResult): string {
  const rows = [
    ["Materijal", "UID materijala", "VISINA mm", "DUBINA mm", "Debljina mm", "Količina", "Rupe", "Skrivene", "Elementi i ploče"],
    ...result.items.map((item) => [
      item.materialName,
      item.materialUid,
      csvNumber(item.height),
      csvNumber(item.width),
      csvNumber(item.thickness),
      String(item.quantity),
      String(item.holeCount),
      String(item.hiddenCount),
      item.parts.join(" | "),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}\r\n`;
}

function csvNumber(value: number): string {
  return String(value).replace(".", ",");
}

function csvCell(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
