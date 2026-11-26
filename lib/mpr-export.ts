import { expandCorpusCurve } from "./corpus-geometry.ts";
import { corpusBoardCutouts } from "./corpus-cutouts.ts";
import { corpusAscii } from "./corpus-board-export.ts";
import type { CorpusS3dBoard } from "./corpus-s3d.ts";

/**
 * MPR (WoodWOP) program radne ploče sa konturnim glodanjem usjecanja, po uzorku Corpusovog izvoza (CRLF, `<105 \Konturfraesen\`).
 * U programu je X = dužina ploče − PTX iz S3D-a, Y = PTZ; redoslijed tačaka je p0, pa unazad (zrcaljenje obrće smjer).
 */
export type MprOptions = { partName: string; materialName: string; tool?: string };

const fixed = (value: number) => (Math.round(value * 100) / 100).toFixed(2);

export function corpusBoardCutoutMpr(board: Pick<CorpusS3dBoard, "curveData" | "height" | "width" | "thickness">, options: MprOptions): string {
  if (!board.height || !board.width || !board.thickness) throw new Error("Ploča nema potpune mjere za MPR.");
  const cutouts = corpusBoardCutouts(board);
  if (!cutouts.length) throw new Error("Ploča nema usjecanja za MPR.");
  const length = board.height;
  const lines: string[] = [
    "[H", "", 'VERSION="4.0 Alpha"', 'HP="1"', 'IN="0"', 'GX="0"', 'GY="0"', 'GXY="0"', 'UP="0"', 'FM="1"', 'FW="500"', 'HS="0"', 'OP="2"',
    "[001", `l="${Math.round(length)}"`, 'KM="Sirina"', `b="${Math.round(board.width)}"`, 'KM="duzina"', `d="${Math.round(board.thickness)}"`, 'KM="Debljina"',
    "<100", 'LA="l"', 'BR="b"', 'DI="d"', 'FNX="0"', 'FNY="0"', 'AX="0"', 'AY="0"', "",
    "<101 \\Comment\\", `KM="PartName: ${corpusAscii(options.partName)}"`, `KM="Material: ${corpusAscii(options.materialName)}"`, "",
  ];
  cutouts.forEach((cutout, index) => {
    const expanded = expandCorpusCurve(cutout.points);
    const ordered = [expanded[0]!, ...expanded.slice(1).reverse()];
    const path = [...ordered, ordered[0]!];
    lines.push(`]${index + 1}`);
    path.forEach((point, pointIndex) => lines.push(`$E${pointIndex}`, pointIndex === 0 ? "KP" : "KL", `X=${fixed(length - point.x)}`, `Y=${fixed(point.z)}`, "Z=0.00", ""));
    lines.push("<105 \\Konturfraesen\\", 'ZA="0.0"', 'EA="1:0"', 'EE="1:4"', 'RK="WRKL"', `TNO="${options.tool ?? "T6"}"`, 'RI="1"', 'KO="00"', "");
  });
  lines.push("!", "");
  return lines.join("\r\n");
}
