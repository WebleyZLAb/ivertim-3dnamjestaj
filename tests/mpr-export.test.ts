import assert from "node:assert/strict";
import test from "node:test";
import { corpusBoardCutouts, curveOffset } from "../lib/corpus-cutouts.ts";
import { corpusBoardCutoutMpr } from "../lib/mpr-export.ts";

const q = (value: string) => `"${value}"`;
const points = (list: [number, number][]) => list.flatMap(([x, z], i) => [q(`PTOCKA=${i}`), q("PTSTYLE=0"), q(`PTX=${x}`), q(`PTZ=${z}`)]).join(",");
const outline = [q("CURVE=-1"), q("CNNAME=Outline"), q("CNOPEN=0"), points([[0, 0], [1.92, 0], [1.92, 0.6], [0, 0.6]])].join(",");

test("MPR kao Corpusov program: uzorak MARK NISIC (ploča 1920 × 600, usjecanje 530 × 430) bajt po bajt", () => {
  const cutout = [q("CURVE=0"), q("CNNAME=Line"), q("CNOPEN=0"), points([[0.635, 0.085], [1.165, 0.085], [1.165, 0.515], [0.635, 0.515]]), q("MILLDATA=0A")].join(",");
  const mpr = corpusBoardCutoutMpr({ curveData: `${outline},${cutout}`, height: 1920, width: 600, thickness: 38 }, { partName: "Radna_Ploha1", materialName: "ISOZO5107MAT" });
  const expected = ['[H', '', 'VERSION="4.0 Alpha"', 'HP="1"', 'IN="0"', 'GX="0"', 'GY="0"', 'GXY="0"', 'UP="0"', 'FM="1"', 'FW="500"', 'HS="0"', 'OP="2"', '[001', 'l="1920"', 'KM="Sirina"', 'b="600"', 'KM="duzina"', 'd="38"', 'KM="Debljina"', '<100', 'LA="l"', 'BR="b"', 'DI="d"', 'FNX="0"', 'FNY="0"', 'AX="0"', 'AY="0"', '', '<101 \\Comment\\', 'KM="PartName: Radna_Ploha1"', 'KM="Material: ISOZO5107MAT"', '', ']1',
    ...[[1285, 85], [1285, 515], [755, 515], [755, 85], [1285, 85]].flatMap(([x, y], i) => [`$E${i}`, i === 0 ? "KP" : "KL", `X=${x}.00`, `Y=${y}.00`, "Z=0.00", ""]),
    '<105 \\Konturfraesen\\', 'ZA="0.0"', 'EA="1:0"', 'EE="1:4"', 'RK="WRKL"', 'TNO="T6"', 'RI="1"', 'KO="00"', '', '!', ''].join("\r\n");
  assert.equal(mpr, expected);
});

test("centrirana kriva: pomak iz CURVEDATA (Z pa X) daje stvarni položaj usjecanja (uzorak sudopere 560 × 490)", () => {
  // Prave bajtove uzorka (pomak 0,315 / 3,134 m) iz Kuhinja.S3D; ostatak toka ne utiče na čitanje pomaka.
  const curveData = "070B547275626E65546F636B650102000602555103250E0603706F73070A5458595A4F626A6563740102000602555103260E060378797AAE47A13E759348400000000000000000";
  assert.deepEqual(Object.values(curveOffset(`"CURVEDATA=${curveData}"`)!).map((v) => Math.round(v)), [3134, 315]);
  assert.equal(curveOffset('"CURVE=0"'), null);
  const cutout = [q("CURVE=0"), q("CNNAME=Line"), q("CNOPEN=0"), points([[-0.28, -0.245], [0.28, -0.245], [0.28, 0.245], [-0.28, 0.245]]), q("MILLDATA=0A"), q(`CURVEDATA=${curveData}`)].join(",");
  const [found] = corpusBoardCutouts({ curveData: `${outline},${cutout}` });
  assert.deepEqual([found!.x, found!.z, found!.width, found!.depth].map(Math.round), [2854, 70, 560, 490]);
});

test("MPR bez usjecanja ili bez mjera ploče se odbija", () => {
  assert.throws(() => corpusBoardCutoutMpr({ curveData: outline, height: 1920, width: 600, thickness: 38 }, { partName: "A", materialName: "B" }));
  assert.throws(() => corpusBoardCutoutMpr({ curveData: outline, height: null, width: 600, thickness: 38 }, { partName: "A", materialName: "B" }));
});

test("MPR: dijakritici u imenu ploče se zamjenjuju ASCII-jem kao u CSV izvozu", () => {
  const cutout = [q("CURVE=0"), q("CNNAME=Line"), q("CNOPEN=0"), points([[0.1, 0.1], [0.2, 0.1], [0.2, 0.2], [0.1, 0.2]]), q("MILLDATA=0A")].join(",");
  const mpr = corpusBoardCutoutMpr({ curveData: `${outline},${cutout}`, height: 1000, width: 600, thickness: 18 }, { partName: "Ploča_šank", materialName: "Hrast ćilim" });
  assert.match(mpr, /PartName: Ploca_sank/);
  assert.match(mpr, /Material: Hrast cilim/);
});
