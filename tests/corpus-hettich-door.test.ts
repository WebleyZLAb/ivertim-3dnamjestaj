import assert from "node:assert/strict";
import test from "node:test";
import { corpusElementHettichBores, hettichDoorBores, hettichHingePositions } from "../lib/corpus-hettich-door.ts";

// Stvarna vrata iz Corpusovih programa (projekat Siniša Buić - Ormari); varijable elementa kao u S3D-u.
const base = { BR_SARKI: "0", BR_SA: "3", PRO_SAR: "0", TIP_PLOCICE: "1", S_O: "0", SARKA_1: "0", SARKA_2: "0", SARKA_3: "0", SARKA_4: "0", SARKA_5: "0" };
const cups = (bores: { x: number; y: number; diameter: number }[] | null) => bores?.filter((b) => b.diameter === 35).map((b) => [b.x, b.y]);

test("vrata 286 × 256, tip 2, pomaci šarki −50 i 50: čašice (50; 234,5) i (236; 234,5) kao u programu", () => {
  const bores = hettichDoorBores({ height: 286, width: 256, frontType: 2, variables: { ...base, S_O: "1", SARKA_1: "-50", SARKA_2: "50" } });
  assert.deepEqual(cups(bores), [[50, 234.5], [236, 234.5]]);
  assert.deepEqual(bores!.filter((b) => b.diameter === 3).map((b) => [b.x, b.y, b.depth]), [[24, 229, 3], [76, 229, 3], [210, 229, 3], [262, 229, 3]]);
});

test("tip 1 stavlja čašice na 21,5 od ivice; bez oscilacije su šarke na 100 od krajeva", () => {
  assert.deepEqual(cups(hettichDoorBores({ height: 348, width: 274, frontType: 1, variables: base })), [[100, 21.5], [248, 21.5]]);
});

test("vrata visine 2326 imaju pet šarki u redoslijedu makroa (prva, druga, treća, četvrta, peta)", () => {
  assert.deepEqual(hettichHingePositions(2326, { ...base, S_O: "1", SARKA_3: "100" }), [100, 2226, 1263, 631.5, 1694.5]);
  assert.deepEqual(hettichHingePositions(2326, { ...base, S_O: "1", SARKA_2: "150", SARKA_3: "220" }), [100, 2226, 1383, 781.5, 1694.5]);
  const bores = hettichDoorBores({ height: 2326, width: 404, frontType: 2, variables: { ...base, S_O: "1", SARKA_3: "100" } })!;
  assert.equal(bores.length, 15);
  assert.deepEqual(cups(bores)!.map(([x]) => x), [100, 2226, 1263, 631.5, 1694.5]);
});

test("fiksan broj šarki (BR_SARKI = 1) i nepodržane konfiguracije", () => {
  assert.equal(hettichHingePositions(800, { ...base, BR_SARKI: "1", BR_SA: "4" })!.length, 4);
  assert.equal(hettichDoorBores({ height: 286, width: 256, frontType: 3, variables: base }), null);
  assert.equal(hettichDoorBores({ height: 286, width: 256, frontType: 1, variables: { ...base, PRO_SAR: "1" } }), null);
  assert.equal(hettichDoorBores({ height: 200, width: 256, frontType: 1, variables: base }), null);
});

test("corpusElementHettichBores traži makro vezan na tu ploču", () => {
  const element = { boards: [{ height: 286, width: 256, frontType: 1 }, { height: 100, width: 100, frontType: 0 }], macroLinks: [{ name: "MAKRO HETTICH", object1: 0 }], variables: base };
  assert.ok(corpusElementHettichBores(element, 0));
  assert.equal(corpusElementHettichBores(element, 1), null);
  assert.equal(corpusElementHettichBores({ ...element, macroLinks: [] }, 0), null);
});
