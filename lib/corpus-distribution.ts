import { corpusElementFootprint } from "./corpus-footprint.ts";
import type { CorpusS3dElement, CorpusS3dRoom } from "./corpus-s3d.ts";

export type CorpusDistributionAxis = "x" | "z";

/** Raspoređuje korijenske elemente redom od zida, bez mijenjanja njihove druge dvije ose. */
export function corpusDistributedElements(
  elements: readonly CorpusS3dElement[],
  room: CorpusS3dRoom,
  axis: CorpusDistributionAxis,
  gap = 0,
  margin = 0,
): readonly CorpusS3dElement[] | null {
  if (elements.length < 2 || !Number.isFinite(gap) || gap < 0 || !Number.isFinite(margin) || margin < 0) return null;
  const boundary = (axis === "x" ? room.length : room.width);
  if (boundary === null || !Number.isFinite(boundary) || boundary <= 0) return null;

  const measured = elements.map((element, index) => {
    const footprint = corpusElementFootprint(element);
    if (!footprint) return null;
    const minimum = axis === "x" ? footprint.worldBounds.minX : footprint.worldBounds.minZ;
    const maximum = axis === "x" ? footprint.worldBounds.maxX : footprint.worldBounds.maxZ;
    return { element, index, minimum, maximum, span: maximum - minimum };
  });
  if (measured.some((item) => item === null)) return null;

  const items = measured.filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => left.minimum - right.minimum || left.index - right.index);
  const required = margin * 2 + items.reduce((sum, item) => sum + item.span, 0) + gap * (items.length - 1);
  if (required > boundary * 1000) return null;

  const next = [...elements];
  let cursor = margin;
  for (const item of items) {
    const shift = cursor - item.minimum;
    const position = [...item.element.position] as [number | null, number | null, number | null];
    const coordinateIndex = axis === "x" ? 0 : 2;
    const coordinate = position[coordinateIndex];
    if (coordinate === null) return null;
    position[coordinateIndex] = coordinate + shift;
    next[item.index] = { ...item.element, position };
    cursor += item.span + gap;
  }
  return next;
}
