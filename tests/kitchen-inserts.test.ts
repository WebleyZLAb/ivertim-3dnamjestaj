import assert from "node:assert/strict";
import test from "node:test";
import { findBaseRuns, isBaseCabinet, kitchenInsertSource, plinthInserts, withoutExisting, worktopInserts } from "../lib/kitchen-inserts.ts";
import { parseCorpusE3d, parseCorpusS3d } from "../lib/corpus-s3d.ts";
import { corpusElementFootprint } from "../lib/corpus-footprint.ts";
import { corpusElementBoardBounds } from "../lib/corpus-board-bounds.ts";

const cabinet = (name: string, x: number, z: number, width: number, height = 820, angle = 0, variables = 'VAR0="VISINA_NOGICA=100" VAR1="VIDLJIVOST_NOGICA=0"') =>
  `<ELEMENT ECLAS="TElement" ENAME="${name}" EXPOX="${x}" EYPOS="0" EZPOS="${z}" ESIRINA="${width}" EVISINA="${height}" EDUBINA="510" EKUT="${angle}"><EVAR ${variables}/><DASKE><AD DNAME="Bok" VISINA="${height}" DUBINA="510" DEBLJINA="18" MATNAME="Bijela" MATUID="W1"/></DASKE></ELEMENT>`;

// Raspored kao u Tijana_kuhinja: dva susjedna elementa (800 mm), jedan sa strane, jedan odvojen, i elementi koji se preskaču.
const xml = `<PROJECTFILE VER="17">
${cabinet("GTV", 18, 560, 600)}
${cabinet("Apoteka", 618, 563, 200)}
${cabinet("Odvojen", 1454, 563, 407)}
${cabinet("Ukosen", 1900, 0, 600, 820, 45)}
<ELEMENT ECLAS="TElement" ENAME="Cokla" EXPOX="18" EYPOS="0" EZPOS="563" ESIRINA="800" EVISINA="95" EDUBINA="18" EKUT="0"/>
<ELEMENT ECLAS="TElement" ENAME="Radna_Ploha" EXPOX="0" EYPOS="820" EZPOS="600" ESIRINA="838" EVISINA="38" EDUBINA="600" EKUT="0"><EVAR VAR0="RPTIP=1"/></ELEMENT>
<ELEMENT ECLAS="TElement" ENAME="Viseci" EXPOX="18" EYPOS="1400" EZPOS="563" ESIRINA="600" EVISINA="720" EDUBINA="320" EKUT="0"/>
</PROJECTFILE>`;
const elements = () => parseCorpusS3d(xml).elements;

test("donji elementi: na podu, pod pravim uglom, bez cokle, ploče i visećih", () => {
  assert.deepEqual(elements().map((element) => [element.name, isBaseCabinet(element)]), [
    ["GTV", true], ["Apoteka", true], ["Odvojen", true], ["Ukosen", false], ["Cokla", false], ["Radna_Ploha", false], ["Viseci", false],
  ]);
});

test("nizovi: susjedni elementi na istom Z čine jedan niz, odvojen element drugi", () => {
  const runs = findBaseRuns(elements());
  assert.deepEqual(runs.map((run) => [run.a, run.width, run.top, run.elements.length]), [[18, 800, 820, 2], [1454, 407, 820, 1]]);
});

test("radna ploha: širina niza, Y = vrh, Z najisturenijeg elementa + prepust 37, dubina 600, debljina 38", () => {
  const inserts = worktopInserts(findBaseRuns(elements()));
  assert.equal(inserts.length, 2);
  const [first] = inserts;
  assert.deepEqual([first!.spec.width, first!.spec.height, first!.spec.depth, first!.spec.thickness, first!.position], [800, 38, 600, 38, [18, 820, 600]]);
  assert.equal(first!.spec.materialName, "Bijela");
  const custom = worktopInserts(findBaseRuns(elements()), { thickness: 36, overhang: 40, depth: 650 })[0]!;
  assert.deepEqual([custom.spec.thickness, custom.position[2], custom.spec.depth], [36, 603, 650]);
});

test("cokla: po nizu, visina VISINA_NOGICA − 5, debljina 18, Y 0, Z iza prednje ivice (najisturenijeg elementa − debljina)", () => {
  const inserts = plinthInserts(findBaseRuns(elements()));
  assert.deepEqual(inserts.map((insert) => [insert.spec.width, insert.spec.height, insert.spec.depth, insert.position]), [[800, 95, 18, [18, 0, 545]], [407, 95, 18, [1454, 0, 545]]]);
});

test("cokla se prekida na elementu s vidljivim nogicama", () => {
  const visible = xml.replace('ENAME="Apoteka"', 'ENAME="Apoteka"').replace(/(ENAME="Apoteka"[^>]*>)<EVAR [^>]*\/>/, '$1<EVAR VAR0="VISINA_NOGICA=100" VAR1="VIDLJIVOST_NOGICA=1"/>');
  const inserts = plinthInserts(findBaseRuns(parseCorpusS3d(visible).elements));
  assert.deepEqual(inserts.map((insert) => insert.spec.width), [600, 407]);
});

test("umetak postaje E3D sa tačnim mjerama, položajem i dasku koja leži kako treba", () => {
  const [worktop] = worktopInserts(findBaseRuns(elements()));
  const element = parseCorpusE3d(kitchenInsertSource(worktop!)).elements[0]!;
  assert.deepEqual([element.name, element.width, element.height, element.depth, element.position.map((value) => Math.round(value ?? 0))], ["Radna_Ploha", 800, 38, 600, [18, 820, 600]]);
  assert.equal(element.boards.length, 1);
  const footprint = corpusElementFootprint(element)!;
  assert.deepEqual([footprint.worldBounds.minX, footprint.worldBounds.maxX], [18, 818]);
  const plinth = parseCorpusE3d(kitchenInsertSource(plinthInserts(findBaseRuns(elements()))[0]!)).elements[0]!;
  assert.deepEqual([plinth.name, plinth.width, plinth.height, plinth.depth], ["Cokla", 800, 95, 18]);
});

test("daske umetaka se poklapaju s Corpusovim: radna ploha Z 0–600 i Y 820–858, cokla Z 545–563 i Y 0–95", () => {
  const [worktop] = worktopInserts(findBaseRuns(elements()));
  const wb = corpusElementBoardBounds(parseCorpusE3d(kitchenInsertSource(worktop!)).elements[0]!)!;
  assert.deepEqual([wb.minX, wb.maxX, Math.round(wb.minY), Math.round(wb.maxY), Math.round(wb.minZ) + 0, Math.round(wb.maxZ)], [18, 818, 820, 858, 0, 600]);
  const [plinth] = plinthInserts(findBaseRuns(elements()));
  const pb = corpusElementBoardBounds(parseCorpusE3d(kitchenInsertSource(plinth!)).elements[0]!)!;
  assert.deepEqual([pb.minX, pb.maxX, pb.minY, pb.maxY, pb.minZ, pb.maxZ], [18, 818, 0, 95, 545, 563]);
});

/** Desni zid Tijane: elementi pod 270° (tijelo se pruža u +X, položaj je prednja ivica x = 1900). */
const side = `<PROJECTFILE VER="17">
${cabinet("Sudoper", 1900, 0, 1364, 820, 270).replace('EDUBINA="510"', 'EDUBINA="560"')}
${cabinet("Susjed", 1900, 1364, 636, 820, 270)}
</PROJECTFILE>`;

test("zid pod 270°: ploha poklapa Corpusovu (pos 1860,820,0, širina 2000, daske X 1860–2460 i Z 0–2000)", () => {
  const runs = findBaseRuns(parseCorpusS3d(side).elements);
  assert.deepEqual(runs.map((run) => [run.angle, run.a, run.width, run.front]), [[270, 0, 2000, 1900]]);
  const [worktop] = worktopInserts(runs, { overhang: 40 });
  assert.deepEqual([worktop!.position, worktop!.angle, worktop!.spec.width], [[1860, 820, 0], 270, 2000]);
  const bounds = corpusElementBoardBounds(parseCorpusE3d(kitchenInsertSource(worktop!)).elements[0]!)!;
  assert.deepEqual([bounds.minX, bounds.maxX, Math.round(bounds.minY), Math.round(bounds.maxY), bounds.minZ + 0, bounds.maxZ].map(Math.round), [1860, 2460, 820, 858, 0, 2000]);
});

test("zid pod 270°: cokla je uspravna daska uz prednju ivicu, duž zida kao niz", () => {
  const [plinth] = plinthInserts(findBaseRuns(parseCorpusS3d(side).elements));
  assert.deepEqual([plinth!.spec.width, plinth!.spec.height, plinth!.angle, plinth!.position], [2000, 95, 270, [1918, 0, 0]]);
  const bounds = corpusElementBoardBounds(parseCorpusE3d(kitchenInsertSource(plinth!)).elements[0]!)!;
  assert.deepEqual([bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, bounds.minZ, bounds.maxZ].map((value) => Math.round(value) + 0), [1900, 1918, 0, 95, 0, 2000]);
});

test("pod 180° i 90° nizovi se grade u svom koordinatnom sistemu i ne miješaju sa nizom pod 0°", () => {
  const mixed = `<PROJECTFILE VER="17">${cabinet("Naprijed", 0, 563, 600)}${cabinet("Nazad", 2000, 100, 600, 820, 180)}${cabinet("Lijevo", 100, 1000, 600, 820, 90)}</PROJECTFILE>`;
  const runs = findBaseRuns(parseCorpusS3d(mixed).elements);
  assert.deepEqual(runs.map((run) => run.angle).sort((p, q) => p - q), [0, 90, 180]);
  for (const worktop of worktopInserts(runs)) {
    const bounds = corpusElementBoardBounds(parseCorpusE3d(kitchenInsertSource(worktop)).elements[0]!)!;
    assert.ok(Math.abs((bounds.maxY - bounds.minY) - 38) < 0.01, "debljina ploče ostaje uvis");
  }
});

test("postojeća cokla i ploha se prepoznaju i preskaču, ostalo se dodaje", () => {
  const all = elements();
  const runs = findBaseRuns(all);
  // U fixture-u već postoje Cokla (18, širina 800) i Radna_Ploha (0, širina 838) uz prvi niz.
  const plinths = withoutExisting(plinthInserts(runs), all);
  assert.deepEqual([plinths.kept.map((insert) => insert.spec.width), plinths.skipped], [[407], 1]);
  const worktops = withoutExisting(worktopInserts(runs), all);
  assert.deepEqual([worktops.kept.map((insert) => insert.spec.width), worktops.skipped], [[407], 1]);
  assert.deepEqual(withoutExisting(plinthInserts(runs), []).skipped, 0);
});
