import assert from "node:assert/strict";
import test from "node:test";
import { readCorpusMdrl } from "../lib/corpus-mdrl.ts";

// Stvarni Corpusov fajl Modeli/Blum/173H7100.mdrl (390 bajta): pločica šarke, dvije rupe Ø5 dubine 1 na ±16 mm.
const BLUM_PLOCICA = "07054333444d4401020006046333646d0108070358595a010200060378797a0000000000000000000000000000000000070358595a010200060378797a00000000000000000000803f0000803f00070358595a010200060378797a000000000000803f000000000000803f0000060464726c6c070444524c4301020006046c6973740107044f444c4f01020006046f7267700200060464726c6f070464726c6f01020006036e616d0607506c6f636963610604646469720204060472616e670f000000000603706f730700010200060378797a0000000000000000000000000000803f000605726c697374010706534472696c6c0102000603737275010f0000a0400f0000803f02000700010200060378797a000000006f1283bc000000000000803f000006036b6f6e08060370726f08000706534472696c6c0102000603737275010f0000a0400f0000803f02000700010200060378797a000000006f12833c000000000000803f000006036b6f6e08060370726f0800000000000006046f726770020000";
const bytes = () => Uint8Array.from(BLUM_PLOCICA.match(/../g)!.map((pair) => parseInt(pair, 16)));

test("MDRL: grupa Plocica s dvije rupe Ø5 na razmaku 32 mm (stvarni Blumov fajl)", () => {
  const doc = readCorpusMdrl(bytes());
  assert.equal(doc.drillCount, 2);
  assert.equal(doc.groups.length, 1);
  assert.equal(doc.groups[0]!.name, "Plocica");
  assert.deepEqual(doc.groups[0]!.origin, [0, 0, 0]);
  assert.deepEqual(doc.groups[0]!.drills.map((drill) => [drill.diameter, drill.depth, drill.x, drill.y, drill.z]), [[5, 1, 0, -16, 0], [5, 1, 0, 16, 0]]);
});

test("MDRL: fajl koji nije C3DMD se odbija", () => {
  assert.throws(() => readCorpusMdrl(new Uint8Array(32)));
  assert.throws(() => readCorpusMdrl(new Uint8Array([1, 2, 3])));
});
