import { expandCorpusCurve } from "./corpus-geometry.ts";
import { corpusBoardCutouts } from "./corpus-cutouts.ts";
import { corpusAscii } from "./corpus-board-export.ts";
import { evaluateCorpusFormula } from "./corpus-geometry.ts";
import type { CorpusS3dBoard } from "./corpus-s3d.ts";

/**
 * MPR (WoodWOP) program radne ploče sa konturnim glodanjem usjecanja, po uzorku Corpusovog izvoza (CRLF, `<105 \Konturfraesen\`).
 * U programu je X = dužina ploče − PTX iz S3D-a, Y = PTZ; redoslijed tačaka je p0, pa unazad (zrcaljenje obrće smjer).
 */
export type MprOptions = { partName: string; materialName: string; tool?: string; /** Vertikalna bušenja (npr. šarke iz makroa) u koordinatama programa. */ bores?: readonly { x: number; y: number; diameter: number; depth: number }[] };

const fixed = (value: number) => (Math.round(value * 100) / 100).toFixed(2);

/** Broj kao u Corpusovom programu: do dvije decimale, bez suvišnih nula ("920", "18.5"). */
const compact = (value: number) => String(Math.round(value * 100) / 100).replace(/^-0$/, "0");

/**
 * Utori (glodani džepovi): rupe s RAS MODE=4 u S3D-u postaju `<112 \Tasche\` (uzorak MILUNOVIC STAN 2: Ledja 1850 × 330, dva
 * utora; XA/YA su izračunati izrazi x/y, WI = −ANG, LA = SIR, BR = VIS, XY = XYOV, TI = dubina, F_ = FEED, alat 100 → T6).
 */
export function corpusBoardGroovesMpr(board: Pick<CorpusS3dBoard, "holes" | "height" | "width">, tool = "T6"): string[] {
  const variables = { VISINA: board.height ?? 0, DUBINA: board.width ?? 0, SIRINA: board.width ?? 0 };
  const lines: string[] = [];
  for (const hole of board.holes) {
    if (hole.machiningMode !== 4) continue;
    const x = evaluateCorpusFormula(hole.xExpression, variables), y = evaluateCorpusFormula(hole.yExpression, variables);
    const number = (key: string) => { const value = Number(hole.machining[key]); return Number.isFinite(value) ? value : null; };
    const length = number("VIS"), width = number("SIR");
    if (x === null || y === null || length === null || width === null || hole.depth === null) throw new Error(`Utor "${hole.name}" nema potpune mjere za MPR.`);
    lines.push("<112 \\Tasche\\", `T_="${tool}"`, `XA="${compact(x)}"`, `YA="${compact(y)}"`, `WI="${compact(-(number("ANG") ?? 0))}"`, `LA="${compact(width)}"`, `BR="${compact(length)}"`, 'KO="00"', `XY="${compact(number("XYOV") ?? 0)}"`, `RD="${compact(number("CRAD") ?? 0)}"`, `TI="${compact(hole.depth)}"`, `F_="${compact(number("FEED") ?? 0)}"`);
  }
  return lines;
}

export function corpusBoardCutoutMpr(board: Pick<CorpusS3dBoard, "curveData" | "height" | "width" | "thickness"> & Partial<Pick<CorpusS3dBoard, "holes">>, options: MprOptions): string {
  if (!board.height || !board.width || !board.thickness) throw new Error("Ploča nema potpune mjere za MPR.");
  const cutouts = corpusBoardCutouts(board);
  const grooves = corpusBoardGroovesMpr({ holes: board.holes ?? [], height: board.height, width: board.width }, options.tool);
  const bores = options.bores ?? [];
  if (!cutouts.length && !grooves.length && !bores.length) throw new Error("Ploča nema usjecanja, utora ni bušenja za MPR.");
  // U programu je l uvijek veća, b manja mjera (947 ploča iz stvarnih projekata, bez obzira na smjer). Kad je VISINA manja od
  // DUBINE ose su zamijenjene: X = Z, Y = X iz S3D-a (uzorak Ledja 330 × 1850); inače X = VISINA − X, Y = Z (uzorak MARK NISIC).
  const swapped = board.height < board.width;
  const length = Math.max(board.height, board.width), across = Math.min(board.height, board.width);
  const lines: string[] = [
    "[H", "", 'VERSION="4.0 Alpha"', 'HP="1"', 'IN="0"', 'GX="0"', 'GY="0"', 'GXY="0"', 'UP="0"', 'FM="1"', 'FW="500"', 'HS="0"', 'OP="2"',
    "[001", `l="${Math.round(length)}"`, 'KM="Sirina"', `b="${Math.round(across)}"`, 'KM="duzina"', `d="${Math.round(board.thickness)}"`, 'KM="Debljina"',
    "<100", 'LA="l"', 'BR="b"', 'DI="d"', 'FNX="0"', 'FNY="0"', 'AX="0"', 'AY="0"', "",
    "<101 \\Comment\\", `KM="PartName: ${corpusAscii(options.partName)}"`, `KM="Material: ${corpusAscii(options.materialName)}"`, "",
  ];
  cutouts.forEach((cutout, index) => {
    const expanded = expandCorpusCurve(cutout.points);
    const ordered = [expanded[0]!, ...expanded.slice(1).reverse()];
    const path = [...ordered, ordered[0]!];
    lines.push(`]${index + 1}`);
    path.forEach((point, pointIndex) => lines.push(`$E${pointIndex}`, pointIndex === 0 ? "KP" : "KL", `X=${fixed(swapped ? point.z : length - point.x)}`, `Y=${fixed(swapped ? point.x : point.z)}`, "Z=0.00", ""));
    lines.push("<105 \\Konturfraesen\\", 'ZA="0.0"', 'EA="1:0"', 'EE="1:4"', 'RK="WRKL"', `TNO="${options.tool ?? "T6"}"`, 'RI="1"', 'KO="00"', "");
  });
  // Vertikalna bušenja (<102): prvo čašice pa male rupe, redom kojim ih makro piše; blok kao u Corpusovom programu.
  for (const bore of bores) lines.push("<102 \\Veritkalno\\", `XA="${compact(bore.x)}"`, `YA="${compact(bore.y)}"`, `TI="${compact(bore.depth)}"`, `DU="${compact(bore.diameter)}"`, 'AN="1"', 'MI="0"', 'AB="32"', 'WI="0"', 'BM="LS"', 'HP="0"', 'SP="0"', 'MX="0"', 'MY="0"', 'MZ="0"', 'KO="00"');
  lines.push(...grooves, "!", "");
  return lines.join("\r\n");
}
