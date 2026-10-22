import { corpusRoomTotalHeight } from "./corpus-geometry.ts";
import type { CorpusS3dElement, CorpusS3dRoom } from "./corpus-s3d.ts";
import { corpusElementFootprint, corpusFootprintsOverlap, type CorpusElementFootprint } from "./corpus-footprint.ts";
import { corpusElementAllowsModeling } from "./corpus-group.ts";
import { corpusContainedRoomPosition } from "./corpus-placement.ts";

export type CorpusLayoutIssue = {
  type: "outside-room" | "overlap";
  message: string;
  elementIndexes: readonly number[];
};

export function corpusLayoutIssueElements(issue: CorpusLayoutIssue, analyzedElements: readonly CorpusS3dElement[]): readonly CorpusS3dElement[] {
  return issue.elementIndexes.map((index) => analyzedElements[index]).filter((element): element is CorpusS3dElement => element !== undefined);
}

export function corpusLayoutProblemElements(issues: readonly CorpusLayoutIssue[], analyzedElements: readonly CorpusS3dElement[]): {
  outsideRoom: readonly CorpusS3dElement[];
  overlapping: readonly CorpusS3dElement[];
} {
  const outside = new Set<CorpusS3dElement>();
  const overlapping = new Set<CorpusS3dElement>();
  for (const issue of issues) {
    const target = issue.type === "outside-room" ? outside : overlapping;
    for (const element of corpusLayoutIssueElements(issue, analyzedElements)) target.add(element);
  }
  return {
    outsideRoom: analyzedElements.filter((element) => outside.has(element)),
    overlapping: analyzedElements.filter((element) => overlapping.has(element)),
  };
}

export type CorpusLayoutContainmentResult = {
  elements: readonly CorpusS3dElement[];
  movedIndexes: readonly number[];
  blockedIndexes: readonly number[];
};

export type CorpusLayoutSeparationAxis = "x" | "z";
export type CorpusLayoutSeparationResult = {
  elements: readonly CorpusS3dElement[];
  movedIndex: number;
  delta: number;
};

/** Vraća samo zadane korijenske elemente unutar sobe, bez djelimične istorijske operacije po elementu. */
export function corpusContainedLayoutElements(
  elements: readonly CorpusS3dElement[],
  targets: readonly CorpusS3dElement[],
  room: CorpusS3dRoom,
  margin = 0,
): CorpusLayoutContainmentResult | null {
  if (!targets.length || !Number.isFinite(margin) || margin < 0) return null;
  const targetSet = new Set(targets);
  const movedIndexes: number[] = [];
  const blockedIndexes: number[] = [];
  const nextElements = elements.map((element, index) => {
    if (!targetSet.has(element)) return element;
    if (!corpusElementAllowsModeling(element)) {
      blockedIndexes.push(index);
      return element;
    }
    const position = corpusContainedRoomPosition(element, room, margin);
    if (!position) {
      blockedIndexes.push(index);
      return element;
    }
    if (position.every((value, axis) => value === element.position[axis])) return element;
    movedIndexes.push(index);
    return { ...element, position };
  });
  if (!movedIndexes.length) return { elements, movedIndexes, blockedIndexes };
  return { elements: nextElements, movedIndexes, blockedIndexes };
}

/** Prvi element ostaje sidro; drugi se po izabranoj svjetskoj osi pomjera do najbližeg dodira. */
export function corpusSeparatedLayoutElements(
  elements: readonly CorpusS3dElement[],
  targets: readonly CorpusS3dElement[],
  axis: CorpusLayoutSeparationAxis,
): CorpusLayoutSeparationResult | null {
  if (targets.length !== 2 || !corpusElementAllowsModeling(targets[1]!)) return null;
  const anchor = corpusElementFootprint(targets[0]!);
  const moving = corpusElementFootprint(targets[1]!);
  const movingIndex = elements.indexOf(targets[1]!);
  if (!anchor || !moving || movingIndex < 0 || !corpusFootprintsOverlap(anchor, moving)) return null;
  const positiveLimit = axis === "x" ? anchor.worldBounds.maxX - moving.worldBounds.minX : anchor.worldBounds.maxZ - moving.worldBounds.minZ;
  const negativeLimit = axis === "x" ? moving.worldBounds.maxX - anchor.worldBounds.minX : moving.worldBounds.maxZ - anchor.worldBounds.minZ;
  if (positiveLimit < 0 || negativeLimit < 0) return null;
  const positive = separationDistance(targets[1]!, anchor, axis, 1, positiveLimit);
  const negative = separationDistance(targets[1]!, anchor, axis, -1, negativeLimit);
  const delta = Math.abs(negative) < Math.abs(positive) ? negative : positive;
  const position = [...targets[1]!.position] as [number | null, number | null, number | null];
  const coordinate = axis === "x" ? 0 : 2;
  if (position[coordinate] === null) return null;
  position[coordinate] = position[coordinate]! + delta;
  const moved = { ...targets[1]!, position: position as readonly [number, number, number] };
  const nextElements = elements.map((element, index) => index === movingIndex ? moved : element);
  return { elements: nextElements, movedIndex: movingIndex, delta };
}

type LayoutElement = { index: number; name: string; footprint: CorpusElementFootprint };

export function analyzeCorpusLayout(elements: readonly CorpusS3dElement[], room: CorpusS3dRoom): CorpusLayoutIssue[] {
  const bounds = elements.map((element, index) => elementBounds(element, index)).filter((value): value is LayoutElement => value !== null);
  const issues: CorpusLayoutIssue[] = [];
  const roomLength = room.length === null ? null : room.length * 1000;
  const roomWidth = room.width === null ? null : room.width * 1000;
  const totalHeight = corpusRoomTotalHeight(room.height, room.lowerHeight);
  const roomHeight = totalHeight === null ? null : totalHeight * 1000;

  for (const item of bounds) {
    const bounds = item.footprint.worldBounds;
    const outside = bounds.minX < 0 || item.footprint.minY < 0 || bounds.minZ < 0
      || (roomLength !== null && bounds.maxX > roomLength)
      || (roomWidth !== null && bounds.maxZ > roomWidth)
      || (roomHeight !== null && item.footprint.maxY > roomHeight);
    if (outside) issues.push({ type: "outside-room", message: `${item.name} izlazi izvan granica prostorije.`, elementIndexes: [item.index] });
  }

  for (let left = 0; left < bounds.length; left += 1) {
    for (let right = left + 1; right < bounds.length; right += 1) {
      const a = bounds[left]!;
      const b = bounds[right]!;
      if (corpusFootprintsOverlap(a.footprint, b.footprint)) {
        issues.push({ type: "overlap", message: `${a.name} i ${b.name} se prostorno preklapaju.`, elementIndexes: [a.index, b.index] });
      }
    }
  }
  return issues;
}

function elementBounds(element: CorpusS3dElement, index: number): LayoutElement | null {
  if (element.visible === false) return null;
  const footprint = corpusElementFootprint(element);
  return footprint ? { index, name: element.name || element.code || `Element ${index + 1}`, footprint } : null;
}

function separationDistance(element: CorpusS3dElement, anchor: CorpusElementFootprint, axis: CorpusLayoutSeparationAxis, direction: 1 | -1, limit: number): number {
  let low = 0;
  let high = limit + 0.001;
  for (let iteration = 0; iteration < 60; iteration += 1) {
    const middle = (low + high) / 2;
    const position = [...element.position] as [number, number, number];
    position[axis === "x" ? 0 : 2] += middle * direction;
    const footprint = corpusElementFootprint({ ...element, position });
    if (footprint && corpusFootprintsOverlap(anchor, footprint)) low = middle;
    else high = middle;
  }
  return high * direction;
}
