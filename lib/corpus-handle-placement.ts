/**
 * Položaj ručkice na fronti prema Corpusovim formulama (varijable fronte `SR`, `TFR`, `rxo`, `ryo`, `RUCKICAX`, `RUCKICAY`,
 * `KUTRUC`, izvučene iz biblioteke, npr. `_OKOV/Gola_sistem/UGAONIK_GOLA.e3d`, 59 elemenata):
 *
 *   SR  = ruc_sm: 1 vodoravna, 2 okomita ručkica        TFR = tip fronte (1 = šarke lijevo, ručkica uz desnu ivicu)
 *   rxo = ruc_xo (pomak od bočne ivice), ryo = ruc_yo (pomak od gornje ivice); kod nasadne ručkice (`ruckica.nasadna = 1`) 0
 *   RUCKICAX  = if(SR=1; if((TFR=1); s − rxo − r.s; rxo); if((TFR=1); s − rxo − r.v; rxo))
 *   RUCKICAY  = if(SR=1; v − ryo − r.v; v − ryo)        KUTRUC = if(SR=1; 0; 270)
 *   nasadna:  X = 0, Y = v − r.v, kut 0
 *
 * Koordinate: X duž širine fronte (s) od lijeve ivice, Y duž visine (v) od donje ivice, kut u stepenima oko ose kroz debljinu.
 * `r.s` i `r.v` su širina i visina ručkice u njenom prirodnom položaju (prije zakretanja).
 */
export type HandleDirection = "horizontal" | "vertical";

export type HandlePlacementInput = {
  /** Širina (s) i visina (v) fronte. */
  front: { width: number; height: number };
  /** Širina (r.s, duža strana) i visina (r.v) ručkice; `depth` je izbočenje od fronte. */
  handle: { width: number; height: number; depth?: number };
  /** Tip fronte (TIPFRONTE): 1 = šarke lijevo (ručkica uz desnu ivicu), ostalo = ručkica uz lijevu ivicu. */
  frontType: number | null;
  direction: HandleDirection;
  offsetX: number;
  offsetY: number;
  surfaceMounted?: boolean;
};

export type HandlePlacement = { x: number; y: number; angle: 0 | 270 };

export function corpusHandlePlacement(input: HandlePlacementInput): HandlePlacement {
  const { front, handle, direction } = input;
  const numbers = [front.width, front.height, handle.width, handle.height, input.offsetX, input.offsetY];
  if (numbers.some((value) => !Number.isFinite(value)) || front.width <= 0 || front.height <= 0 || handle.width <= 0 || handle.height <= 0) throw new Error("Mjere fronte i ručkice moraju biti veće od nule.");
  if (input.offsetX < 0 || input.offsetY < 0) throw new Error("Pomaci ručkice ne mogu biti negativni.");
  if (input.surfaceMounted) return { x: 0, y: front.height - handle.height, angle: 0 };
  const horizontal = direction === "horizontal";
  const alongX = horizontal ? handle.width : handle.height;
  const x = input.frontType === 1 ? front.width - input.offsetX - alongX : input.offsetX;
  const y = horizontal ? front.height - input.offsetY - handle.height : front.height - input.offsetY;
  return { x, y, angle: horizontal ? 0 : 270 };
}

/** Vrijednosti varijable `ruc_sm` u Corpusu: 1 = horizontalna, 2 = okomita. */
export const handleDirectionFromVariable = (value: string): HandleDirection => (value.trim() === "2" ? "vertical" : "horizontal");
