import assert from "node:assert/strict";
import test from "node:test";
import { appendCorpusRectCutout, corpusBoardCutouts, removeCorpusCutout } from "../lib/corpus-cutouts.ts";

const q = (value: string) => `"${value}"`;
const curve = (id: number, name: string, points: [number, number][], open = 0) => [q(`CURVE=${id}`), q(`CNNAME=${name}`), q(`CNOPEN=${open}`), ...points.flatMap(([x, z], i) => [q(`PTOCKA=${i}`), q("PTSTYLE=0"), q(`PTX=${x}`), q(`PTZ=${z}`)])].join(",");

test("usjecanje radne ploče: sekundarna zatvorena kriva, kontura ploče se ne broji", () => {
  const data = [
    curve(-1, "Outline", [[0, 0], [1.92, 0], [1.92, 0.6], [0, 0.6]]),
    curve(0, "Line", [[0.635, 0.085], [1.165, 0.085], [1.165, 0.515], [0.635, 0.515]]) + "," + q("MILLDATA=0A0B"),
    curve(1, "Line", [[0, 0], [0.05, 0], [0.05, 0.05], [0, 0.05]]),
  ].join(",");
  const cutouts = corpusBoardCutouts({ curveData: data });
  assert.equal(cutouts.length, 1);
  const cutout = cutouts[0]!;
  assert.deepEqual([cutout.x, cutout.z, Math.round(cutout.width), Math.round(cutout.depth)], [635, 85, 530, 430]);
  assert.equal(cutout.rectangular, true);
});

test("otvorena kriva i ploča bez krivulja nemaju usjecanja", () => {
  assert.deepEqual(corpusBoardCutouts({ curveData: null }), []);
  const open = curve(0, "Line", [[0, 0], [1, 0], [1, 1]], 1);
  assert.deepEqual(corpusBoardCutouts({ curveData: open }), []);
});

test("appendCorpusRectCutout: dodano usjecanje čita se nazad s istim mjerama i dobija sljedeći CURVE broj", () => {
  const outline = curve(-1, "Outline", [[0, 0], [1.92, 0], [1.92, 0.6], [0, 0.6]]);
  const once = appendCorpusRectCutout(outline, { x: 635, z: 85, width: 530, depth: 430 });
  const twice = appendCorpusRectCutout(once, { x: 100, z: 100, width: 300, depth: 200 });
  assert.match(twice, /"CURVE=0"/);
  assert.match(twice, /"CURVE=1"/);
  const cutouts = corpusBoardCutouts({ curveData: twice });
  assert.deepEqual(cutouts.map((c) => [Math.round(c.x), Math.round(c.z), Math.round(c.width), Math.round(c.depth), c.rectangular]), [[635, 85, 530, 430, true], [100, 100, 300, 200, true]]);
  assert.throws(() => appendCorpusRectCutout(outline, { x: 0, z: 0, width: 0, depth: 10 }));
  assert.throws(() => appendCorpusRectCutout("", { x: 0, z: 0, width: 10, depth: 10 }));
});

test("addCorpusE3dBoardCutout: usjecanje u E3D ploči, ostali atributi i ploče ostaju netaknuti", async () => {
  const { addCorpusE3dBoardCutout } = await import("../lib/corpus-s3d-writer.ts");
  const { parseCorpusE3d, corpusBoardOutline } = await import("../lib/corpus-s3d.ts");
  const board = (name: string) => `<AD DNAME="${name}" SMJER="2" DXPOS="0" DYPOS="0" DZPOS="0" VISINA="1920" DUBINA="600" DEBLJINA="38" CUSTOM="keep &gt; 1"><RUPE/><KRIVULJE DATA="&quot;PTOCKA=0&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=0&quot;,&quot;PTZ=0&quot;,&quot;PTOCKA=1&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=1.92&quot;,&quot;PTZ=0&quot;,&quot;PTOCKA=2&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=1.92&quot;,&quot;PTZ=0.6&quot;,&quot;PTOCKA=3&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=0&quot;,&quot;PTZ=0.6&quot;"/></AD>`;
  const xml = `<ELEMENTFILE VER="17"><ELEMENT ENAME="Radna" ESIRINA="1920" EVISINA="38" EDUBINA="600" EEDITABLE="true"><DASKE DCOUNT="2">${board("Radna_Ploha1")}${board("Druga")}</DASKE></ELEMENT></ELEMENTFILE>`;
  const output = addCorpusE3dBoardCutout(xml, 0, { x: 635, z: 85, width: 530, depth: 430 });
  const boards = parseCorpusE3d(output).elements[0]!.boards;
  assert.deepEqual(corpusBoardCutouts(boards[0]!).map((c) => [Math.round(c.x), Math.round(c.z), Math.round(c.width), Math.round(c.depth)]), [[635, 85, 530, 430]]);
  assert.equal(corpusBoardOutline(boards[0]!).length, 4);
  assert.deepEqual(boards[1]!.curveData, parseCorpusE3d(xml).elements[0]!.boards[1]!.curveData);
  assert.match(output, /CUSTOM="keep &gt; 1"/);
  assert.throws(() => addCorpusE3dBoardCutout(xml, 5, { x: 0, z: 0, width: 10, depth: 10 }));
});

test("removeCorpusCutout: briše izabrano usjecanje, kontura i drugo usjecanje ostaju", () => {
  const outline = curve(-1, "Outline", [[0, 0], [1.92, 0], [1.92, 0.6], [0, 0.6]]);
  const two = appendCorpusRectCutout(appendCorpusRectCutout(outline, { x: 635, z: 85, width: 530, depth: 430 }), { x: 100, z: 100, width: 300, depth: 200 });
  const first = removeCorpusCutout(two, 0);
  assert.deepEqual(corpusBoardCutouts({ curveData: first }).map((c) => [Math.round(c.x), Math.round(c.width)]), [[100, 300]]);
  const none = removeCorpusCutout(first, 0);
  assert.deepEqual(corpusBoardCutouts({ curveData: none }), []);
  assert.match(none, /"CURVE=-1"/);
  assert.throws(() => removeCorpusCutout(none, 0));
});

test("usjecanje sa zaobljenim uglovima: osam tačaka, luk na prvoj tački svakog ugla, mjere obuhvata iste", () => {
  const outline = curve(-1, "Outline", [[0, 0], [1.92, 0], [1.92, 0.6], [0, 0.6]]);
  const data = appendCorpusRectCutout(outline, { x: 100, z: 50, width: 490, depth: 490, radius: 20 });
  const [cutout] = corpusBoardCutouts({ curveData: data });
  assert.equal(cutout!.points.length, 8);
  assert.equal(cutout!.rectangular, false);
  assert.deepEqual([cutout!.x, cutout!.z, cutout!.width, cutout!.depth].map(Math.round), [100, 50, 490, 490]);
  assert.deepEqual(cutout!.points.map((p) => [p.style, p.arcRadius === null ? null : Math.round(p.arcRadius)]), [[2, 20], [0, null], [2, 20], [0, null], [2, 20], [0, null], [2, 20], [0, null]]);
  assert.throws(() => appendCorpusRectCutout(outline, { x: 0, z: 0, width: 100, depth: 100, radius: 60 }));
});
