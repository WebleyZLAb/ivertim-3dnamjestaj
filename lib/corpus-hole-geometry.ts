import type { CorpusS3dBoard, CorpusS3dHole } from "./corpus-s3d.ts";
import { evaluateCorpusFormula } from "./corpus-geometry.ts";

export interface CorpusMainFaceHole {
  hole: CorpusS3dHole;
  u: number;
  v: number;
  radius: number;
  depth: number;
  kind: "blind" | "through";
  side: "min" | "max";
}

/**
 * Upareni lijevi/desni elementi iz stvarne biblioteke potvrđuju RPL=0/1 kao
 * suprotne glavne strane ploče. Ostale ravni ostaju izvan fizičkog reza.
 */
export function resolveCorpusMainFaceHoles(board: CorpusS3dBoard): CorpusMainFaceHole[] {
  const height = board.height;
  const width = board.width;
  const thickness = board.thickness;
  if (height === null || width === null || thickness === null || height <= 0 || width <= 0 || thickness <= 0) return [];

  const variables = { B: height, L: width, D: thickness };
  return board.holes.flatMap((hole) => {
    if (![0, 1].includes(hole.plane ?? -1) || hole.depth === null || hole.depth <= 0 || hole.diameter === null || hole.diameter <= 0) return [];
    const u = evaluateCorpusFormula(hole.xExpression, variables);
    const v = evaluateCorpusFormula(hole.yExpression, variables);
    const radius = hole.diameter / 2;
    if (u === null || v === null || u - radius < 0 || u + radius > height || v - radius < 0 || v + radius > width) return [];
    const depth = Math.min(hole.depth, thickness);
    return [{ hole, u, v, radius, depth, kind: depth >= thickness - 0.01 ? "through" : "blind", side: hole.plane === 0 ? "min" : "max" }];
  });
}
