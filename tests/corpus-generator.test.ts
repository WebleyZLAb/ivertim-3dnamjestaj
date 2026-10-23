import assert from "node:assert/strict";
import test from "node:test";
import { generateCorpusCabinetE3d } from "../lib/corpus-generator.ts";
import { parseCorpusE3d, parseCorpusS3d } from "../lib/corpus-s3d.ts";
import { writeCorpusS3dWithImportedElements } from "../lib/corpus-s3d-writer.ts";

test("generiše osnovni Corpus E3D korpus sa policama i leđima", () => {
  const generated = generateCorpusCabinetE3d({ name: `Korpus & "test"`, code: "K600", width: 600, height: 820, depth: 560, thickness: 18, shelfCount: 2, includeBack: true, materialName: "Bijela", color: 0xffffff });
  const parsed = parseCorpusE3d(generated.sourceXml);
  const element = parsed.elements[0]!;
  assert.equal(generated.fileName, "K600.E3D");
  assert.deepEqual(parsed.elements[0]?.position, [0, 0, 560]);
  assert.equal(element.name, `Korpus & "test"`);
  assert.deepEqual([element.width, element.height, element.depth], [600, 820, 560]);
  assert.equal(element.boards.length, 7);
  assert.deepEqual(element.boards.map(({ direction }) => direction), [0, 0, 2, 2, 2, 2, 1]);
  assert.equal(element.boards.at(-1)!.name, "Leđa");
  assert.deepEqual(element.boards.at(-1)!.position, [18, 18, -542]);
  assert.equal(element.boards[0]!.curvePoints.length, 4);
});

test("generisani E3D ulazi u prazan S3D bez gubitka strukture", () => {
  const generated = generateCorpusCabinetE3d({ name: "Korpus", code: "K800", width: 800, height: 720, depth: 500, thickness: 18, shelfCount: 1, includeBack: false, materialName: "Hrast", color: 0x997755 });
  const library = parseCorpusE3d(generated.sourceXml);
  const s3d = `<PROJECTFILE VER="17"><SOBA SIRINA="4" DUZINA="5" VISINA="1.2" VISINALOW="1.4"/></PROJECTFILE>`;
  const project = parseCorpusS3d(s3d);
  const output = writeCorpusS3dWithImportedElements(s3d, project.elements, library.elements, [{ sourceFile: generated.fileName, sourceXml: generated.sourceXml, originalElement: library.elements[0]! }]);
  const reparsed = parseCorpusS3d(output);
  assert.equal(reparsed.elements[0]!.boards.length, 5);
  assert.equal(reparsed.elements[0]!.boards[4]!.name, "Polica 1");
});

test("generiše jednu ili dvije dokazano orijentisane fronte sa zazorom", () => {
  const generated = generateCorpusCabinetE3d({ name: "Korpus sa frontama", code: "KF600", width: 600, height: 820, depth: 560, thickness: 18, shelfCount: 0, includeBack: false, materialName: "Bijela", materialUid: "MAT-BIJELA", color: 0xffffff, frontCount: 2, frontThickness: 19, frontGap: 2, frontMaterialName: "Hrast fronta", frontMaterialUid: "MAT-HRAST", frontColor: 0x886644 });
  const fronts = parseCorpusE3d(generated.sourceXml).elements[0]!.boards.filter(({ name }) => name.startsWith("Fronta"));
  assert.equal(fronts.length, 2);
  assert.deepEqual(fronts.map(({ boardType, frontType }) => [boardType, frontType]), [[1, 2], [1, 2]]);
  assert.deepEqual(fronts.map(({ direction }) => direction), [1, 1]);
  assert.deepEqual(fronts.map(({ position }) => position), [[2, 2, 0], [301, 2, 0]]);
  assert.deepEqual(fronts.map(({ height, width, thickness }) => [height, width, thickness]), [[816, 297, 19], [816, 297, 19]]);
  assert.deepEqual(fronts.map(({ materialName, color }) => [materialName, color]), [["Hrast fronta", 0x886644], ["Hrast fronta", 0x886644]]);
  assert.deepEqual(fronts.map(({ materialUid }) => materialUid), ["MAT-HRAST", "MAT-HRAST"]);
  assert.match(generated.sourceXml, /DNAME="Fronta 1"[^>]*TIPDASKE="1" TIPFRONTE="2"/);
});

test("fronta nasljeđuje MATUID korpusa kada poseban UID nije zadan", () => {
  const generated = generateCorpusCabinetE3d({ name: "Korpus", code: "K600", width: 600, height: 720, depth: 560, thickness: 18, shelfCount: 0, includeBack: false, materialName: "Bijela", materialUid: "MAT&B-18", color: 0xffffff, frontCount: 1, frontMaterialName: "Bijela fronta", frontMaterialUid: "  " });
  const element = parseCorpusE3d(generated.sourceXml).elements[0]!;
  assert.equal(element.boards[0]!.materialUid, "MAT&B-18");
  assert.equal(element.boards.find(({ frontType }) => frontType !== null)?.materialUid, "MAT&B-18");
  assert.match(generated.sourceXml, /MATUID="MAT&amp;B-18"/);
});

test("generiše niz frontova ladica po visini korpusa", () => {
  const generated = generateCorpusCabinetE3d({ name: "Ladičar", code: "L600", width: 600, height: 820, depth: 560, thickness: 18, shelfCount: 0, baseHeight: 100, includeBack: false, materialName: "Bijela", color: 0xffffff, frontCount: 3, frontLayout: "drawers", frontThickness: 18, frontGap: 2, frontMaterialName: "Front bijela", frontColor: 0xfefefe });
  const fronts = parseCorpusE3d(generated.sourceXml).elements[0]!.boards.filter(({ name }) => name.startsWith("Fronta ladice"));
  assert.deepEqual(fronts.map(({ name, position, height, width, thickness }) => [name, ...position, height, width, thickness]), [
    ["Fronta ladice 1", 2, 102, 0, 237.333, 596, 18],
    ["Fronta ladice 2", 2, 341.333, 0, 237.333, 596, 18],
    ["Fronta ladice 3", 2, 580.667, 0, 237.333, 596, 18],
  ]);
});

test("dijeli frontove ladica prema ručno zadanim omjerima", () => {
  const generated = generateCorpusCabinetE3d({ name: "Asimetrični ladičar", code: "AL600", width: 600, height: 820, depth: 560, thickness: 18, shelfCount: 0, baseHeight: 100, includeBack: false, materialName: "Bijela", color: 0xffffff, frontCount: 3, frontLayout: "drawers", frontWeights: [1, 2, 1], frontThickness: 18, frontGap: 2 });
  const fronts = parseCorpusE3d(generated.sourceXml).elements[0]!.boards.filter(({ name }) => name.startsWith("Fronta ladice"));
  assert.deepEqual(fronts.map(({ position, height, width }) => [...position, height, width]), [
    [2, 102, 0, 178, 596],
    [2, 282, 0, 356, 596],
    [2, 640, 0, 178, 596],
  ]);
});

test("generiše uvučene fronte unutar čistog otvora korpusa", () => {
  const generated = generateCorpusCabinetE3d({ name: "Uvučene fronte", code: "UF600", width: 600, height: 820, depth: 560, thickness: 18, shelfCount: 0, baseHeight: 100, includeBack: false, materialName: "Bijela", color: 0xffffff, frontCount: 2, frontLayout: "doors", frontMount: "inset", frontThickness: 18, frontGap: 2 });
  const fronts = parseCorpusE3d(generated.sourceXml).elements[0]!.boards.filter(({ name }) => name.startsWith("Fronta"));
  assert.deepEqual(fronts.map(({ position, height, width }) => [...position, height, width]), [
    [20, 120, 0, 680, 279],
    [301, 120, 0, 680, 279],
  ]);
});

test("generiše vertikalne pregrade i police dijeli po čistim poljima", () => {
  const generated = generateCorpusCabinetE3d({ name: "Trostruko polje", code: "TP1000", width: 1000, height: 900, depth: 500, thickness: 18, shelfCount: 1, dividerCount: 2, includeBack: false, materialName: "Bijela", color: 0xffffff });
  const boards = parseCorpusE3d(generated.sourceXml).elements[0]!.boards;
  const dividers = boards.filter(({ name }) => name.startsWith("Pregrada"));
  const shelves = boards.filter(({ name }) => name.startsWith("Polica"));
  assert.equal(boards.length, 9);
  assert.deepEqual(dividers.map(({ direction, position, height, width, thickness }) => [direction, ...position, height, width, thickness]), [
    [0, 327.333, 18, 0, 864, 500, 18],
    [0, 654.667, 18, 0, 864, 500, 18],
  ]);
  assert.deepEqual(shelves.map(({ name, direction, position, height }) => [name, direction, ...position, height]), [
    ["Polica 1 / polje 1", 2, 18, 450, 0, 309.333],
    ["Polica 1 / polje 2", 2, 345.333, 450, 0, 309.333],
    ["Polica 1 / polje 3", 2, 672.667, 450, 0, 309.333],
  ]);
});

test("generiše podignuti donji korpus, skraćenu frontu i uvučenu coklu", () => {
  const generated = generateCorpusCabinetE3d({ name: "Donji element", code: "D600", width: 600, height: 820, depth: 560, thickness: 18, shelfCount: 1, dividerCount: 0, baseHeight: 100, includePlinth: true, plinthInset: 30, includeBack: true, materialName: "Bijela", color: 0xffffff, frontCount: 1, frontThickness: 18, frontGap: 2, frontMaterialName: "Front bijela", frontColor: 0xfefefe });
  const boards = parseCorpusE3d(generated.sourceXml).elements[0]!.boards;
  const find = (name: string) => boards.find((board) => board.name === name)!;
  assert.deepEqual(find("Lijevi bok").position, [0, 100, 0]);
  assert.deepEqual([find("Lijevi bok").height, find("Pod").position[1], find("Strop").position[1]], [720, 100, 802]);
  assert.deepEqual([find("Polica 1").position[1], find("Polica 1").height], [460, 564]);
  assert.deepEqual([find("Leđa").position, find("Leđa").height], [[18, 118, -542], 684]);
  assert.deepEqual([find("Fronta").position, find("Fronta").height, find("Fronta").width], [[2, 102, 0], 716, 596]);
  assert.deepEqual([find("Cokla").direction, find("Cokla").position, find("Cokla").height, find("Cokla").width], [1, [18, 0, -30], 100, 564]);
});

test("zamjenjuje punu gornju ploču prednjim i zadnjim vezačem", () => {
  const generated = generateCorpusCabinetE3d({ name: "Donji sa vezačima", code: "DV600", width: 600, height: 820, depth: 560, thickness: 18, shelfCount: 0, baseHeight: 100, includePlinth: true, plinthInset: 30, topConstruction: "stretchers", stretcherWidth: 100, rearStretcherInset: 40, includeBack: false, materialName: "Bijela", color: 0xffffff });
  const boards = parseCorpusE3d(generated.sourceXml).elements[0]!.boards;
  assert.equal(boards.some(({ name }) => name === "Strop"), false);
  const stretchers = boards.filter(({ name }) => name.endsWith("vezač"));
  assert.deepEqual(stretchers.map(({ name, direction, position, height, width, thickness }) => [name, direction, ...position, height, width, thickness]), [
    ["Prednji vezač", 2, 18, 802, 0, 564, 100, 18],
    ["Zadnji vezač", 2, 18, 802, -420, 564, 100, 18],
  ]);
});

test("generiše tanka HDF leđa na dokazanoj zadnjoj ravni", () => {
  const generated = generateCorpusCabinetE3d({ name: "Korpus sa HDF leđima", code: "HDF600", width: 600, height: 820, depth: 560, thickness: 18, shelfCount: 0, baseHeight: 100, includeBack: true, backType: "thin", backThickness: 3, backMaterialName: "3_HDF_BIJELI", backColor: 0xfefefe, materialName: "Bijela", color: 0xffffff });
  const back = parseCorpusE3d(generated.sourceXml).elements[0]!.boards.find(({ name }) => name === "Leđa")!;
  assert.deepEqual([back.direction, back.position, back.height, back.width, back.thickness], [1, [18, 118, -560], 684, 564, 3]);
  assert.deepEqual([back.materialName, back.color], ["3_HDF_BIJELI", 0xfefefe]);
  assert.match(generated.sourceXml, /DNAME="Leđa"[^>]*TIPDASKE="8"/);
});

test("generiše police sa nezavisnim prednjim i zadnjim uvlakom", () => {
  const generated = generateCorpusCabinetE3d({ name: "Korpus sa uvučenom policom", code: "P600", width: 600, height: 820, depth: 560, thickness: 18, shelfCount: 1, shelfFrontInset: 20, shelfRearInset: 18, includeBack: false, materialName: "Bijela", color: 0xffffff });
  const shelf = parseCorpusE3d(generated.sourceXml).elements[0]!.boards.find(({ name }) => name === "Polica 1")!;
  assert.deepEqual([shelf.direction, shelf.position, shelf.height, shelf.width, shelf.thickness], [2, [18, 410, -20], 564, 522, 18]);
});

test("generiše police na ručno zadanim čistim visinama iznad poda korpusa", () => {
  const generated = generateCorpusCabinetE3d({ name: "Korpus sa ručnim policama", code: "RP600", width: 600, height: 820, depth: 560, thickness: 18, shelfCount: 2, shelfOffsets: [220, 510], includeBack: false, materialName: "Bijela", color: 0xffffff });
  const shelves = parseCorpusE3d(generated.sourceXml).elements[0]!.boards.filter(({ name }) => name.startsWith("Polica"));
  assert.deepEqual(shelves.map(({ name, position }) => [name, ...position]), [
    ["Polica 1", 18, 238, 0],
    ["Polica 2", 18, 528, 0],
  ]);
});

test("ručno postavlja pregrade i police dijeli po stvarnim širinama polja", () => {
  const generated = generateCorpusCabinetE3d({ name: "Asimetrični korpus", code: "A800", width: 800, height: 820, depth: 560, thickness: 18, shelfCount: 1, dividerCount: 1, dividerOffsets: [300], includeBack: false, materialName: "Bijela", color: 0xffffff });
  const boards = parseCorpusE3d(generated.sourceXml).elements[0]!.boards;
  const divider = boards.find(({ name }) => name === "Pregrada 1")!;
  const shelves = boards.filter(({ name }) => name.startsWith("Polica"));
  assert.deepEqual([divider.position, divider.height], [[318, 18, 0], 784]);
  assert.deepEqual(shelves.map(({ name, position, height }) => [name, ...position, height]), [
    ["Polica 1 / polje 1", 18, 410, 0, 300],
    ["Polica 1 / polje 2", 336, 410, 0, 446],
  ]);
});

test("odbija neupotrebljive mjere i broj polica", () => {
  const base = { name: "Korpus", code: "K", width: 600, height: 820, depth: 560, thickness: 18, shelfCount: 0, includeBack: false, materialName: "", color: 0xffffff };
  assert.throws(() => generateCorpusCabinetE3d({ ...base, width: 30 }), /veći od debljine/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, shelfCount: 21 }), /0 do 20/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, shelfFrontInset: -1 }), /ne mogu biti negativni/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, shelfFrontInset: 300, shelfRearInset: 260 }), /pozitivnu dubinu/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, shelfCount: 2, shelfOffsets: [200] }), /odgovarati broju/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, shelfCount: 2, shelfOffsets: [200, 210] }), /razmaknute najmanje/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, shelfCount: 1, shelfOffsets: [800] }), /ulazi u gornju/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, dividerCount: 11 }), /0 do 10/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, width: 80, dividerCount: 3 }), /preuzak/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, dividerCount: 2, dividerOffsets: [200] }), /odgovarati broju/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, dividerCount: 2, dividerOffsets: [250, 260] }), /pozitivnu širinu/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, dividerCount: 1, dividerOffsets: [570] }), /pozitivnu širinu/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, includePlinth: true }), /pozitivnu visinu postolja/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, baseHeight: 800 }), /dovoljno mjesta/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, topConstruction: "stretchers", stretcherWidth: 270, rearStretcherInset: 20 }), /ne mogu stati/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, includeBack: true, backType: "thin", backThickness: 600 }), /Debljina tankih leđa/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, frontCount: 2, frontGap: 250 }), /Zazor je prevelik/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, frontCount: 11 }), /0 do 10/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, frontCount: 2, frontWeights: [1] }), /odgovarati broju/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, frontCount: 2, frontWeights: [1, 0] }), /pozitivni brojevi/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, frontCount: 1, frontMount: "inset", frontGap: 400 }), /Zazor je prevelik/);
  assert.throws(() => generateCorpusCabinetE3d({ ...base, frontCount: 3, frontLayout: "drawers", frontGap: 210 }), /Zazor je prevelik/);
});
