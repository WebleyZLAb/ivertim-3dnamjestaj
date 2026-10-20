import type { CorpusS3dConsumable, CorpusS3dElement } from "./corpus-s3d.ts";

export type CorpusConsumableItem = {
  type: string;
  name: string;
  materialName: string;
  materialUid: string;
  uid: string;
  designation: string;
  quantity: number;
  occurrences: number;
  declaredQuantityOccurrences: number;
  sideApplications: readonly [number, number, number, number];
  sources: readonly string[];
};

export function buildCorpusConsumablesList(elements: readonly CorpusS3dElement[]): CorpusConsumableItem[] {
  const groups = new Map<string, Omit<CorpusConsumableItem, "sources" | "sideApplications"> & { sources: Set<string>; sideApplications: [number, number, number, number] }>();
  const add = (item: CorpusS3dConsumable, source: string) => {
    const key = JSON.stringify([item.type, item.uid, item.designation, item.name, item.materialUid, item.materialName]);
    const existing = groups.get(key) ?? {
      type: item.type,
      name: item.name || item.designation || "Neimenovana stavka",
      materialName: item.materialName,
      materialUid: item.materialUid,
      uid: item.uid,
      designation: item.designation,
      quantity: 0,
      occurrences: 0,
      declaredQuantityOccurrences: 0,
      sideApplications: [0, 0, 0, 0],
      sources: new Set<string>(),
    };
    existing.quantity += item.quantity ?? 1;
    existing.occurrences += 1;
    if (item.quantity !== null) existing.declaredQuantityOccurrences += 1;
    item.sides.forEach((applied, side) => { if (applied) existing.sideApplications[side] += 1; });
    existing.sources.add(source);
    groups.set(key, existing);
  };
  const visit = (items: readonly CorpusS3dElement[], parentPath: string) => {
    items.forEach((element, elementIndex) => {
      const label = element.name || element.code || `Element ${elementIndex + 1}`;
      const path = parentPath ? `${parentPath} / ${label}` : label;
      element.consumables.forEach((item) => add(item, path));
      element.boards.forEach((board, boardIndex) => {
        const boardLabel = board.name || `Ploča ${boardIndex + 1}`;
        board.consumables.forEach((item) => add(item, `${path}: ${boardLabel}`));
      });
      visit(element.children, path);
    });
  };
  visit(elements, "");
  return [...groups.values()]
    .map((item) => ({ ...item, sources: [...item.sources].sort((left, right) => left.localeCompare(right, "hr")) }))
    .sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name, "hr") || left.materialName.localeCompare(right.materialName, "hr"));
}

export function corpusConsumablesCsv(items: readonly CorpusConsumableItem[]): string {
  const rows = [
    ["TIP", "Naziv", "Oznaka", "Materijal", "MUID", "UID", "Količina", "Pojavljivanja", "KOMADA zapisi", "STR0", "STR1", "STR2", "STR3", "Izvori"],
    ...items.map((item) => [
      item.type, item.name, item.designation, item.materialName, item.materialUid, item.uid,
      numberText(item.quantity), String(item.occurrences), String(item.declaredQuantityOccurrences),
      ...item.sideApplications.map(String), item.sources.join(" | "),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}\r\n`;
}

function numberText(value: number): string {
  return String(value).replace(".", ",");
}

function csvCell(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
