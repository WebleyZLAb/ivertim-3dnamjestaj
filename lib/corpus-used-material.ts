import { corpusBoardPartKind, type CorpusS3dElement } from "./corpus-s3d.ts";
import { buildCorpusConsumablesList, type CorpusConsumableItem } from "./corpus-consumables.ts";

/**
 * Popis „Utrošeni materijal" kao u Corpusu: ploče po materijalu, rubne trake i okovi.
 *
 * Provjereno na projektu Kuhinja_1 (Corpus 6, 25.11.2026.): zbir površina po materijalu poklapa se
 * s Corpusom na dvije decimale, a okovi (DRVENA TIPLA 383, KONFIRMAT 176, BAGLAMA 12) tačno.
 * U popis ne ulaze skrivene ploče, ploče debljine 0 (profili), pomoćni dijelovi (frontType 5, noge)
 * ni nepoznati dijelovi (frontType 8, ulošci).
 * Dužina trake kao u Corpusu (provjereno na svih 6 redova Kuhinje_1): strane STR0 i STR1 su duž širine ploče,
 * STR2 i STR3 duž visine, plus 80 mm dodatka za svaku oblijepljenu stranu; redovi su po dekoru trake i debljini ploče.
 */

export type UsedBoardRow = {
  key: string;
  element: string;
  board: string;
  height: number;
  width: number;
  thickness: number;
  /** m² jedne ploče. */
  area: number;
};

export type UsedMaterialGroup = {
  key: string;
  materialName: string;
  materialUid: string;
  thickness: number;
  rows: UsedBoardRow[];
  /** Ukupna površina u m². */
  area: number;
  /** Naziv materijala kako je zapisan u projektu (za pretragu kataloga). */
  rawName: string;
  /** Cijena po m² za ovu debljinu ili null kad nije zadana. */
  price: number | null;
  /** Površina × cijena, zaokruženo na dvije decimale. */
  cost: number;
};

export type UsedEdgeGroup = {
  key: string;
  boardThickness: number;
  /** Npr. "1mm" ili "0.5mm". */
  edgeName: string;
  edgeMaterialName: string;
  /** Šifra trake iz kataloga (npr. 1_K697) ili prazno. */
  edgeCode: string;
  /** Dužina u metrima (zbir strana + 80 mm po strani, kao u Corpusu). */
  length: number;
  /** UID dekora trake. */
  edgeUid: string;
  /** Cijena po metru ili null. */
  price: number | null;
  cost: number;
};

export type UsedFitting = CorpusConsumableItem & { price: number | null; cost: number };

export type UsedMaterialPrices = {
  /** Cijena po m² za materijal i debljinu (CIJENA uz DEB u katalogu). */
  material?(uid: string, name: string, thickness: number): number | null;
  /** Cijena po metru trake za dekor i debljinu trake ("1mm"). */
  edge?(decorUid: string, edgeName: string): number | null;
  /** Cijena okova po komadu (po UID-u stavke). */
  fitting?(uid: string): number | null;
};

export type UsedMaterial = {
  materials: UsedMaterialGroup[];
  edges: UsedEdgeGroup[];
  fittings: UsedFitting[];
  totalArea: number;
  /** Broj grupa ploča bez cijene u katalogu (u zbir ulaze kao 0, kao u Corpusu). */
  unpricedGroups: number;
  /** Zbirovi kao u Corpusu: ploče, rubne trake, ostalo (okovi) i ukupno; samo stavke s cijenom. */
  totals: { boards: number; edges: number; other: number; total: number };
};

type Label = (uid: string, name: string) => string;

const roundArea = (value: number) => Math.round(value * 1e6) / 1e6;
/** Dodatak Corpusa po oblijepljenoj strani, u metrima. */
const EDGE_ALLOWANCE = 0.08;

export function corpusBoardInUsedMaterial(board: { frontType: number | null; thickness: number | null; visible: boolean | null }): boolean {
  if (board.visible === false) return false;
  if (typeof board.thickness !== "number" || !(board.thickness > 0)) return false;
  const kind = corpusBoardPartKind(board.frontType);
  return kind === "board" || kind === "front";
}

export function buildCorpusUsedMaterial(elements: readonly CorpusS3dElement[], label: Label = (uid, name) => name || uid, edgeCode: (decorUid: string, edgeName: string) => string = () => "", prices: UsedMaterialPrices = {}): UsedMaterial {
  const materials = new Map<string, UsedMaterialGroup>();
  const edges = new Map<string, UsedEdgeGroup>();

  const visit = (items: readonly CorpusS3dElement[], parentHidden: boolean) => {
    items.forEach((element, elementIndex) => {
      const hidden = parentHidden || element.visible === false;
      if (hidden) return;
      const elementName = element.name || element.code || `Element ${elementIndex + 1}`;
      element.boards.forEach((board, boardIndex) => {
        if (!corpusBoardInUsedMaterial(board)) return;
        const height = board.height, width = board.width, thickness = board.thickness;
        if (typeof height !== "number" || typeof width !== "number" || typeof thickness !== "number" || !(height > 0) || !(width > 0)) return;
        const materialName = label(board.materialUid, board.materialName) || "Materijal nije naveden";
        const key = JSON.stringify([board.materialUid || materialName, thickness]);
        const group = materials.get(key) ?? { key, materialName, materialUid: board.materialUid, thickness, rows: [], area: 0, rawName: board.materialName, price: null, cost: 0 };
        const area = (height * width) / 1e6;
        group.rows.push({ key: `${key}:${group.rows.length}`, element: elementName, board: board.name || `Ploča ${boardIndex + 1}`, height, width, thickness, area });
        group.area = roundArea(group.area + area);
        materials.set(key, group);

        for (const edge of board.consumables) {
          if (edge.type !== "0") continue;
          const [side0, side1, side2, side3] = edge.sides;
          const sides = edge.sides.filter(Boolean).length;
          const length = ((side0 ? width : 0) + (side1 ? width : 0) + (side2 ? height : 0) + (side3 ? height : 0)) / 1000 + EDGE_ALLOWANCE * sides;
          if (sides === 0) continue;
          const edgeMaterialName = label(edge.materialUid, edge.materialName);
          const edgeKey = JSON.stringify([edge.name, edge.materialUid || edge.materialName, thickness]);
          const entry = edges.get(edgeKey) ?? { key: edgeKey, boardThickness: thickness, edgeName: edge.name, edgeMaterialName, edgeCode: edgeCode(edge.materialUid, edge.name), length: 0, edgeUid: edge.materialUid, price: null, cost: 0 };
          entry.length = Math.round((entry.length + length) * 1e6) / 1e6;
          edges.set(edgeKey, entry);
        }
      });
      visit(element.children, hidden);
    });
  };
  visit(elements, false);

  const money = (value: number) => Math.round(value * 100) / 100;
  const sortedMaterials = [...materials.values()].sort((a, b) => a.materialName.localeCompare(b.materialName, "hr") || b.thickness - a.thickness);
  for (const group of sortedMaterials) {
    group.price = prices.material?.(group.materialUid, group.rawName, group.thickness) ?? null;
    group.cost = group.price === null ? 0 : money(group.area * group.price);
  }
  const sortedEdges = [...edges.values()].sort((a, b) => a.edgeMaterialName.localeCompare(b.edgeMaterialName, "hr") || a.boardThickness - b.boardThickness || a.edgeName.localeCompare(b.edgeName, "hr"));
  for (const edge of sortedEdges) {
    edge.price = prices.edge?.(edge.edgeUid, edge.edgeName) ?? null;
    edge.cost = edge.price === null ? 0 : money(edge.length * edge.price);
  }
  const fittings: UsedFitting[] = buildCorpusConsumablesList(elements).filter((item) => item.type === "1").map((item) => {
    const price = prices.fitting?.(item.uid) ?? null;
    return { ...item, price, cost: price === null ? 0 : money(item.quantity * price) };
  });
  const boardsTotal = money(sortedMaterials.reduce((sum, group) => sum + group.cost, 0));
  const edgesTotal = money(sortedEdges.reduce((sum, edge) => sum + edge.cost, 0));
  const otherTotal = money(fittings.reduce((sum, item) => sum + item.cost, 0));
  return {
    materials: sortedMaterials,
    edges: sortedEdges,
    fittings,
    totalArea: roundArea(sortedMaterials.reduce((sum, group) => sum + group.area, 0)),
    unpricedGroups: sortedMaterials.filter((group) => group.price === null).length,
    totals: { boards: boardsTotal, edges: edgesTotal, other: otherTotal, total: money(boardsTotal + edgesTotal + otherTotal) },
  };
}

export type UsedElementMaterial = { key: string; materialName: string; thickness: number; boards: number; area: number; cost: number };

export type UsedElement = {
  index: number;
  name: string;
  code: string;
  boards: number;
  area: number;
  cost: number;
  materials: UsedElementMaterial[];
};

/**
 * Potrošnja po korijenskim elementima: broj ploča, površina i iznos (ploče s cijenom), po materijalu i debljini.
 * Ploče podelemenata ulaze u korijenski element kojem pripadaju. Ista pravila uključivanja kao u popisu materijala.
 * Pregled nije prepisan iz Corpusa (kartica Elementi nije snimljena), nego izveden iz istih podataka.
 */
export function buildCorpusUsedByElement(elements: readonly CorpusS3dElement[], label: Label = (uid, name) => name || uid, prices: UsedMaterialPrices = {}): UsedElement[] {
  const money = (value: number) => Math.round(value * 100) / 100;
  const result: UsedElement[] = [];
  elements.forEach((root, index) => {
    if (root.visible === false) return;
    const materials = new Map<string, UsedElementMaterial & { price: number | null }>();
    const visit = (element: CorpusS3dElement) => {
      if (element.visible === false) return;
      for (const board of element.boards) {
        if (!corpusBoardInUsedMaterial(board)) continue;
        const { height, width, thickness } = board;
        if (typeof height !== "number" || typeof width !== "number" || typeof thickness !== "number" || !(height > 0) || !(width > 0)) continue;
        const key = JSON.stringify([board.materialUid || board.materialName, thickness]);
        const entry = materials.get(key) ?? { key, materialName: label(board.materialUid, board.materialName) || "Materijal nije naveden", thickness, boards: 0, area: 0, cost: 0, price: prices.material?.(board.materialUid, board.materialName, thickness) ?? null };
        entry.boards += 1;
        entry.area = roundArea(entry.area + (height * width) / 1e6);
        materials.set(key, entry);
      }
      element.children.forEach(visit);
    };
    visit(root);
    const list = [...materials.values()].sort((a, b) => a.materialName.localeCompare(b.materialName, "hr") || b.thickness - a.thickness)
      .map(({ price, ...entry }) => ({ ...entry, cost: price === null ? 0 : money(entry.area * price) }));
    result.push({
      index, name: root.name || root.code || `Element ${index + 1}`, code: root.code,
      boards: list.reduce((sum, item) => sum + item.boards, 0), area: roundArea(list.reduce((sum, item) => sum + item.area, 0)), cost: money(list.reduce((sum, item) => sum + item.cost, 0)), materials: list,
    });
  });
  return result;
}

/** Osnovne marže u procentima po kategoriji (Corpus: grupa „Osnovni"; grupe 1–5 nisu podržane). */
export type UsedMaterialMargins = { disabled: boolean; boards: number; edges: number; other: number };

export const NO_MARGINS: UsedMaterialMargins = { disabled: false, boards: 0, edges: 0, other: 0 };

/** Zbir sa maržom: svaka kategorija se uvećava za svoj procent, osim kad je računanje marže onemogućeno. */
export function applyUsedMaterialMargins(totals: { boards: number; edges: number; other: number }, margins: UsedMaterialMargins): { boards: number; edges: number; other: number; total: number } {
  const money = (value: number) => Math.round(value * 100) / 100;
  const scale = (value: number, percent: number) => margins.disabled || !Number.isFinite(percent) ? value : money(value * (1 + percent / 100));
  const boards = scale(totals.boards, margins.boards), edges = scale(totals.edges, margins.edges), other = scale(totals.other, margins.other);
  return { boards, edges, other, total: money(boards + edges + other) };
}
