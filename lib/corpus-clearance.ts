import { corpusElementFootprint } from "./corpus-footprint.ts";
import { corpusRoomTotalHeight } from "./corpus-geometry.ts";
import type { CorpusS3dElement, CorpusS3dRoom } from "./corpus-s3d.ts";

export type CorpusClearanceStatus = "gap" | "touch" | "overlap";
export type CorpusAxisClearance = { axis: "X" | "Y" | "Z"; status: CorpusClearanceStatus; distance: number };
export type CorpusRoomSide = "left" | "right" | "back" | "front" | "floor" | "ceiling";
export type CorpusRoomClearance = { side: CorpusRoomSide; status: "inside" | "touch" | "outside" | "unknown"; distance: number | null };

export function corpusElementClearances(left: CorpusS3dElement, right: CorpusS3dElement): readonly CorpusAxisClearance[] | null {
  const a = corpusElementFootprint(left);
  const b = corpusElementFootprint(right);
  if (!a || !b) return null;
  return [
    relation("X", a.worldBounds.minX, a.worldBounds.maxX, b.worldBounds.minX, b.worldBounds.maxX),
    relation("Y", a.minY, a.maxY, b.minY, b.maxY),
    relation("Z", a.worldBounds.minZ, a.worldBounds.maxZ, b.worldBounds.minZ, b.worldBounds.maxZ),
  ];
}

export function corpusRoomClearances(element: CorpusS3dElement, room: CorpusS3dRoom): readonly CorpusRoomClearance[] | null {
  const footprint = corpusElementFootprint(element);
  if (!footprint) return null;
  const totalHeight = corpusRoomTotalHeight(room.height, room.lowerHeight);
  return [
    roomRelation("left", footprint.worldBounds.minX),
    roomRelation("right", room.length === null ? null : room.length * 1000 - footprint.worldBounds.maxX),
    roomRelation("back", footprint.worldBounds.minZ),
    roomRelation("front", room.width === null ? null : room.width * 1000 - footprint.worldBounds.maxZ),
    roomRelation("floor", footprint.minY),
    roomRelation("ceiling", totalHeight === null ? null : totalHeight * 1000 - footprint.maxY),
  ];
}

function relation(axis: CorpusAxisClearance["axis"], aMin: number, aMax: number, bMin: number, bMax: number): CorpusAxisClearance {
  const gap = aMax < bMin ? bMin - aMax : bMax < aMin ? aMin - bMax : 0;
  if (gap > 0.000001) return { axis, status: "gap", distance: clean(gap) };
  const overlap = Math.min(aMax, bMax) - Math.max(aMin, bMin);
  if (overlap > 0.000001) return { axis, status: "overlap", distance: clean(-overlap) };
  return { axis, status: "touch", distance: 0 };
}

function roomRelation(side: CorpusRoomSide, distance: number | null): CorpusRoomClearance {
  if (distance === null || !Number.isFinite(distance)) return { side, status: "unknown", distance: null };
  const value = clean(distance);
  if (value < -0.000001) return { side, status: "outside", distance: value };
  if (value > 0.000001) return { side, status: "inside", distance: value };
  return { side, status: "touch", distance: 0 };
}

function clean(value: number): number {
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}
