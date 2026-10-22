import type { CorpusS3dElement } from "./corpus-s3d.ts";

export type CorpusCopyOffset = readonly [number, number, number];

/** Vraća pomake pravougaone mreže bez postojeće početne ćelije. */
export function corpusGridCopyOffsets(
  columns: number,
  rows: number,
  columnStep: CorpusCopyOffset,
  rowStep: CorpusCopyOffset,
  maxCopies = 50,
): CorpusCopyOffset[] {
  const copyCount = columns * rows - 1;
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1 || copyCount < 1 || copyCount > maxCopies) {
    throw new Error(`Mreža mora imati od 1 do ${maxCopies} novih kopija.`);
  }
  if (columnStep.some((value) => !Number.isFinite(value)) || rowStep.some((value) => !Number.isFinite(value))) {
    throw new Error("Svi koraci mreže moraju biti konačni brojevi.");
  }
  if (columns > 1 && columnStep.every((value) => value === 0)) throw new Error("Korak kolone mora biti različit od nule.");
  if (rows > 1 && rowStep.every((value) => value === 0)) throw new Error("Korak reda mora biti različit od nule.");

  const offsets: CorpusCopyOffset[] = [];
  const occupied = new Set(["0|0|0"]);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (row === 0 && column === 0) continue;
      const offset = columnStep.map((value, axis) => Number((value * column + rowStep[axis]! * row).toFixed(6))) as [number, number, number];
      const key = offset.join("|");
      if (occupied.has(key)) throw new Error("Koraci mreže postavljaju dvije ćelije na isto mjesto.");
      occupied.add(key);
      offsets.push(offset);
    }
  }
  return offsets;
}

export function corpusLinearCopies(element: CorpusS3dElement, count: number, offset: CorpusCopyOffset): CorpusS3dElement[] {
  if (!Number.isInteger(count) || count < 1 || count > 50) throw new Error("Broj kopija mora biti cijeli broj od 1 do 50.");
  if (offset.some((value) => !Number.isFinite(value))) throw new Error("Svi razmaci kopija moraju biti konačni brojevi.");
  if (offset.every((value) => value === 0)) throw new Error("Najmanje jedan razmak kopija mora biti različit od nule.");
  if (element.position.some((value) => value === null || !Number.isFinite(value))) throw new Error("Element mora imati potpune X/Y/Z koordinate.");
  const origin = element.position as readonly [number, number, number];
  return Array.from({ length: count }, (_, index) => {
    const multiplier = index + 1;
    const copy = structuredClone(element);
    copy.position = [
      origin[0] + offset[0] * multiplier,
      origin[1] + offset[1] * multiplier,
      origin[2] + offset[2] * multiplier,
    ];
    return copy;
  });
}
