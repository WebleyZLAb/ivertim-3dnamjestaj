import type { CorpusS3dHole } from "./corpus-s3d.ts";

export interface CorpusHoleDraft {
  name: string;
  xExpression: string;
  yExpression: string;
  diameter: string;
  depth: string;
  plane: string;
  angle: string;
}

/** Validate explicit editor input; imported holes are preserved by the reader. */
export function holeFromDraft(draft: CorpusHoleDraft, previous: CorpusS3dHole | null): CorpusS3dHole | string {
  const diameter = Number(draft.diameter);
  const depth = Number(draft.depth);
  const plane = Number(draft.plane);
  const angle = Number(draft.angle);
  if (!draft.name.trim() || !draft.xExpression.trim() || !draft.yExpression.trim()) return "Popuni naziv i početni X/Y položaj.";
  if (![diameter, depth].every(value => Number.isFinite(value) && value > 0)) return "Prečnik i dubina moraju biti veći od nule.";
  if (!draft.plane.trim() || !Number.isInteger(plane) || plane < 0 || plane > 5) return "Ploha mora biti cijeli broj od 0 do 5.";
  if (!draft.angle.trim() || !Number.isFinite(angle)) return "Upiši broj za ugao bušenja.";
  return {
    ...(previous?.sourceIndex === undefined ? {} : { sourceIndex: previous.sourceIndex }),
    groupType: previous?.groupType || "GRUPA14", name: draft.name.trim(), xExpression: draft.xExpression.trim(), yExpression: draft.yExpression.trim(),
    diameter, depth, plane, angle, machiningMode: previous?.machiningMode ?? null, machining: previous ? { ...previous.machining } : {},
  };
}
