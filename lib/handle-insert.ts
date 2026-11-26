import { corpusHandlePlacement, type HandleDirection } from "./corpus-handle-placement.ts";
import type { CorpusS3dBoard, CorpusS3dElement } from "./corpus-s3d.ts";
import type { KitchenInsert } from "./kitchen-inserts.ts";

/**
 * Umetanje ručkice na frontu. Položaj je izračunat po Corpusovim formulama (`corpusHandlePlacement`), a ručkica se umeće kao
 * zaseban element u obliku kvadra mjera ručke, koji leži na vanjskoj strani fronte.
 *
 * Okvir elementa: lokalno X duž širine, Y naviše, Z po dubini (pozitivno prema unutrašnjosti); svjetske koordinate za ugao θ:
 * pozicija + X·(cos θ, −sin θ) + Z·(−sin θ, −cos θ). Fronta (SMJER 1) zauzima Z od položaja do položaja + debljina, dakle
 * njena vanjska strana je na Z = položaj; ručka izlazi iz nje u negativnom Z smjeru.
 */
export type HandleModel = { name: string; width: number; height: number; depth: number };

/** Fronta unutar elementa (i njegovih pod-elemenata): ploča i zbir pomaka pod-elemenata od korijenskog elementa. */
export type HandleFront = { label: string; board: CorpusS3dBoard; offset: readonly [number, number, number] };

const FRONT_TYPES = new Set([1, 2, 3, 4, 6]);

/** Uspravne fronte (vrata, ladice) elementa i pod-elemenata bez zakretanja; pomaci pod-elemenata se zbrajaju. */
export function findHandleFronts(element: CorpusS3dElement): HandleFront[] {
  const out: HandleFront[] = [];
  const visit = (item: CorpusS3dElement, offset: readonly [number, number, number], label: string) => {
    for (const board of item.boards) if (FRONT_TYPES.has(board.frontType ?? -1) && board.direction === 1) out.push({ label: `${label}${board.name || "Fronta"}`, board, offset });
    for (const child of item.children) {
      const turned = (((child.angle ?? 0) % 360) + 360) % 360 > 0.5 && (((child.angle ?? 0) % 360) + 360) % 360 < 359.5;
      if (turned || child.position.some((value) => value === null)) continue;
      visit(child, [offset[0] + child.position[0]!, offset[1] + child.position[1]!, offset[2] + child.position[2]!], `${label}${child.name} / `);
    }
  };
  visit(element, [0, 0, 0], "");
  return out;
}

export type HandleInsertOptions = {
  /** Korijenski element: daje svjetski položaj i ugao. */
  element: CorpusS3dElement;
  front: HandleFront;
  handle: HandleModel;
  direction: HandleDirection;
  offsetX: number;
  offsetY: number;
  surfaceMounted?: boolean;
  materialName?: string;
  materialUid?: string;
  color?: number;
};

const rightAngle = (angle: number | null): number | null => {
  const normalized = (((angle ?? 0) % 360) + 360) % 360;
  const rounded = Math.round(normalized / 90) * 90;
  return Math.abs(normalized - rounded) < 0.5 ? rounded % 360 : null;
};
const round3 = (value: number) => Math.round(value * 1000) / 1000;

export function handleInsert(options: HandleInsertOptions): KitchenInsert {
  const { element, handle } = options;
  const front = options.front.board;
  if (front.height === null || front.width === null || front.thickness === null || front.position.some((value) => value === null)) throw new Error("Fronta nema potpune mjere.");
  if (front.direction !== 1) throw new Error("Ručkica se postavlja na frontu koja stoji uspravno (SMJER 1).");
  const angle = rightAngle(element.angle);
  if (angle === null) throw new Error("Element mora biti zakrenut za 0°, 90°, 180° ili 270°.");
  if (element.position.some((value) => value === null)) throw new Error("Element nema položaj.");
  if (![handle.width, handle.height, handle.depth].every((value) => Number.isFinite(value) && value > 0)) throw new Error("Ručkica nema ispravne mjere.");
  const placement = corpusHandlePlacement({
    front: { width: front.width, height: front.height },
    handle,
    frontType: front.frontType,
    direction: options.direction,
    offsetX: options.offsetX,
    offsetY: options.offsetY,
    surfaceMounted: options.surfaceMounted,
  });
  const vertical = placement.angle === 270;
  // Kvadar: vodoravna ručka je široka r.s i visoka r.v; okomita je široka r.v i visoka r.s, a spušta se od Y naniže.
  const width = vertical ? handle.height : handle.width;
  const height = vertical ? handle.width : handle.height;
  const [fx, fy, fz] = (front.position as [number, number, number]).map((value, axis) => value + options.front.offset[axis]!) as [number, number, number];
  const localX = fx + placement.x;
  const localY = fy + (vertical ? placement.y - handle.width : placement.y);
  const localZ = fz - handle.depth;
  const sin = Math.round(Math.sin((angle * Math.PI) / 180) * 1e9) / 1e9, cos = Math.round(Math.cos((angle * Math.PI) / 180) * 1e9) / 1e9;
  const [ex, ey, ez] = element.position as [number, number, number];
  return {
    spec: {
      name: `Rucka_${handle.name}`.replace(/[^\p{L}\p{N}_.-]+/gu, "_"), code: "", className: "TElement",
      width, height, depth: handle.depth, starterDirection: 1, starterBoardName: "Rucka", thickness: handle.depth,
      materialName: options.materialName ?? "Metal", materialUid: options.materialUid ?? "", color: options.color ?? 0xb0b0b0,
    },
    position: [round3(ex + localX * cos + localZ * -sin), round3(ey + localY), round3(ez + localX * -sin + localZ * -cos)],
    angle,
  };
}
