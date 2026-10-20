import type { CorpusS3dElement, CorpusS3dRoom } from "./corpus-s3d.ts";
import { corpusRoomTotalHeight } from "./corpus-geometry.ts";
import { corpusElementFootprint } from "./corpus-footprint.ts";

export type CorpusRoomEdge = "floor" | "left" | "right" | "back" | "front";
export type CorpusAdjacentSide = "left" | "right" | "back" | "front";
export type CorpusAlignment = "left" | "centerX" | "right" | "back" | "centerZ" | "front" | "bottom" | "centerY" | "top";
export type CorpusPosition = readonly [number, number, number];

/** Računa sigurnu poziciju rotiranog omotača elementa u pravougaonoj sobi. */
export function corpusRoomPlacementPosition(
  element: CorpusS3dElement,
  room: CorpusS3dRoom,
  edge: CorpusRoomEdge,
  margin = 0,
): CorpusPosition | null {
  const geometry = usableGeometry(element);
  if (!geometry || !Number.isFinite(margin) || margin < 0) return null;
  const [x, y, z] = geometry;
  const footprint = corpusElementFootprint(element);
  if (!footprint) return null;
  if (edge === "floor") return [x, margin, z];
  if (edge === "left") return [margin - footprint.localBounds.minX, y, z];
  if (edge === "back") return [x, y, margin - footprint.localBounds.minZ];
  if (edge === "right") {
    if (room.length === null || room.length * 1000 < footprint.localBounds.maxX - footprint.localBounds.minX + margin * 2) return null;
    return [room.length * 1000 - margin - footprint.localBounds.maxX, y, z];
  }
  if (room.width === null || room.width * 1000 < footprint.localBounds.maxZ - footprint.localBounds.minZ + margin * 2) return null;
  return [x, y, room.width * 1000 - margin - footprint.localBounds.maxZ];
}

export function corpusAdjacentPlacementPosition(
  element: CorpusS3dElement,
  target: CorpusS3dElement,
  side: CorpusAdjacentSide,
  gap = 0,
): CorpusPosition | null {
  const source = usableGeometry(element);
  const anchor = usableGeometry(target);
  const sourceFootprint = corpusElementFootprint(element);
  const targetFootprint = corpusElementFootprint(target);
  if (!source || !anchor || !sourceFootprint || !targetFootprint || !Number.isFinite(gap) || gap < 0) return null;
  const [x, , z] = source;
  const targetY = anchor[1];
  if (side === "left") return [targetFootprint.worldBounds.minX - gap - sourceFootprint.localBounds.maxX, targetY, z];
  if (side === "right") return [targetFootprint.worldBounds.maxX + gap - sourceFootprint.localBounds.minX, targetY, z];
  if (side === "back") return [x, targetY, targetFootprint.worldBounds.minZ - gap - sourceFootprint.localBounds.maxZ];
  return [x, targetY, targetFootprint.worldBounds.maxZ + gap - sourceFootprint.localBounds.minZ];
}

export function corpusAlignedPlacementPosition(
  element: CorpusS3dElement,
  target: CorpusS3dElement,
  alignment: CorpusAlignment,
): CorpusPosition | null {
  const source = usableGeometry(element);
  const anchor = usableGeometry(target);
  const sourceFootprint = corpusElementFootprint(element);
  const targetFootprint = corpusElementFootprint(target);
  if (!source || !anchor || !sourceFootprint || !targetFootprint) return null;
  const [x, y, z] = source;
  if (alignment === "left") return [x + targetFootprint.worldBounds.minX - sourceFootprint.worldBounds.minX, y, z];
  if (alignment === "centerX") return [x + center(targetFootprint.worldBounds.minX, targetFootprint.worldBounds.maxX) - center(sourceFootprint.worldBounds.minX, sourceFootprint.worldBounds.maxX), y, z];
  if (alignment === "right") return [x + targetFootprint.worldBounds.maxX - sourceFootprint.worldBounds.maxX, y, z];
  if (alignment === "back") return [x, y, z + targetFootprint.worldBounds.minZ - sourceFootprint.worldBounds.minZ];
  if (alignment === "centerZ") return [x, y, z + center(targetFootprint.worldBounds.minZ, targetFootprint.worldBounds.maxZ) - center(sourceFootprint.worldBounds.minZ, sourceFootprint.worldBounds.maxZ)];
  if (alignment === "front") return [x, y, z + targetFootprint.worldBounds.maxZ - sourceFootprint.worldBounds.maxZ];
  if (alignment === "bottom") return [x, y + targetFootprint.minY - sourceFootprint.minY, z];
  if (alignment === "centerY") return [x, y + center(targetFootprint.minY, targetFootprint.maxY) - center(sourceFootprint.minY, sourceFootprint.maxY), z];
  return [x, y + targetFootprint.maxY - sourceFootprint.maxY, z];
}

export function corpusSnappedPosition(element: CorpusS3dElement, step = 10): CorpusPosition | null {
  const geometry = usableGeometry(element);
  if (!geometry || !Number.isFinite(step) || step <= 0) return null;
  return [
    Math.round(geometry[0] / step) * step,
    Math.round(geometry[1] / step) * step,
    Math.round(geometry[2] / step) * step,
  ];
}

/** Pomjera element najmanje moguće tako da njegov cijeli rotirani omotač bude unutar sobe. */
export function corpusContainedRoomPosition(
  element: CorpusS3dElement,
  room: CorpusS3dRoom,
  margin = 0,
): CorpusPosition | null {
  const geometry = usableGeometry(element);
  const footprint = corpusElementFootprint(element);
  const totalHeight = corpusRoomTotalHeight(room.height, room.lowerHeight);
  if (!geometry || !footprint || room.length === null || room.width === null || totalHeight === null) return null;
  if (!Number.isFinite(margin) || margin < 0) return null;

  const roomX = room.length * 1000;
  const roomY = totalHeight * 1000;
  const roomZ = room.width * 1000;
  const bounds = footprint.worldBounds;
  if (
    bounds.maxX - bounds.minX + margin * 2 > roomX
    || footprint.maxY - footprint.minY + margin * 2 > roomY
    || bounds.maxZ - bounds.minZ + margin * 2 > roomZ
  ) return null;

  const [x, y, z] = geometry;
  return [
    x + containmentShift(bounds.minX, bounds.maxX, roomX, margin),
    y + containmentShift(footprint.minY, footprint.maxY, roomY, margin),
    z + containmentShift(bounds.minZ, bounds.maxZ, roomZ, margin),
  ];
}

function usableGeometry(element: CorpusS3dElement): [number, number, number, number, number, number] | null {
  const [x, y, z] = element.position;
  const values = [x, y, z, element.width, element.height, element.depth];
  if (values.some((value) => value === null || !Number.isFinite(value))) return null;
  if (element.width! <= 0 || element.height! <= 0 || element.depth! <= 0) return null;
  return values as [number, number, number, number, number, number];
}

function center(minimum: number, maximum: number): number {
  return (minimum + maximum) / 2;
}

function containmentShift(minimum: number, maximum: number, boundary: number, margin: number): number {
  if (minimum < margin) return margin - minimum;
  if (maximum > boundary - margin) return boundary - margin - maximum;
  return 0;
}

