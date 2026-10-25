import type { CorpusS3dBoard, CorpusS3dElement } from "./corpus-s3d.ts";
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

/** Conservative estimate for orthogonal cabinets; the editor keeps all opening fields editable. */
export function estimateCorpusPanelOpening(element: CorpusS3dElement, thickness: number): CorpusPanelArraySpec['opening'] {
  const straight = (board: CorpusS3dBoard) => !board.angle && !board.xAngle && !board.zAngle;
  const sides = element.boards.filter(board => straight(board) && board.direction === 0 && board.position[0] !== null && board.thickness !== null).sort((a, b) => a.position[0]! - b.position[0]!);
  const horizontals = element.boards.filter(board => straight(board) && board.direction === 2 && board.position[1] !== null && board.thickness !== null).sort((a, b) => a.position[1]! - b.position[1]!);
  const x = sides.length >= 2 ? sides[0]!.position[0]! + sides[0]!.thickness! : thickness;
  const right = sides.length >= 2 ? sides.at(-1)!.position[0]! : (element.width ?? 600) - thickness;
  const y = horizontals.length >= 2 ? horizontals[0]!.position[1]! + horizontals[0]!.thickness! : thickness;
  const top = horizontals.length >= 2 ? horizontals.at(-1)!.position[1]! : (element.height ?? 720) - thickness;
  const depth = element.depth ?? 320;
  const rearPlanes = element.boards.filter(board => straight(board) && board.direction === 1 && board.position[2] !== null && -board.position[2] > depth / 2).map(board => -board.position[2]!);
  return { x, y, z: 0, width: Math.max(1, right - x), height: Math.max(1, top - y), depth: Math.min(depth, ...rearPlanes) };
}
