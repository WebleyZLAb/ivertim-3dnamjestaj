import { corpusBoardDimensions } from "./corpus-geometry.ts";
import type { CorpusS3dBoard, CorpusS3dElement } from "./corpus-s3d.ts";

export type CorpusBoardPlacementAxis = "x" | "y" | "z";
export type CorpusBoardPlacementAlignment = "min" | "center" | "max";
export type CorpusBoardPlacementResult =
  | { ok: true; position: readonly [number, number, number] }
  | { ok: false; reason: string };
export type CorpusBoardDistributionResult =
  | { ok: true; positions: readonly (readonly [number, number, number])[]; step: number }
  | { ok: false; reason: string };

/**
 * Poravnava nerotiranu ploču u lokalnom Corpus omotaču elementa.
 * Z osa je zapisana kao Corpus DZPOS: 3D prikaz koristi -DZPOS, pa prednja
 * ravan počinje na 0, a zadnja unutrašnja ravan ima negativnu vrijednost.
 */
export function corpusAlignedBoardPosition(
  element: CorpusS3dElement,
  board: CorpusS3dBoard,
  axis: CorpusBoardPlacementAxis,
  alignment: CorpusBoardPlacementAlignment,
  inset = 0,
): CorpusBoardPlacementResult {
  if (!Number.isFinite(inset) || inset < 0) return { ok: false, reason: "Odmak mora biti nenegativan broj." };
  if (![element.width, element.height, element.depth].every((value) => typeof value === "number" && Number.isFinite(value) && value > 0)) {
    return { ok: false, reason: "Element nema potpun, pozitivan lokalni omotač." };
  }
  if (board.direction === null || ![0, 1, 2].includes(board.direction)) return { ok: false, reason: "Ploča nema podržani Corpus SMJER." };
  if (![...board.position, board.height, board.width, board.thickness].every((value) => typeof value === "number" && Number.isFinite(value))) {
    return { ok: false, reason: "Ploča nema potpunu geometriju." };
  }
  if ([board.angle, board.xAngle, board.zAngle].some((value) => value !== null && Math.abs(value) > 0.000001)) {
    return { ok: false, reason: "Automatsko poravnanje ne nagađa granice rotirane ploče." };
  }
  const size = corpusBoardDimensions(board.direction, board.height!, board.width!, board.thickness!);
  const span = [element.width!, element.height!, element.depth!] as const;
  const index = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  if (size[index] <= 0 || size[index] + inset * 2 > span[index] + 0.000001) {
    return { ok: false, reason: "Ploča sa zadanim odmakom ne stane u omotač elementa po izabranoj osi." };
  }
  const physical = alignment === "min" ? inset : alignment === "max" ? span[index] - size[index] - inset : (span[index] - size[index]) / 2;
  const position = [...board.position] as [number, number, number];
  position[index] = round(axis === "z" ? -physical : physical);
  return { ok: true, position };
}

/** Raspoređuje izabranu ploču i njene buduće kopije od prve do zadnje unutrašnje granice. */
export function corpusEvenBoardPositions(
  element: CorpusS3dElement,
  board: CorpusS3dBoard,
  total: number,
  axis: CorpusBoardPlacementAxis,
  inset = 0,
): CorpusBoardDistributionResult {
  if (!Number.isInteger(total) || total < 2 || total > 51) return { ok: false, reason: "Ukupan broj ploča mora biti od 2 do 51." };
  const start = corpusAlignedBoardPosition(element, board, axis, "min", inset);
  const end = corpusAlignedBoardPosition(element, board, axis, "max", inset);
  if (!start.ok) return start;
  if (!end.ok) return end;
  const index = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  const step = (end.position[index] - start.position[index]) / (total - 1);
  const positions = Array.from({ length: total }, (_, item) => {
    const position = [...start.position] as [number, number, number];
    position[index] = round(start.position[index] + step * item);
    return position;
  });
  return { ok: true, positions, step: round(Math.abs(step)) };
}

function round(value: number): number {
  return Number(value.toFixed(3));
}
