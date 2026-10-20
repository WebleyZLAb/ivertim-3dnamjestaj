import type { CorpusS3dElement } from "./corpus-s3d.ts";

export type CorpusPoint2 = readonly [x: number, z: number];
export type CorpusElementFootprint = {
  localCorners: readonly CorpusPoint2[];
  worldCorners: readonly CorpusPoint2[];
  localBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  worldBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  minY: number;
  maxY: number;
};

/**
 * Ista X/Z transformacija koju koristi Three.js prikaz: pivot je EXPOX/EZPOS.
 * Corpusov EZPOS je prednja referentna koordinata, pa nerotirana dubina zauzima
 * interval [EZPOS - EDUBINA, EZPOS].
 */
export function corpusElementFootprint(element: CorpusS3dElement): CorpusElementFootprint | null {
  const [x, y, z] = element.position;
  if ([x, y, z, element.width, element.height, element.depth].some((value) => value === null || !Number.isFinite(value))) return null;
  if (element.width! <= 0 || element.height! <= 0 || element.depth! <= 0) return null;
  const radians = (element.angle ?? 0) * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const localCorners = ([[0, 0], [element.width!, 0], [element.width!, element.depth!], [0, element.depth!]] as const)
    .map(([localX, localZ]) => [cosine * localX - sine * localZ, -sine * localX - cosine * localZ] as const);
  const worldCorners = localCorners.map(([localX, localZ]) => [x! + localX, z! + localZ] as const);
  return {
    localCorners,
    worldCorners,
    localBounds: boundsFor(localCorners),
    worldBounds: boundsFor(worldCorners),
    minY: y!,
    maxY: y! + element.height!,
  };
}

export function corpusFootprintsOverlap(left: CorpusElementFootprint, right: CorpusElementFootprint): boolean {
  if (left.minY >= right.maxY || left.maxY <= right.minY) return false;
  const axes = [...polygonAxes(left.worldCorners), ...polygonAxes(right.worldCorners)];
  return axes.every((axis) => {
    const a = project(left.worldCorners, axis);
    const b = project(right.worldCorners, axis);
    return a.min < b.max - 1e-7 && a.max > b.min + 1e-7;
  });
}

function boundsFor(points: readonly CorpusPoint2[]) {
  return {
    minX: Math.min(...points.map(([x]) => x)),
    maxX: Math.max(...points.map(([x]) => x)),
    minZ: Math.min(...points.map(([, z]) => z)),
    maxZ: Math.max(...points.map(([, z]) => z)),
  };
}

function polygonAxes(points: readonly CorpusPoint2[]): CorpusPoint2[] {
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length]!;
    const edgeX = next[0] - point[0];
    const edgeZ = next[1] - point[1];
    const length = Math.hypot(edgeX, edgeZ) || 1;
    return [-edgeZ / length, edgeX / length] as const;
  }).slice(0, 2);
}

function project(points: readonly CorpusPoint2[], axis: CorpusPoint2) {
  const values = points.map(([x, z]) => x * axis[0] + z * axis[1]);
  return { min: Math.min(...values), max: Math.max(...values) };
}
