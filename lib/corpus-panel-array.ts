import type { CorpusS3dBoard } from "./corpus-s3d.ts";
import type { CorpusNewBoardSpec } from "./corpus-s3d-writer.ts";

export type CorpusPanelArraySpec = {
  kind: "shelves" | "dividers";
  count: number;
  thickness: number;
  frontInset: number;
  opening: { x: number; y: number; z: number; width: number; height: number; depth: number };
  /** Lower edge positions measured from the opening's origin, in millimetres. */
  offsets?: readonly number[];
};

/** Equal clear gaps include the thickness of each inserted panel. No existing panel is moved. */
export function corpusPanelArray(spec: CorpusPanelArraySpec, template?: CorpusS3dBoard): CorpusNewBoardSpec[] {
  const { opening, count, thickness, frontInset, kind } = spec;
  if (kind !== "shelves" && kind !== "dividers") throw new Error("Nepoznata vrsta rasporeda ploča.");
  if (!Number.isInteger(count) || count < 1 || count > 50) throw new Error("Broj ploča mora biti od 1 do 50.");
  if (Object.values(opening).some(value => !Number.isFinite(value)) || !Number.isFinite(thickness) || !Number.isFinite(frontInset)) throw new Error("Mjere i koordinate moraju biti konačni brojevi.");
  if (opening.width <= 0 || opening.height <= 0 || opening.depth <= 0 || thickness <= 0) throw new Error("Otvor i debljina moraju imati pozitivne mjere.");
  if (frontInset < 0 || frontInset >= opening.depth) throw new Error("Uvlačenje mora biti manje od dubine otvora i ne može biti negativno.");
  const span = kind === "shelves" ? opening.height : opening.width;
  const free = span - count * thickness;
  if (free <= 0) throw new Error("Ploče ne staju u zadani otvor.");
  const gap = free / (count + 1);
  const offsets = spec.offsets ?? Array.from({ length: count }, (_, index) => gap * (index + 1) + thickness * index);
  if (offsets.length !== count || offsets.some(value => !Number.isFinite(value) || value < 0 || value + thickness > span + 1e-6)) throw new Error("Svaka pozicija mora biti unutar otvora.");
  const sorted = [...offsets].sort((a, b) => a - b);
  if (sorted.some((value, index) => index > 0 && value < sorted[index - 1]! + thickness - 1e-6)) throw new Error("Pozicije ploča se preklapaju.");
  const round = (value: number) => Number(value.toFixed(3));
  return offsets.map((offset, index) => ({
    name: `${kind === "shelves" ? "Polica" : "Pregrada"} ${index + 1}`,
    position: [round(opening.x + (kind === "dividers" ? offset : 0)), round(opening.y + (kind === "shelves" ? offset : 0)), round(opening.z - frontInset)],
    height: kind === "shelves" ? opening.width : opening.height,
    width: round(opening.depth - frontInset), thickness,
    direction: kind === "shelves" ? 2 : 0,
    materialName: template?.materialName ?? "", materialUid: template?.materialUid ?? "",
    color: template?.color ?? 0xd8d1c1, transparent: template?.transparent ?? false, visible: true,
  }));
}
