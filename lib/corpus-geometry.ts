export type CorpusBoardDimensions = readonly [x: number, y: number, z: number];
export type CorpusPoint3 = readonly [x: number, y: number, z: number];
export type CorpusCurvePointLike = Readonly<{ x: number; z: number; style: number; arcRadius?: number | null; arcSmooth?: number | null }>;

export function corpusRoomTotalHeight(height: number | null, lowerHeight: number | null): number | null {
  if (height === null && lowerHeight === null) return null;
  return Math.max(0, height ?? 0) + Math.max(0, lowerHeight ?? 0);
}

/**
 * Pretvara Corpusovu radnu ravan ploče u dimenzije 3D kutije.
 * SMJER 0 = bočna ploča, 1 = leđa/fronta, 2 = horizontalna ploča.
 */
export function corpusBoardDimensions(
  direction: number | null,
  height: number,
  width: number,
  thickness: number,
): CorpusBoardDimensions {
  if (direction === 0) return [thickness, height, width];
  if (direction === 1) return [width, height, thickness];
  if (direction === 2) return [height, thickness, width];
  return [height, thickness, width];
}

export function evaluateCorpusFormula(
  expression: string,
  variables: Readonly<Record<string, number>>,
): number | null {
  const result = evaluateCorpusExpression(expression, variables);
  return typeof result === "number" && Number.isFinite(result) ? result : null;
}

/** Položaj oznake rupe na glavnoj plohi ploče, u lokalnim osama ploče. */
export function corpusHolePosition(
  direction: number | null,
  alongHeight: number,
  alongWidth: number,
  height: number,
  width: number,
  thickness: number,
): CorpusPoint3 | null {
  if (alongHeight < 0 || alongHeight > height || alongWidth < 0 || alongWidth > width) return null;
  if (direction === 0) return [thickness + 0.6, alongHeight, alongWidth];
  if (direction === 1) return [alongWidth, alongHeight, thickness + 0.6];
  return [alongHeight, thickness + 0.6, alongWidth];
}

/**
 * Zadržava ravne segmente, a Corpusove stilove 1/2 zaglađuje zatvorenom
 * interpolacijom kroz susjedne tačke. Ovo je kontrolisana aproksimacija dok
 * PTPR/PTNE tangente ne budu potpuno potvrđene.
 */
export function expandCorpusCurve(
  source: readonly CorpusCurvePointLike[],
  subdivisions = 8,
): CorpusCurvePointLike[] {
  if (source.length < 3) return [...source];
  const result: CorpusCurvePointLike[] = [];
  const count = source.length;
  for (let index = 0; index < count; index += 1) {
    const previous = source[(index - 1 + count) % count]!;
    const current = source[index]!;
    const next = source[(index + 1) % count]!;
    const afterNext = source[(index + 2) % count]!;
    result.push(current);
    if (current.style === 0 && next.style === 0) continue;
    if (current.style === 2 && typeof current.arcRadius === "number" && current.arcRadius > 0) {
      const arc = circularArc(current, next, current.arcRadius, current.arcSmooth === 0 ? -1 : 1, subdivisions);
      if (arc) {
        result.push(...arc);
        continue;
      }
    }
    for (let step = 1; step < subdivisions; step += 1) {
      const t = step / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;
      result.push({
        x: 0.5 * (2 * current.x + (-previous.x + next.x) * t + (2 * previous.x - 5 * current.x + 4 * next.x - afterNext.x) * t2 + (-previous.x + 3 * current.x - 3 * next.x + afterNext.x) * t3),
        z: 0.5 * (2 * current.z + (-previous.z + next.z) * t + (2 * previous.z - 5 * current.z + 4 * next.z - afterNext.z) * t2 + (-previous.z + 3 * current.z - 3 * next.z + afterNext.z) * t3),
        style: current.style,
      });
    }
  }
  return result;
}

function circularArc(
  start: CorpusCurvePointLike,
  end: CorpusCurvePointLike,
  radius: number,
  side: 1 | -1,
  subdivisions: number,
): CorpusCurvePointLike[] | null {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const chord = Math.hypot(dx, dz);
  if (chord === 0 || chord > radius * 2 + 0.001) return null;
  const halfChord = chord / 2;
  const offset = Math.sqrt(Math.max(0, radius * radius - halfChord * halfChord));
  const midpointX = (start.x + end.x) / 2;
  const midpointZ = (start.z + end.z) / 2;
  const centerX = midpointX + side * (-dz / chord) * offset;
  const centerZ = midpointZ + side * (dx / chord) * offset;
  const startAngle = Math.atan2(start.z - centerZ, start.x - centerX);
  const endAngle = Math.atan2(end.z - centerZ, end.x - centerX);
  let sweep = endAngle - startAngle;
  if (side === 1 && sweep <= 0) sweep += Math.PI * 2;
  if (side === -1 && sweep >= 0) sweep -= Math.PI * 2;
  if (Math.abs(sweep) > Math.PI + 0.001) sweep += side === 1 ? -Math.PI * 2 : Math.PI * 2;

  const result: CorpusCurvePointLike[] = [];
  for (let step = 1; step < subdivisions; step += 1) {
    const angle = startAngle + sweep * (step / subdivisions);
    result.push({ x: centerX + Math.cos(angle) * radius, z: centerZ + Math.sin(angle) * radius, style: 2, arcRadius: radius, arcSmooth: start.arcSmooth });
  }
  return result;
}
import { evaluateCorpusExpression } from "./corpus-expression.ts";

