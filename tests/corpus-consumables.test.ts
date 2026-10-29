import assert from "node:assert/strict";
import test from "node:test";
import { buildCorpusConsumablesList, corpusConsumablesCsv } from "../lib/corpus-consumables.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

const xml = `<PROJECTFILE VER="17"><ELEMENT ENAME="Korpus"><POTROSNI><POTITEM TIP="1" KOMADA="4" NAZIV="KONFIRMAT" OZN="CONF" UID="u1"/><POTITEM TIP="1" KOMADA="6" NAZIV="KONFIRMAT" OZN="CONF" UID="u1"/></POTROSNI><DASKE><AD DNAME="Bok"><POTROSNI><POTITEM TIP="0" NAZIV="1mm" MATN="K007" MUID="K007" UID="edge" STR0="true" STR1="false" STR2="true" STR3="false"/><POTITEM TIP="0" NAZIV="1mm" MATN="K007" MUID="K007" UID="edge" STR0="false" STR1="true" STR2="false" STR3="false"/></POTROSNI></AD></DASKE></ELEMENT></PROJECTFILE>`;

test("sabira deklarisane KOMADA količine okova", () => {
  const items = buildCorpusConsumablesList(parseCorpusS3d(xml).elements);
  const hardware = items.find(({ type }) => type === "1")!;
  assert.equal(hardware.quantity, 10);
  assert.equal(hardware.occurrences, 2);
  assert.equal(hardware.declaredQuantityOccurrences, 2);
  assert.deepEqual(hardware.sources, ["Korpus"]);
});

test("čuva STR0-STR3 primjene bez nagađanja dužine rubne trake", () => {
  const edge = buildCorpusConsumablesList(parseCorpusS3d(xml).elements).find(({ type }) => type === "0")!;
  assert.equal(edge.quantity, 2);
  assert.deepEqual(edge.sideApplications, [1, 1, 1, 0]);
  assert.deepEqual(edge.sources, ["Korpus: Bok"]);
});

test("izvozi potrošni materijal kao UTF-8 CSV", () => {
  const csv = corpusConsumablesCsv(buildCorpusConsumablesList(parseCorpusS3d(xml).elements));
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /KONFIRMAT;CONF/);
  assert.match(csv, /1mm;;K007/);
});


test("skriveni elementi, potomci i ploče izostavljaju svoje okove i trake iz potrošnje i CSV-a", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><ELEMENT ENAME="Vidljiv"><POTROSNI><POTITEM TIP="1" NAZIV="Aktivan" KOMADA="2"/></POTROSNI><DASKE><AD DNAME="Skrivena" VISIBLE="false"><POTROSNI><POTITEM TIP="0" NAZIV="Skrivena traka" KOMADA="4"/></POTROSNI></AD></DASKE><ELMLIST><ELM ENAME="Skriven" EVISIBLE="false"><POTROSNI><POTITEM TIP="1" NAZIV="Skriven okov"/></POTROSNI><ELMLIST><ELM ENAME="Potomak" EVISIBLE="true"><POTROSNI><POTITEM TIP="1" NAZIV="Okov potomka"/></POTROSNI></ELM></ELMLIST></ELM></ELMLIST></ELEMENT></PROJECTFILE>`);
  const before = JSON.stringify(project);
  const items = buildCorpusConsumablesList(project.elements);
  assert.deepEqual(items.map(item => [item.name,item.quantity]), [["Aktivan",2]]);
  assert.doesNotMatch(corpusConsumablesCsv(items), /Skrivena traka|Skriven okov|Okov potomka/);
  assert.equal(buildCorpusConsumablesList(project.elements,{includeHidden:true}).length,4);
  assert.equal(JSON.stringify(project),before);
});
