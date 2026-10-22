import { corpusAlignedPlacementPosition, type CorpusAlignment, type CorpusPosition } from "./corpus-placement.ts";
import { corpusElementFootprint } from "./corpus-footprint.ts";
import { corpusRoomTotalHeight } from "./corpus-geometry.ts";
import type { CorpusS3dElement, CorpusS3dRoom } from "./corpus-s3d.ts";

export type CorpusGroupDistributionAxis = "x" | "y" | "z";
export type CorpusGroupRoomSide = "left" | "right" | "floor" | "ceiling" | "back" | "front";
export type CorpusGroupBounds = {
  minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number;
  width: number; height: number; depth: number;
};
export type CorpusGroupRoomClearance = { side: CorpusGroupRoomSide; distance: number | null; status: "free" | "touch" | "outside" | "unknown" };

/** Corpus element se smije geometrijski mijenjati samo kada nije zaključan niti označen kao neurediv. */
export function corpusElementAllowsModeling(element: CorpusS3dElement): boolean {
  return element.locked !== true && element.editable !== false;
}

/** Mjeri zajednički svjetski omotač jednog ili više korijenskih elemenata. */
export function corpusGroupBounds(elements: readonly CorpusS3dElement[], selectedIndexes: readonly number[]): CorpusGroupBounds | null {
  const indexes = [...new Set(selectedIndexes)];
  if (!indexes.length || indexes.some((index) => !Number.isInteger(index) || index < 0 || index >= elements.length)) return null;
  const footprints = indexes.map((index) => corpusElementFootprint(elements[index]!));
  if (footprints.some((footprint) => footprint === null)) return null;
  const measured = footprints.filter((footprint): footprint is NonNullable<typeof footprint> => footprint !== null);
  const minX = Math.min(...measured.map((item) => item.worldBounds.minX));
  const maxX = Math.max(...measured.map((item) => item.worldBounds.maxX));
  const minY = Math.min(...measured.map((item) => item.minY));
  const maxY = Math.max(...measured.map((item) => item.maxY));
  const minZ = Math.min(...measured.map((item) => item.worldBounds.minZ));
  const maxZ = Math.max(...measured.map((item) => item.worldBounds.maxZ));
  return { minX, maxX, minY, maxY, minZ, maxZ, width: maxX - minX, height: maxY - minY, depth: maxZ - minZ };
}

/** Mjeri šest udaljenosti zajedničkog omotača grupe do poznatih granica sobe. */
export function corpusGroupRoomClearances(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  room: CorpusS3dRoom,
): readonly CorpusGroupRoomClearance[] | null {
  const bounds = corpusGroupBounds(elements, selectedIndexes);
  if (!bounds) return null;
  const roomHeight = corpusRoomTotalHeight(room.height, room.lowerHeight);
  const distances: Array<[CorpusGroupRoomSide, number | null]> = [
    ["left", bounds.minX], ["right", room.length === null ? null : room.length * 1000 - bounds.maxX],
    ["floor", bounds.minY], ["ceiling", roomHeight === null ? null : roomHeight * 1000 - bounds.maxY],
    ["back", bounds.minZ], ["front", room.width === null ? null : room.width * 1000 - bounds.maxZ],
  ];
  return distances.map(([side, distance]) => ({ side, distance, status: distance === null || !Number.isFinite(distance) ? "unknown" : distance < 0 ? "outside" : Math.abs(distance) < 0.01 ? "touch" : "free" }));
}

/** Pomjera izabrane korijenske elemente za isti vektor, čuvajući njihov međusobni raspored. */
export function corpusTranslatedElements(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  delta: CorpusPosition,
): readonly CorpusS3dElement[] | null {
  const indexes = modelingIndexes(elements, selectedIndexes);
  if (!indexes || delta.some((value) => !Number.isFinite(value))) return null;
  if (delta.every((value) => value === 0)) return elements;
  const next = [...elements];
  for (const index of indexes) {
    const element = elements[index]!;
    if (element.position.some((value) => value === null || !Number.isFinite(value))) return null;
    next[index] = {
      ...element,
      position: element.position.map((value, axis) => value! + delta[axis]!) as [number, number, number],
    };
  }
  return next;
}

/** Postavlja minimalni X/Y/Z ugao zajedničkog omotača na tačno zadanu svjetsku koordinatu. */
export function corpusPositionedGroupElements(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  targetMinimum: CorpusPosition,
): readonly CorpusS3dElement[] | null {
  const indexes = modelingIndexes(elements, selectedIndexes);
  if (!indexes || targetMinimum.some((value) => !Number.isFinite(value))) return null;
  const bounds = corpusGroupBounds(elements, indexes);
  if (!bounds) return null;
  return corpusTranslatedElements(elements, indexes, [
    targetMinimum[0] - bounds.minX,
    targetMinimum[1] - bounds.minY,
    targetMinimum[2] - bounds.minZ,
  ]);
}

/** Poravnava grupu prema prvom označenom korijenskom elementu, koji ostaje sidro. */
export function corpusAlignedGroupElements(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  alignment: CorpusAlignment,
): readonly CorpusS3dElement[] | null {
  const indexes = modelingIndexes(elements, selectedIndexes);
  if (!indexes) return null;
  const anchor = elements[indexes[0]!]!;
  const next = [...elements];
  for (const index of indexes.slice(1)) {
    const element = elements[index]!;
    const position = corpusAlignedPlacementPosition(element, anchor, alignment);
    if (!position) return null;
    next[index] = { ...element, position };
  }
  return next;
}

/** Rotira položaje i EKUT grupe oko pivota prvog označenog korijenskog elementa. */
export function corpusRotatedGroupElements(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  angle: number,
): readonly CorpusS3dElement[] | null {
  const indexes = modelingIndexes(elements, selectedIndexes);
  if (!indexes || !Number.isFinite(angle)) return null;
  const anchor = elements[indexes[0]!]!;
  const [anchorX, , anchorZ] = anchor.position;
  if (anchorX === null || anchorZ === null || !Number.isFinite(anchorX) || !Number.isFinite(anchorZ)) return null;
  const radians = angle * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const next = [...elements];
  for (const index of indexes) {
    const element = elements[index]!;
    const [x, y, z] = element.position;
    if ([x, y, z].some((value) => value === null || !Number.isFinite(value))) return null;
    const deltaX = x! - anchorX;
    const deltaZ = z! - anchorZ;
    next[index] = {
      ...element,
      position: [anchorX + cosine * deltaX + sine * deltaZ, y!, anchorZ - sine * deltaX + cosine * deltaZ],
      angle: normalizeAngle((element.angle ?? 0) + angle),
    };
  }
  return next;
}

/** Rotira položaje i EKUT cijele grupe oko centra njenog zajedničkog X/Z omotača. */
export function corpusRotatedGroupAroundCenterElements(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  angle: number,
): readonly CorpusS3dElement[] | null {
  const indexes = modelingIndexes(elements, selectedIndexes);
  const bounds = indexes ? corpusGroupBounds(elements, indexes) : null;
  if (!indexes || !bounds || !Number.isFinite(angle)) return null;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const radians = angle * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const next = [...elements];
  for (const index of indexes) {
    const element = elements[index]!;
    const [x, y, z] = element.position;
    if ([x, y, z].some((value) => value === null || !Number.isFinite(value))) return null;
    const deltaX = x! - centerX;
    const deltaZ = z! - centerZ;
    next[index] = {
      ...element,
      position: [centerX + cosine * deltaX + sine * deltaZ, y!, centerZ - sine * deltaX + cosine * deltaZ],
      angle: normalizeAngle((element.angle ?? 0) + angle),
    };
  }
  return next;
}

/** Pomjera grupu najmanje moguće tako da njen zajednički omotač ostane unutar prostorije. */
export function corpusContainedGroupElements(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  room: CorpusS3dRoom,
  margin = 0,
): readonly CorpusS3dElement[] | null {
  const indexes = modelingIndexes(elements, selectedIndexes);
  const roomHeight = corpusRoomTotalHeight(room.height, room.lowerHeight);
  if (!indexes || room.length === null || room.width === null || roomHeight === null || !Number.isFinite(room.length) || room.length <= 0 || !Number.isFinite(room.width) || room.width <= 0 || !Number.isFinite(roomHeight) || roomHeight <= 0 || !Number.isFinite(margin) || margin < 0) return null;
  const footprints = indexes.map((index) => corpusElementFootprint(elements[index]!));
  if (footprints.some((footprint) => footprint === null)) return null;
  const measured = footprints.filter((footprint): footprint is NonNullable<typeof footprint> => footprint !== null);
  const bounds = {
    minX: Math.min(...measured.map((item) => item.worldBounds.minX)), maxX: Math.max(...measured.map((item) => item.worldBounds.maxX)),
    minY: Math.min(...measured.map((item) => item.minY)), maxY: Math.max(...measured.map((item) => item.maxY)),
    minZ: Math.min(...measured.map((item) => item.worldBounds.minZ)), maxZ: Math.max(...measured.map((item) => item.worldBounds.maxZ)),
  };
  const roomX = room.length * 1000;
  const roomY = roomHeight * 1000;
  const roomZ = room.width * 1000;
  if (bounds.maxX - bounds.minX + margin * 2 > roomX || bounds.maxY - bounds.minY + margin * 2 > roomY || bounds.maxZ - bounds.minZ + margin * 2 > roomZ) return null;
  return corpusTranslatedElements(elements, indexes, [
    containmentShift(bounds.minX, bounds.maxX, roomX, margin),
    containmentShift(bounds.minY, bounds.maxY, roomY, margin),
    containmentShift(bounds.minZ, bounds.maxZ, roomZ, margin),
  ]);
}

/** Centrira zajednički omotač grupe po izabranoj osi prostorije. */
export function corpusCenteredGroupElements(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  room: CorpusS3dRoom,
  axis: CorpusGroupDistributionAxis,
): readonly CorpusS3dElement[] | null {
  const indexes = modelingIndexes(elements, selectedIndexes);
  const roomHeight = corpusRoomTotalHeight(room.height, room.lowerHeight);
  const boundary = axis === "x" ? room.length === null ? null : room.length * 1000
    : axis === "y" ? roomHeight === null ? null : roomHeight * 1000
      : room.width === null ? null : room.width * 1000;
  if (!indexes || boundary === null || !Number.isFinite(boundary) || boundary <= 0) return null;
  const bounds = indexes.map((index) => {
    const footprint = corpusElementFootprint(elements[index]!);
    return footprint ? footprintAxisBounds(footprint, axis) : null;
  });
  if (bounds.some((item) => item === null)) return null;
  const measured = bounds.filter((item): item is [number, number] => item !== null);
  const minimum = Math.min(...measured.map((item) => item[0]));
  const maximum = Math.max(...measured.map((item) => item[1]));
  if (maximum - minimum > boundary) return null;
  const shift = boundary / 2 - (minimum + maximum) / 2;
  const delta: CorpusPosition = axis === "x" ? [shift, 0, 0] : axis === "y" ? [0, shift, 0] : [0, 0, shift];
  return corpusTranslatedElements(elements, indexes, delta);
}

/** Postavlja zajednički omotač grupe uz izabranu granicu prostorije. */
export function corpusGroupAtRoomSideElements(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  room: CorpusS3dRoom,
  side: CorpusGroupRoomSide,
  margin = 0,
): readonly CorpusS3dElement[] | null {
  const indexes = modelingIndexes(elements, selectedIndexes);
  const roomHeight = corpusRoomTotalHeight(room.height, room.lowerHeight);
  if (!indexes || !Number.isFinite(margin) || margin < 0) return null;
  const axis: CorpusGroupDistributionAxis = side === "left" || side === "right" ? "x" : side === "floor" || side === "ceiling" ? "y" : "z";
  const boundary = axis === "x" ? room.length === null ? null : room.length * 1000
    : axis === "y" ? roomHeight === null ? null : roomHeight * 1000
      : room.width === null ? null : room.width * 1000;
  if (boundary === null || !Number.isFinite(boundary) || boundary <= 0) return null;
  const bounds = indexes.map((index) => {
    const footprint = corpusElementFootprint(elements[index]!);
    return footprint ? footprintAxisBounds(footprint, axis) : null;
  });
  if (bounds.some((item) => item === null)) return null;
  const measured = bounds.filter((item): item is [number, number] => item !== null);
  const minimum = Math.min(...measured.map((item) => item[0]));
  const maximum = Math.max(...measured.map((item) => item[1]));
  if (maximum - minimum + margin * 2 > boundary) return null;
  const useMinimum = side === "left" || side === "floor" || side === "back";
  const shift = useMinimum ? margin - minimum : boundary - margin - maximum;
  const delta: CorpusPosition = axis === "x" ? [shift, 0, 0] : axis === "y" ? [0, shift, 0] : [0, 0, shift];
  return corpusTranslatedElements(elements, indexes, delta);
}

/** Postavlja pivot prvog označenog elementa na mrežu i istim pomakom pomjera cijelu grupu. */
export function corpusSnappedGroupElements(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  step = 10,
): readonly CorpusS3dElement[] | null {
  const indexes = modelingIndexes(elements, selectedIndexes);
  if (!indexes || !Number.isFinite(step) || step <= 0) return null;
  const anchor = elements[indexes[0]!]!;
  if (anchor.position.some((value) => value === null || !Number.isFinite(value))) return null;
  const delta = anchor.position.map((value) => Math.round(value! / step) * step - value!) as [number, number, number];
  return corpusTranslatedElements(elements, indexes, delta);
}

/** Pravi nezavisnu kopiju svakog označenog korijenskog elementa sa zajedničkim pomakom. */
export function corpusGroupCopies(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  offset: CorpusPosition,
): readonly CorpusS3dElement[] | null {
  return corpusGroupArrayCopies(elements, selectedIndexes, 1, offset);
}

/** Pravi linearnu seriju nezavisnih kopija cijele označene grupe. */
export function corpusGroupArrayCopies(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  count: number,
  step: CorpusPosition,
): readonly CorpusS3dElement[] | null {
  const indexes = usableIndexes(elements, selectedIndexes);
  if (!indexes || !Number.isInteger(count) || count < 1 || count > 50 || step.some((value) => !Number.isFinite(value)) || step.every((value) => value === 0)) return null;
  const copies: CorpusS3dElement[] = [];
  for (let repetition = 1; repetition <= count; repetition += 1) {
    for (const index of indexes) {
      const element = elements[index]!;
      if (element.position.some((value) => value === null || !Number.isFinite(value))) return null;
      copies.push({
        ...element,
        position: element.position.map((value, axis) => value! + step[axis]! * repetition) as [number, number, number],
      });
    }
  }
  return copies;
}

/** Pravi pravougaonu mrežu kopija grupe; početna ćelija je postojeća grupa. */
export function corpusGroupGridCopies(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  columns: number,
  rows: number,
  columnStep: CorpusPosition,
  rowStep: CorpusPosition,
): readonly CorpusS3dElement[] | null {
  const indexes = usableIndexes(elements, selectedIndexes);
  const groupCopies = columns * rows - 1;
  if (!indexes || !Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1 || groupCopies < 1 || groupCopies > 50) return null;
  if (columnStep.some((value) => !Number.isFinite(value)) || rowStep.some((value) => !Number.isFinite(value))) return null;
  if (columns > 1 && columnStep.every((value) => value === 0)) return null;
  if (rows > 1 && rowStep.every((value) => value === 0)) return null;
  if (indexes.some((index) => elements[index]!.position.some((value) => value === null || !Number.isFinite(value)))) return null;

  const copies: CorpusS3dElement[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (row === 0 && column === 0) continue;
      for (const index of indexes) {
        const element = elements[index]!;
        copies.push({
          ...element,
          position: element.position.map((value, axis) => value! + columnStep[axis]! * column + rowStep[axis]! * row) as [number, number, number],
        });
      }
    }
  }
  return copies;
}

/** Uklanja tačno označene korijenske elemente uz očuvan redoslijed ostalih. */
export function corpusElementsWithoutGroup(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
): readonly CorpusS3dElement[] | null {
  const indexes = usableIndexes(elements, selectedIndexes);
  if (!indexes) return null;
  const removed = new Set(indexes);
  return elements.filter((_, index) => !removed.has(index));
}

/** Mijenja vidljivost označenih korijena; vraća isti niz kada promjena nije potrebna. */
export function corpusGroupVisibilityElements(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  visible: boolean,
): readonly CorpusS3dElement[] | null {
  const indexes = usableIndexes(elements, selectedIndexes);
  if (!indexes) return null;
  const selected = new Set(indexes);
  let changed = false;
  const next = elements.map((element, index) => {
    if (!selected.has(index) || (element.visible !== false) === visible) return element;
    changed = true;
    return { ...element, visible };
  });
  return changed ? next : elements;
}

/** Prikazuje samo označene korijene i skriva sve ostale. */
export function corpusIsolatedGroupElements(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
): readonly CorpusS3dElement[] | null {
  const indexes = usableIndexes(elements, selectedIndexes);
  if (!indexes) return null;
  const selected = new Set(indexes);
  let changed = false;
  const next = elements.map((element, index) => {
    const visible = selected.has(index);
    if ((element.visible !== false) === visible) return element;
    changed = true;
    return { ...element, visible };
  });
  return changed ? next : elements;
}

/** Vraća sve korijenske elemente u vidljivo stanje. */
export function corpusVisibleRootElements(elements: readonly CorpusS3dElement[]): readonly CorpusS3dElement[] {
  let changed = false;
  const next = elements.map((element) => {
    if (element.visible !== false) return element;
    changed = true;
    return { ...element, visible: true };
  });
  return changed ? next : elements;
}

/** Raspoređuje najmanje tri označena rotirana omotača sa jednakim razmakom između krajnjih. */
export function corpusEvenlyDistributedGroupElements(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  axis: CorpusGroupDistributionAxis,
): readonly CorpusS3dElement[] | null {
  const indexes = modelingIndexes(elements, selectedIndexes);
  if (!indexes || indexes.length < 3) return null;
  const measured = indexes.map((index) => {
    const footprint = corpusElementFootprint(elements[index]!);
    if (!footprint) return null;
    const [minimum, maximum] = footprintAxisBounds(footprint, axis);
    return { index, minimum, maximum, span: maximum - minimum };
  });
  if (measured.some((item) => item === null)) return null;
  const items = measured.filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => left.minimum - right.minimum || left.index - right.index);
  const outerSpan = items.at(-1)!.maximum - items[0]!.minimum;
  const occupied = items.reduce((sum, item) => sum + item.span, 0);
  const gap = (outerSpan - occupied) / (items.length - 1);
  if (!Number.isFinite(gap) || gap < 0) return null;

  const next = [...elements];
  let cursor = items[0]!.maximum + gap;
  for (const item of items.slice(1, -1)) {
    const element = elements[item.index]!;
    const coordinateIndex = axisCoordinateIndex(axis);
    const coordinate = element.position[coordinateIndex];
    if (coordinate === null || !Number.isFinite(coordinate)) return null;
    const position = [...element.position] as [number | null, number | null, number | null];
    position[coordinateIndex] = coordinate + cursor - item.minimum;
    next[item.index] = { ...element, position };
    cursor += item.span + gap;
  }
  return next;
}

/** Slaže označene rotirane omotače prostornim redom sa tačno zadanim razmakom. */
export function corpusSpacedGroupElements(
  elements: readonly CorpusS3dElement[],
  selectedIndexes: readonly number[],
  axis: CorpusGroupDistributionAxis,
  gap: number,
): readonly CorpusS3dElement[] | null {
  const indexes = modelingIndexes(elements, selectedIndexes);
  if (!indexes || !Number.isFinite(gap) || gap < 0) return null;
  const measured = indexes.map((index) => {
    const footprint = corpusElementFootprint(elements[index]!);
    if (!footprint) return null;
    const [minimum, maximum] = footprintAxisBounds(footprint, axis);
    return { index, minimum, maximum, span: maximum - minimum };
  });
  if (measured.some((item) => item === null)) return null;
  const items = measured.filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => left.minimum - right.minimum || left.index - right.index);

  const next = [...elements];
  let cursor = items[0]!.maximum + gap;
  for (const item of items.slice(1)) {
    const element = elements[item.index]!;
    const coordinateIndex = axisCoordinateIndex(axis);
    const coordinate = element.position[coordinateIndex];
    if (coordinate === null || !Number.isFinite(coordinate)) return null;
    const position = [...element.position] as [number | null, number | null, number | null];
    position[coordinateIndex] = coordinate + cursor - item.minimum;
    next[item.index] = { ...element, position };
    cursor += item.span + gap;
  }
  return next;
}

function usableIndexes(elements: readonly CorpusS3dElement[], selectedIndexes: readonly number[]): number[] | null {
  const indexes = [...new Set(selectedIndexes)];
  if (indexes.length < 2 || indexes.some((index) => !Number.isInteger(index) || index < 0 || index >= elements.length)) return null;
  return indexes;
}

function modelingIndexes(elements: readonly CorpusS3dElement[], selectedIndexes: readonly number[]): number[] | null {
  const indexes = usableIndexes(elements, selectedIndexes);
  return indexes && indexes.every((index) => corpusElementAllowsModeling(elements[index]!)) ? indexes : null;
}

function footprintAxisBounds(footprint: NonNullable<ReturnType<typeof corpusElementFootprint>>, axis: CorpusGroupDistributionAxis): [number, number] {
  if (axis === "x") return [footprint.worldBounds.minX, footprint.worldBounds.maxX];
  if (axis === "y") return [footprint.minY, footprint.maxY];
  return [footprint.worldBounds.minZ, footprint.worldBounds.maxZ];
}

function axisCoordinateIndex(axis: CorpusGroupDistributionAxis): 0 | 1 | 2 {
  return axis === "x" ? 0 : axis === "y" ? 1 : 2;
}

function normalizeAngle(angle: number): number {
  const normalized = angle % 360;
  return Object.is(normalized, -0) ? 0 : normalized;
}

function containmentShift(minimum: number, maximum: number, boundary: number, margin: number): number {
  if (minimum < margin) return margin - minimum;
  if (maximum > boundary - margin) return boundary - margin - maximum;
  return 0;
}
