import assert from "node:assert/strict";
import test from "node:test";
import { buildCorpusUsedByElement, buildCorpusUsedMaterial } from "../lib/corpus-used-material.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

const edge = (sides: string) => `<POTITEM TIP="0" NAZIV="1mm" MATN="K007" MUID="K007" UID="e1" ${sides}/>`;
const xml = `<PROJECTFILE VER="17">
<ELEMENT ENAME="Korpus"><DASKE>
<AD DNAME="Bok" VISINA="700" DUBINA="500" DEBLJINA="18" MATNAME="Bijela" MATUID="W1"><POTROSNI>${edge('STR0="true" STR1="true" STR2="false" STR3="false"')}</POTROSNI></AD>
<AD DNAME="Pod" VISINA="800" DUBINA="500" DEBLJINA="18" MATNAME="Bijela" MATUID="W1"/>
<AD DNAME="Skrivena" VISINA="100" DUBINA="100" DEBLJINA="18" MATNAME="Bijela" MATUID="W1" VISIBLE="false"/>
<AD DNAME="Noga" VISINA="100" DUBINA="100" DEBLJINA="18" MATNAME="Bijela" MATUID="W1" TIPFRONTE="5"/>
<AD DNAME="Uložak" VISINA="100" DUBINA="100" DEBLJINA="4" MATNAME="Bijela" MATUID="W1" TIPFRONTE="8"/>
<AD DNAME="Profil" VISINA="100" DUBINA="100" DEBLJINA="0" MATNAME="Alu" MATUID="A1"/>
<AD DNAME="Leđa" VISINA="700" DUBINA="800" DEBLJINA="3" MATNAME="HDF" MATUID="H1"/>
</DASKE><POTROSNI><POTITEM TIP="1" KOMADA="12" NAZIV="KONFIRMAT" OZN="CONF" UID="u1"/></POTROSNI></ELEMENT>
<ELEMENT ENAME="Skriven" EVISIBLE="false"><DASKE><AD DNAME="Bok" VISINA="1000" DUBINA="1000" DEBLJINA="18" MATNAME="Bijela" MATUID="W1"/></DASKE></ELEMENT>
</PROJECTFILE>`;

test("popis materijala izostavlja skrivene, pomoćne, nepoznate i ploče debljine 0", () => {
  const result = buildCorpusUsedMaterial(parseCorpusS3d(xml).elements);
  assert.deepEqual(result.materials.map((group) => [group.materialName, group.thickness, group.rows.length, group.area]), [
    ["Bijela", 18, 2, 0.35 + 0.4],
    ["HDF", 3, 1, 0.56],
  ]);
  assert.equal(result.totalArea, 1.31);
});

test("redovi ostaju po jednoj ploči i čuvaju element i naziv ploče", () => {
  const rows = buildCorpusUsedMaterial(parseCorpusS3d(xml).elements).materials.find((group) => group.materialName === "Bijela")!.rows;
  assert.deepEqual(rows.map((row) => [row.element, row.board, row.height, row.width, row.area]), [
    ["Korpus", "Bok", 700, 500, 0.35],
    ["Korpus", "Pod", 800, 500, 0.4],
  ]);
});

test("rubna traka: STR0 i STR1 duž širine, STR2 i STR3 duž visine, plus 80 mm po strani; red je dekor trake i debljina ploče", () => {
  const edges = buildCorpusUsedMaterial(parseCorpusS3d(xml).elements).edges;
  assert.equal(edges.length, 1);
  assert.deepEqual([edges[0]!.edgeName, edges[0]!.boardThickness, edges[0]!.length], ["1mm", 18, 1.16]);
});

test("okovi su iz iste potrošnje kao i krojna lista, a naziv materijala može doći iz kataloga", () => {
  const result = buildCorpusUsedMaterial(parseCorpusS3d(xml).elements, (uid, name) => uid === "W1" ? "W908_ST7" : name);
  assert.deepEqual(result.fittings.map((item) => [item.name, item.quantity]), [["KONFIRMAT", 12]]);
  assert.deepEqual(result.materials.map((group) => group.materialName), ["HDF", "W908_ST7"]);
});

test("cijene: ploče po m² uz debljinu, trake po metru, okovi po komadu; zbir kao u Corpusu", () => {
  const result = buildCorpusUsedMaterial(parseCorpusS3d(xml).elements, undefined, undefined, {
    material: (uid, _name, thickness) => uid === "W1" && thickness === 18 ? 10 : null,
    edge: () => 2,
    fitting: (uid) => uid === "u1" ? 0.05 : null,
  });
  const white = result.materials.find((group) => group.materialName === "Bijela")!;
  assert.deepEqual([white.price, white.cost], [10, 7.5]);
  assert.deepEqual(result.materials.find((group) => group.materialName === "HDF")!.price, null);
  assert.deepEqual([result.edges[0]!.price, result.edges[0]!.cost], [2, 2.32]);
  assert.deepEqual([result.fittings[0]!.price, result.fittings[0]!.cost], [0.05, 0.6]);
  assert.deepEqual(result.totals, { boards: 7.5, edges: 2.32, other: 0.6, total: 10.42 });
});

test("potrošnja po elementima: korijenski elementi, ista pravila uključivanja, iznos po materijalu", () => {
  const byElement = buildCorpusUsedByElement(parseCorpusS3d(xml).elements, undefined, { material: (uid, _name, thickness) => uid === "W1" && thickness === 18 ? 10 : null });
  assert.equal(byElement.length, 1, "skriveni korijenski element se izostavlja");
  const [korpus] = byElement;
  assert.deepEqual([korpus!.name, korpus!.code, korpus!.boards, korpus!.area, korpus!.cost], ["Korpus", "", 3, 1.31, 7.5]);
  assert.deepEqual(korpus!.materials.map((item) => [item.materialName, item.thickness, item.boards, item.area, item.cost]), [["Bijela", 18, 2, 0.75, 7.5], ["HDF", 3, 1, 0.56, 0]]);
});

import { applyUsedMaterialMargins, NO_MARGINS } from "../lib/corpus-used-material.ts";

test("marže: osnovni procenat po kategoriji, bez njih zbir ostaje isti, a onemogućavanje ih ignoriše", () => {
  const totals = { boards: 34.48, edges: 0, other: 13.43 };
  assert.deepEqual(applyUsedMaterialMargins(totals, NO_MARGINS), { ...totals, total: 47.91 });
  assert.deepEqual(applyUsedMaterialMargins(totals, { disabled: false, boards: 10, edges: 5, other: 20 }), { boards: 37.93, edges: 0, other: 16.12, total: 54.05 });
  assert.equal(applyUsedMaterialMargins(totals, { disabled: true, boards: 10, edges: 5, other: 20 }).total, 47.91);
});
