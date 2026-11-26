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

test("utori: rupe s RAS MODE=4 postaju <112 Tasche kao u Corpusovom programu (uzorak Ledja 1850 × 330)", async () => {
  const { corpusBoardGroovesMpr } = await import("../lib/mpr-export.ts");
  const hole = (x: string, y: string, vis: string, ang: string) => ({ groupType: "GRUPA14", name: "Grupa", xExpression: x, yExpression: y, diameter: 10, depth: 6, plane: 1, angle: 0, machiningMode: 4, machining: { CONMIL: "0", MILTOOL: "100", VIS: vis, SIR: "17", ANG: ang, CRAD: "0", DKOR: "0", XYOV: "80", FEED: "5", THRO: "false" } });
  const lines = corpusBoardGroovesMpr({ height: 1850, width: 330, holes: [hole("920", "8.5+10", "1840", "90"), hole("1840-8.5", "170", "320", "0"), { ...hole("1", "1", "1", "0"), machiningMode: 1 }] });
  const block = (xa: string, ya: string, wi: string, br: string) => ['<112 \\Tasche\\', 'T_="T6"', `XA="${xa}"`, `YA="${ya}"`, `WI="${wi}"`, 'LA="17"', `BR="${br}"`, 'KO="00"', 'XY="80"', 'RD="0"', 'TI="6"', 'F_="5"'];
  assert.deepEqual(lines, [...block("920", "18.5", "-90", "1840"), ...block("1831.5", "170", "0", "320")]);
});

test("MPR samo s utorima (bez usjecanja) i bez ičega: prvi se piše, drugi se odbija", () => {
  const groove = { groupType: "GRUPA14", name: "G", xExpression: "10", yExpression: "20", diameter: 10, depth: 6, plane: 1, angle: 0, machiningMode: 4, machining: { VIS: "100", SIR: "17", ANG: "0", XYOV: "80", FEED: "5", CRAD: "0" } };
  const base = { curveData: outline, height: 1000, width: 600, thickness: 18 };
  assert.match(corpusBoardCutoutMpr({ ...base, holes: [groove] } as never, { partName: "Ledja", materialName: "U115" }), /<112 \\Tasche\\/);
  assert.throws(() => corpusBoardCutoutMpr({ ...base, holes: [] } as never, { partName: "Ledja", materialName: "U115" }));
});

test("MPR s bušenjima vrata: blokovi <102 kao u Corpusovom programu (uzorak Fronta_ 286 × 256)", () => {
  const mpr = corpusBoardCutoutMpr({ curveData: outline, height: 286, width: 256, thickness: 18 }, { partName: "Fronta_", materialName: "_0", bores: [{ x: 50, y: 234.5, diameter: 35, depth: 14 }, { x: 24, y: 229, diameter: 3, depth: 3 }] });
  const block = (xa: string, ya: string, ti: string, du: string) => ['<102 \\Veritkalno\\', `XA="${xa}"`, `YA="${ya}"`, `TI="${ti}"`, `DU="${du}"`, 'AN="1"', 'MI="0"', 'AB="32"', 'WI="0"', 'BM="LS"', 'HP="0"', 'SP="0"', 'MX="0"', 'MY="0"', 'MZ="0"', 'KO="00"'].join("\r\n");
  assert.ok(mpr.includes(`${block("50", "234.5", "14", "35")}\r\n${block("24", "229", "3", "3")}\r\n!`));
});
