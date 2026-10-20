import type { CorpusS3dElement } from "./corpus-s3d.ts";

export type CorpusCopyOffset = readonly [number, number, number];

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
