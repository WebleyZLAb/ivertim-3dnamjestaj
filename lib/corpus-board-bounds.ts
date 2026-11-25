import { corpusBoardDimensions } from "./corpus-geometry.ts";
import { corpusBoardRenderTransform } from "./corpus-render-transform.ts";
import type { CorpusS3dElement } from "./corpus-s3d.ts";

export type CorpusWorldBounds = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };

type Vector = readonly [number, number, number];
type Placement = (point: Vector) => Vector;

const DEGREES = Math.PI / 180;

/** Three.js Euler XYZ: prvo Rz, zatim Ry i na kraju Rx (isto kao u 3D prikazu). */
function rotate(point: Vector, [rx, ry, rz]: Vector): Vector {
  let [x, y, z] = point;
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  return [x, y, z];
}

/**
 * Stvarni svjetski omotač vidljivih dasaka elementa, računat istim transformacijama kao 3D prikaz
 * (grupa elementa je u (x, y, -z), a daske su u njoj). Nominalna kutija elementa (širina × dubina od
 * EZPOS) ne odgovara uvijek stvarnom položaju: daska ili pod-element mogu biti zarotirani.
 * Vraća null kada element nema nijednu vidljivu dasku s potpunim mjerama.
 */
export function corpusElementBoardBounds(element: CorpusS3dElement): CorpusWorldBounds | null {
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  let found = false;

  const visit = (current: CorpusS3dElement, parent: Placement) => {
    if (current.visible === false) return;
    const [x, y, z] = current.position;
    if (x === null || y === null || z === null) return;
    const rotation: Vector = [-(current.xAngle ?? 0) * DEGREES, -(current.angle ?? 0) * DEGREES, (current.zAngle ?? 0) * DEGREES];
    const place: Placement = (point) => {
      const turned = rotate(point, rotation);
      return parent([turned[0] + x, turned[1] + y, turned[2] - z]);
    };

    for (const board of current.boards) {
      if (board.visible === false) continue;
      const [bx, by, bz] = board.position;
      const { height, width, thickness } = board;
      if ([bx, by, bz, height, width, thickness].some((value) => value === null || !Number.isFinite(value))) continue;
      if (height! <= 0 || width! <= 0 || thickness! <= 0) continue;
      const [sizeX, sizeY, sizeZ] = corpusBoardDimensions(board.direction, height!, width!, thickness!);
      const boardRotation: Vector = [-(board.xAngle ?? 0) * DEGREES, -(board.angle ?? 0) * DEGREES, (board.zAngle ?? 0) * DEGREES];
      const centre = corpusBoardRenderTransform([bx!, by!, bz!], [sizeX, sizeY, board.direction === 1 ? -sizeZ : sizeZ], [board.xAngle ?? 0, board.angle ?? 0, board.zAngle ?? 0]).position;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        const offset = rotate([sx * sizeX / 2, sy * sizeY / 2, sz * sizeZ / 2], boardRotation);
        const [wx, wy, wz] = place([centre[0] + offset[0], centre[1] + offset[1], centre[2] + offset[2]]);
        // Prikaz je u Three.js prostoru (z je obrnut); Corpus z = -z.
        const cz = -wz;
        bounds.minX = Math.min(bounds.minX, wx); bounds.maxX = Math.max(bounds.maxX, wx);
        bounds.minY = Math.min(bounds.minY, wy); bounds.maxY = Math.max(bounds.maxY, wy);
        bounds.minZ = Math.min(bounds.minZ, cz); bounds.maxZ = Math.max(bounds.maxZ, cz);
        found = true;
      }
    }
    for (const child of current.children) visit(child, place);
  };

  visit(element, (point) => point);
  return found ? bounds : null;
}
