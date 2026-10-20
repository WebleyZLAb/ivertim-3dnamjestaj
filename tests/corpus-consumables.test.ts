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
