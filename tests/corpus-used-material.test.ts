import assert from "node:assert/strict";
import test from "node:test";
import { buildCorpusUsedMaterial } from "../lib/corpus-used-material.ts";
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

test("rubna traka se računa po stranama: 0 i 2 duž visine, 1 i 3 duž širine", () => {
  const edges = buildCorpusUsedMaterial(parseCorpusS3d(xml).elements).edges;
  assert.equal(edges.length, 1);
  assert.deepEqual([edges[0]!.boardMaterialName, edges[0]!.edgeName, edges[0]!.length], ["Bijela", "1mm", 1.2]);
});

test("okovi su iz iste potrošnje kao i krojna lista, a naziv materijala može doći iz kataloga", () => {
  const result = buildCorpusUsedMaterial(parseCorpusS3d(xml).elements, (uid, name) => uid === "W1" ? "W908_ST7" : name);
  assert.deepEqual(result.fittings.map((item) => [item.name, item.quantity]), [["KONFIRMAT", 12]]);
  assert.deepEqual(result.materials.map((group) => group.materialName), ["HDF", "W908_ST7"]);
});
