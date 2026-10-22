import { corpusBoardDimensions } from "./corpus-geometry.ts";
import type { CorpusS3dElement } from "./corpus-s3d.ts";

/**
 * Normalizuje direktne pravougaone ploče u lokalni raspon 0..širina,
 * 0..visina i 0..dubina te pomjera Corpus pivot tako da svjetski položaj
 * svake ploče ostane isti. Ne nagađa rotirane/nepotpune ploče ni djecu.
 */
export function fitCorpusElementToBoards(element: CorpusS3dElement): CorpusS3dElement | null {
  if (!element.boards.length || element.children.length) return null;
  if ([...element.position, element.angle].some((value) => value === null || !Number.isFinite(value))) return null;
  if ([element.xAngle, element.zAngle].some((value) => value !== null && Math.abs(value) > 0.000001)) return null;

  const measured = element.boards.map((board) => {
    if (board.direction === null || ![0, 1, 2].includes(board.direction)) return null;
    if ([...board.position, board.height, board.width, board.thickness].some((value) => value === null || !Number.isFinite(value))) return null;
    if ([board.angle, board.xAngle, board.zAngle].some((value) => value !== null && Math.abs(value) > 0.000001)) return null;
    const [sizeX, sizeY, sizeZ] = corpusBoardDimensions(board.direction, board.height!, board.width!, board.thickness!);
    if ([sizeX, sizeY, sizeZ].some((value) => value <= 0)) return null;
    const [x, y, z] = board.position as readonly [number, number, number];
    return { minX: x, maxX: x + sizeX, minY: y, maxY: y + sizeY, minZ: z, maxZ: z + sizeZ };
  });
  if (measured.some((value) => value === null)) return null;
  const bounds = measured as Array<NonNullable<(typeof measured)[number]>>;
  const minX = Math.min(...bounds.map(({ minX: value }) => value));
  const maxX = Math.max(...bounds.map(({ maxX: value }) => value));
  const minY = Math.min(...bounds.map(({ minY: value }) => value));
  const maxY = Math.max(...bounds.map(({ maxY: value }) => value));
  const minZ = Math.min(...bounds.map(({ minZ: value }) => value));
  const maxZ = Math.max(...bounds.map(({ maxZ: value }) => value));
  const shiftX = -minX;
  const shiftY = -minY;
  const shiftZ = -minZ;
  const radians = element.angle! * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const [x, y, z] = element.position as readonly [number, number, number];
  return {
    ...element,
    position: [round(x - cosine * shiftX + sine * shiftZ), round(y - shiftY), round(z + sine * shiftX + cosine * shiftZ)],
    width: round(maxX - minX),
    height: round(maxY - minY),
    depth: round(maxZ - minZ),
    boards: element.boards.map((board) => ({
      ...board,
      position: [round(board.position[0]! + shiftX), round(board.position[1]! + shiftY), round(board.position[2]! + shiftZ)],
    })),
  };
}

function round(value: number): number {
  return Number(value.toFixed(3));
}
