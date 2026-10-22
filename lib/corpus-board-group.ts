import { corpusBoardDimensions } from "./corpus-geometry.ts";
import type { CorpusS3dBoard, CorpusS3dElement } from "./corpus-s3d.ts";

export type CorpusBoardTranslation = readonly [number, number, number];
export type CorpusBoardGroupAxis = "x" | "y" | "z";
export type CorpusBoardGroupAlignment = "min" | "center" | "max";
export type CorpusBoardDistribution = { element: CorpusS3dElement; gap: number };
export type CorpusBoardAppearance = Pick<CorpusS3dBoard, "materialName" | "materialUid" | "color" | "transparent" | "visible">;
export type CorpusBoardGroupBounds = {
  minimum: readonly [number, number, number];
  maximum: readonly [number, number, number];
  size: readonly [number, number, number];
};
export type CorpusBoardGroupPlacement = { element: CorpusS3dElement; bounds: CorpusBoardGroupBounds };

/** Mjeri fizički lokalni omotač jedne nerotirane ploče u Corpus X/Y/Z prostoru. */
export function corpusBoardBounds(element: CorpusS3dElement, boardIndex: number): CorpusBoardGroupBounds {
  if (!Number.isInteger(boardIndex) || boardIndex < 0 || boardIndex >= element.boards.length) throw new Error("Aktivna ploča više nije važeća.");
  return physicalBoardBounds(element.boards[boardIndex]!);
}

/** Pomjera jednu direktnu ploču elementa dokazanim lokalnim X/Y/Z pomakom. */
export function corpusTranslatedBoard(element: CorpusS3dElement, boardIndex: number, delta: CorpusBoardTranslation): CorpusS3dElement {
  if (!Number.isInteger(boardIndex) || boardIndex < 0 || boardIndex >= element.boards.length) throw new Error("Aktivna ploča više nije važeća.");
  if (delta.some((value) => !Number.isFinite(value))) throw new Error("Pomak mora sadržati tri konačna broja.");
  if (delta.every((value) => value === 0)) throw new Error("Najmanje jedan pomak mora biti različit od nule.");
  const board = element.boards[boardIndex]!;
  if (board.position.some((value) => value === null || !Number.isFinite(value))) throw new Error("Ploča mora imati potpune X/Y/Z koordinate.");
  return {
    ...element,
    boards: element.boards.map((entry, index) => index === boardIndex ? {
      ...entry,
      position: entry.position.map((value, axis) => Number((value! + delta[axis]!).toFixed(3))) as [number, number, number],
    } : entry),
  };
}

/** Primjenjuje dokazane atribute izgleda iz jedne ploče na označene ploče, bez diranja geometrije i obrada. */
export function corpusAppliedBoardAppearance(
  element: CorpusS3dElement,
  selectedIndexes: readonly number[],
  sourceIndex: number,
): CorpusS3dElement {
  const indexes = validBoardIndexes(element, selectedIndexes, "Za grupni izgled označi najmanje dvije ploče.");
  if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= element.boards.length) {
    throw new Error("Aktivna ploča više nije važeća.");
  }
  const source = element.boards[sourceIndex]!;
  const appearance: CorpusBoardAppearance = {
    materialName: source.materialName,
    materialUid: source.materialUid,
    color: source.color,
    transparent: source.transparent,
    visible: source.visible,
  };
  const selected = new Set(indexes);
  return { ...element, boards: element.boards.map((board, index) => selected.has(index) ? { ...board, ...appearance } : board) };
}

/** Prikazuje ili skriva označene ploče kao jednu modelsku promjenu. */
export function corpusSetBoardsVisibility(
  element: CorpusS3dElement,
  selectedIndexes: readonly number[],
  visible: boolean,
): CorpusS3dElement {
  const indexes = validBoardIndexes(element, selectedIndexes, "Za grupnu vidljivost označi najmanje dvije ploče.");
  const selected = new Set(indexes);
  return { ...element, boards: element.boards.map((board, index) => selected.has(index) ? { ...board, visible } : board) };
}

/** Mjeri zajednički fizički lokalni omotač označenih nerotiranih ploča. */
export function corpusBoardGroupBounds(element: CorpusS3dElement, selectedIndexes: readonly number[]): CorpusBoardGroupBounds {
  const indexes = validBoardIndexes(element, selectedIndexes, "Za grupni omotač označi najmanje dvije ploče.");
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];
  for (const index of indexes) {
    const bounds = physicalBoardBounds(element.boards[index]!);
    for (let axis = 0; axis < 3; axis += 1) {
      minimum[axis] = Math.min(minimum[axis]!, bounds.minimum[axis]!);
      maximum[axis] = Math.max(maximum[axis]!, bounds.maximum[axis]!);
    }
  }
  return {
    minimum: minimum.map(round) as [number, number, number],
    maximum: maximum.map(round) as [number, number, number],
    size: maximum.map((value, axis) => round(value - minimum[axis]!)) as [number, number, number],
  };
}

/** Postavlja zajednički omotač označenih ploča unutar lokalnog omotača elementa. */
export function corpusPlacedBoardsInElement(
  element: CorpusS3dElement,
  selectedIndexes: readonly number[],
  axis: CorpusBoardGroupAxis,
  alignment: CorpusBoardGroupAlignment,
  inset = 0,
): CorpusBoardGroupPlacement {
  if (!Number.isFinite(inset) || inset < 0) throw new Error("Odmak mora biti nenegativan broj.");
  const span = [element.width, element.height, element.depth];
  if (span.some((value) => value === null || !Number.isFinite(value) || value! <= 0)) throw new Error("Element nema potpun, pozitivan lokalni omotač.");
  const indexes = validBoardIndexes(element, selectedIndexes, "Za grupno postavljanje označi najmanje dvije ploče.");
  const bounds = corpusBoardGroupBounds(element, indexes);
  const axisIndex = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  if (bounds.size[axisIndex] + inset * 2 > span[axisIndex]! + 0.000001) {
    throw new Error("Označene ploče sa zadanim odmakom ne stanu u omotač elementa po izabranoj osi.");
  }
  const targetMinimum = alignment === "min" ? inset : alignment === "max" ? span[axisIndex]! - bounds.size[axisIndex] - inset : (span[axisIndex]! - bounds.size[axisIndex]) / 2;
  const physicalDelta = targetMinimum - bounds.minimum[axisIndex];
  const storedDelta = axis === "z" ? -physicalDelta : physicalDelta;
  const selected = new Set(indexes);
  const next = {
    ...element,
    boards: element.boards.map((board, index) => {
      if (!selected.has(index)) return board;
      const position = [...board.position] as [number, number, number];
      position[axisIndex] = round(position[axisIndex]! + storedDelta);
      return { ...board, position };
    }),
  };
  return { element: next, bounds: corpusBoardGroupBounds(next, indexes) };
}

/** Pomjera više direktnih ploča elementa jednim lokalnim X/Y/Z pomakom. */
export function corpusTranslatedBoards(
  element: CorpusS3dElement,
  selectedIndexes: readonly number[],
  delta: CorpusBoardTranslation,
): CorpusS3dElement {
  const indexes = [...new Set(selectedIndexes)].sort((left, right) => left - right);
  if (indexes.length < 2) throw new Error("Označi najmanje dvije ploče.");
  if (indexes.some((index) => !Number.isInteger(index) || index < 0 || index >= element.boards.length)) {
    throw new Error("Izbor ploča više nije važeći.");
  }
  if (delta.some((value) => !Number.isFinite(value))) throw new Error("Pomak mora sadržati tri konačna broja.");
  if (delta.every((value) => value === 0)) throw new Error("Najmanje jedan pomak mora biti različit od nule.");
  if (indexes.some((index) => element.boards[index]!.position.some((value) => value === null || !Number.isFinite(value)))) {
    throw new Error("Sve označene ploče moraju imati potpune X/Y/Z koordinate.");
  }

  const selected = new Set(indexes);
  return {
    ...element,
    boards: element.boards.map((board, index) => selected.has(index) ? {
      ...board,
      position: board.position.map((value, axis) => Number((value! + delta[axis]!).toFixed(3))) as [number, number, number],
    } : board),
  };
}

/** Ravnomjerno raspoređuje najmanje tri ploče jednakim fizičkim razmakom između krajnjih ploča. */
export function corpusEvenlyDistributedBoards(
  element: CorpusS3dElement,
  selectedIndexes: readonly number[],
  axis: CorpusBoardGroupAxis,
): CorpusBoardDistribution {
  const indexes = [...new Set(selectedIndexes)];
  if (indexes.length < 3) throw new Error("Za ravnomjernu raspodjelu označi najmanje tri ploče.");
  if (indexes.some((index) => !Number.isInteger(index) || index < 0 || index >= element.boards.length)) {
    throw new Error("Izbor ploča više nije važeći.");
  }
  const axisIndex = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  const entries = indexes.map((index) => boardAxisGeometry(element, index, axis, "Raspodjela")).sort((left, right) => left.minimum - right.minimum || left.index - right.index);

  const first = entries[0]!;
  const last = entries.at(-1)!;
  const available = last.maximum - first.minimum;
  const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
  const gap = (available - totalSize) / (entries.length - 1);
  if (gap < -0.000001) throw new Error("Između krajnjih ploča nema dovoljno prostora za raspodjelu bez preklapanja.");

  const nextPositions = new Map<number, readonly [number, number, number]>();
  let cursor = first.minimum;
  for (const entry of entries) {
    const position = [...entry.board.position] as [number, number, number];
    position[axisIndex] = round(axis === "z" ? -cursor : cursor);
    nextPositions.set(entry.index, position);
    cursor += entry.size + gap;
  }
  return {
    element: { ...element, boards: element.boards.map((board, index) => nextPositions.has(index) ? { ...board, position: nextPositions.get(index)! } : board) },
    gap: round(gap),
  };
}

/** Poravnava fizičku početnu ivicu, centar ili završnu ivicu prema prvoj označenoj ploči. */
export function corpusAlignedBoardsToAnchor(
  element: CorpusS3dElement,
  selectedIndexes: readonly number[],
  axis: CorpusBoardGroupAxis,
  alignment: CorpusBoardGroupAlignment,
): CorpusS3dElement {
  const indexes = [...new Set(selectedIndexes)].sort((left, right) => left - right);
  if (indexes.length < 2) throw new Error("Za poravnanje označi najmanje dvije ploče.");
  if (indexes.some((index) => !Number.isInteger(index) || index < 0 || index >= element.boards.length)) {
    throw new Error("Izbor ploča više nije važeći.");
  }
  const axisIndex = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  const entries = indexes.map((index) => boardAxisGeometry(element, index, axis, "Poravnanje"));
  const anchor = entries[0]!;
  const anchorCoordinate = alignment === "min" ? anchor.minimum : alignment === "max" ? anchor.maximum : (anchor.minimum + anchor.maximum) / 2;
  const nextPositions = new Map<number, readonly [number, number, number]>();
  for (const entry of entries) {
    const minimum = alignment === "min" ? anchorCoordinate : alignment === "max" ? anchorCoordinate - entry.size : anchorCoordinate - entry.size / 2;
    const position = [...entry.board.position] as [number, number, number];
    position[axisIndex] = round(axis === "z" ? -minimum : minimum);
    nextPositions.set(entry.index, position);
  }
  return { ...element, boards: element.boards.map((board, index) => nextPositions.has(index) ? { ...board, position: nextPositions.get(index)! } : board) };
}

function boardAxisGeometry(element: CorpusS3dElement, index: number, axis: CorpusBoardGroupAxis, operation: string) {
  const board = element.boards[index]!;
  if (board.direction === null || ![0, 1, 2].includes(board.direction)) throw new Error("Označena ploča nema podržani Corpus SMJER.");
  if ([...board.position, board.height, board.width, board.thickness].some((value) => value === null || !Number.isFinite(value))) {
    throw new Error("Sve označene ploče moraju imati potpunu geometriju.");
  }
  if ([board.angle, board.xAngle, board.zAngle].some((value) => value !== null && Math.abs(value) > 0.000001)) {
    throw new Error(`${operation} ne nagađa granice rotirane ploče.`);
  }
  const axisIndex = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  const size = corpusBoardDimensions(board.direction, board.height!, board.width!, board.thickness!)[axisIndex];
  const minimum = axis === "z" ? -board.position[2]! : board.position[axisIndex]!;
  return { index, board, size, minimum, maximum: minimum + size };
}

function validBoardIndexes(element: CorpusS3dElement, selectedIndexes: readonly number[], tooFewMessage: string): number[] {
  const indexes = [...new Set(selectedIndexes)].sort((left, right) => left - right);
  if (indexes.length < 2) throw new Error(tooFewMessage);
  if (indexes.some((index) => !Number.isInteger(index) || index < 0 || index >= element.boards.length)) {
    throw new Error("Izbor ploča više nije važeći.");
  }
  return indexes;
}

function physicalBoardBounds(board: CorpusS3dBoard): CorpusBoardGroupBounds {
  if (board.direction === null || ![0, 1, 2].includes(board.direction)) throw new Error("Ploča nema podržani Corpus SMJER.");
  if ([...board.position, board.height, board.width, board.thickness].some((value) => value === null || !Number.isFinite(value))) {
    throw new Error("Ploča mora imati potpunu geometriju.");
  }
  if ([board.angle, board.xAngle, board.zAngle].some((value) => value !== null && Math.abs(value) > 0.000001)) {
    throw new Error("Omotač ne nagađa granice rotirane ploče.");
  }
  const size = corpusBoardDimensions(board.direction, board.height!, board.width!, board.thickness!);
  const minimum = [board.position[0]!, board.position[1]!, -board.position[2]!] as const;
  const maximum = minimum.map((value, axis) => round(value + size[axis]!)) as [number, number, number];
  return { minimum: minimum.map(round) as [number, number, number], maximum, size: size.map(round) as [number, number, number] };
}

function round(value: number): number {
  return Number(value.toFixed(3));
}
