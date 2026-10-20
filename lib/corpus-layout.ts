import { corpusRoomTotalHeight } from "./corpus-geometry.ts";
import type { CorpusS3dElement, CorpusS3dRoom } from "./corpus-s3d.ts";
import { corpusElementFootprint, corpusFootprintsOverlap, type CorpusElementFootprint } from "./corpus-footprint.ts";

export type CorpusLayoutIssue = {
  type: "outside-room" | "overlap";
  message: string;
  elementIndexes: readonly number[];
};

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
