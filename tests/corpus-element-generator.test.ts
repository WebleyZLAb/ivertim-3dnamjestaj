import assert from "node:assert/strict";
import test from "node:test";
import { generateCorpusElementE3d, type CorpusElementSpec } from "../lib/corpus-element-generator.ts";
import { parseCorpusE3d } from "../lib/corpus-s3d.ts";

const base: CorpusElementSpec = {
  name: `Radni & "element"`,
  code: "RE 600",
  width: 600,
  height: 720,
  depth: 560,
  starterDirection: 1,
  starterBoardName: "Početna ploča",
  thickness: 18,
  materialName: "Bijela",
  materialUid: "W980",
  color: 0xf2f2ee,
};

test("generiše minimalan E3D element sa jednom početnom pločom", () => {
  const generated = generateCorpusElementE3d(base);
  const element = parseCorpusE3d(generated.sourceXml).elements[0]!;
  assert.equal(generated.fileName, "RE-600.E3D");
  assert.equal(element.name, `Radni & "element"`);
  assert.equal(element.code, "RE 600");
  assert.deepEqual(element.position, [0, 0, 560]);
  assert.deepEqual([element.width, element.height, element.depth], [600, 720, 560]);
  assert.equal(element.boards.length, 1);
  assert.deepEqual(element.boards[0]!.position, [0, 0, 0]);
  assert.deepEqual([element.boards[0]!.height, element.boards[0]!.width, element.boards[0]!.thickness, element.boards[0]!.direction], [720, 600, 18, 1]);
  assert.deepEqual([element.boards[0]!.materialName, element.boards[0]!.materialUid, element.boards[0]!.color], ["Bijela", "W980", 0xf2f2ee]);
  assert.equal(element.boards[0]!.curvePoints.length, 4);
  assert.match(generated.sourceXml, /DASKE DCOUNT="1"/);
});

test("izvodi dimenzije početne ploče iz izabrane orijentacije", () => {
  const side = parseCorpusE3d(generateCorpusElementE3d({ ...base, starterDirection: 0 }).sourceXml).elements[0]!.boards[0]!;
  const horizontal = parseCorpusE3d(generateCorpusElementE3d({ ...base, starterDirection: 2 }).sourceXml).elements[0]!.boards[0]!;
  assert.deepEqual([side.height, side.width, side.thickness, side.direction], [720, 560, 18, 0]);
  assert.deepEqual([horizontal.height, horizontal.width, horizontal.thickness, horizontal.direction], [600, 560, 18, 2]);
});

test("odbija prazne nazive, nepozitivne mjere i neispravnu boju", () => {
  assert.throws(() => generateCorpusElementE3d({ ...base, name: " " }), /Naziv elementa/);
  assert.throws(() => generateCorpusElementE3d({ ...base, starterBoardName: "" }), /početne ploče/);
  assert.throws(() => generateCorpusElementE3d({ ...base, depth: 0 }), /pozitivni brojevi/);
  assert.throws(() => generateCorpusElementE3d({ ...base, color: 0x1000000 }), /Boja ploče/);
});
