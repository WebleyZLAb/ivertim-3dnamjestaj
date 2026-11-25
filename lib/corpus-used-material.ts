import { corpusBoardPartKind, type CorpusS3dElement } from "./corpus-s3d.ts";
import { buildCorpusConsumablesList, type CorpusConsumableItem } from "./corpus-consumables.ts";

/**
 * Popis „Utrošeni materijal" kao u Corpusu: ploče po materijalu, rubne trake i okovi.
 *
 * Provjereno na projektu Kuhinja_1 (Corpus 6, 25.11.2026.): zbir površina po materijalu poklapa se
 * s Corpusom na dvije decimale, a okovi (DRVENA TIPLA 383, KONFIRMAT 176, BAGLAMA 12) tačno.
 * U popis ne ulaze skrivene ploče, ploče debljine 0 (profili), pomoćni dijelovi (frontType 5, noge)
 * ni nepoznati dijelovi (frontType 8, ulošci). Dužine rubnih traka su NETO (bez dodatka); Corpus
 * ih za neke grupe uvećava za oko 5 %, a raspored traka po grupama još nije potvrđen.
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
};

export type UsedEdgeGroup = {
  key: string;
  /** Materijal ploče na koju se traka lijepi. */
  boardMaterialName: string;
  boardThickness: number;
  /** Npr. "1mm" ili "0.5mm". */
  edgeName: string;
  edgeMaterialName: string;
  /** Neto dužina u metrima. */
  length: number;
};

export type UsedMaterial = {
  materials: UsedMaterialGroup[];
  edges: UsedEdgeGroup[];
  fittings: CorpusConsumableItem[];
  totalArea: number;
};

type Label = (uid: string, name: string) => string;

const roundArea = (value: number) => Math.round(value * 1e6) / 1e6;

export function corpusBoardInUsedMaterial(board: { frontType: number | null; thickness: number | null; visible: boolean | null }): boolean {
  if (board.visible === false) return false;
  if (typeof board.thickness !== "number" || !(board.thickness > 0)) return false;
  const kind = corpusBoardPartKind(board.frontType);
  return kind === "board" || kind === "front";
}

export function buildCorpusUsedMaterial(elements: readonly CorpusS3dElement[], label: Label = (uid, name) => name || uid): UsedMaterial {
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
        const group = materials.get(key) ?? { key, materialName, materialUid: board.materialUid, thickness, rows: [], area: 0 };
        const area = (height * width) / 1e6;
        group.rows.push({ key: `${key}:${group.rows.length}`, element: elementName, board: board.name || `Ploča ${boardIndex + 1}`, height, width, thickness, area });
        group.area = roundArea(group.area + area);
        materials.set(key, group);

        for (const edge of board.consumables) {
          if (edge.type !== "0") continue;
          const [side0, side1, side2, side3] = edge.sides;
          // Strane 0 i 2 su duž visine ploče, 1 i 3 duž širine (potvrđeno na 2 od 6 grupa traka u Corpusu).
          const length = ((side0 ? height : 0) + (side2 ? height : 0) + (side1 ? width : 0) + (side3 ? width : 0)) / 1000;
          if (length === 0) continue;
          const edgeMaterialName = label(edge.materialUid, edge.materialName);
          const edgeKey = JSON.stringify([key, edge.name, edge.materialUid || edge.materialName]);
          const entry = edges.get(edgeKey) ?? { key: edgeKey, boardMaterialName: materialName, boardThickness: thickness, edgeName: edge.name, edgeMaterialName, length: 0 };
          entry.length = Math.round((entry.length + length) * 1e6) / 1e6;
          edges.set(edgeKey, entry);
        }
      });
      visit(element.children, hidden);
    });
  };
  visit(elements, false);

  const sortedMaterials = [...materials.values()].sort((a, b) => a.materialName.localeCompare(b.materialName, "hr") || b.thickness - a.thickness);
  return {
    materials: sortedMaterials,
    edges: [...edges.values()].sort((a, b) => a.boardMaterialName.localeCompare(b.boardMaterialName, "hr") || a.edgeName.localeCompare(b.edgeName, "hr")),
    fittings: buildCorpusConsumablesList(elements).filter((item) => item.type === "1"),
    totalArea: roundArea(sortedMaterials.reduce((sum, group) => sum + group.area, 0)),
  };
}
