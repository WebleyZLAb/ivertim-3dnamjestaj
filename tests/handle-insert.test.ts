import assert from "node:assert/strict";
import test from "node:test";
import { findHandleFronts, handleInsert } from "../lib/handle-insert.ts";
import type { CorpusS3dElement } from "../lib/corpus-s3d.ts";

const front = { name: "Fronta_", height: 716, width: 600, thickness: 18, direction: 1, frontType: 1, position: [0, 0, -18] };
const element = (angle: number): CorpusS3dElement => ({ name: "Ormar", angle, position: [1000, 100, 2000], boards: [front] } as unknown as CorpusS3dElement);
const handle = { name: "Corpus_Handle_11", width: 144, height: 16, depth: 28 };

test("vodoravna ručkica na vratima tipa 1 pri uglu 0: uz desnu ivicu, od gornje, ispred fronte", () => {
  const insert = handleInsert({ element: element(0), front: { label: "F", board: front as never, offset: [0, 0, 0] }, handle, direction: "horizontal", offsetX: 50, offsetY: 30 });
  // lokalno X = 600 − 50 − 144 = 406, Y = 716 − 30 − 16 = 670, Z = −18 − 28 = −46; svijet: z = 2000 + (−46)(−1) = 2046
  assert.deepEqual(insert.position, [1406, 770, 2046]);
  assert.equal(insert.angle, 0);
  assert.deepEqual([insert.spec.width, insert.spec.height, insert.spec.depth, insert.spec.starterDirection], [144, 16, 28, 1]);
});

test("okomita ručkica: kvadar je zamijenjenih mjera i spušta se od Y naniže", () => {
  const insert = handleInsert({ element: element(0), front: { label: "F", board: front as never, offset: [0, 0, 0] }, handle, direction: "vertical", offsetX: 40, offsetY: 60 });
  assert.deepEqual([insert.spec.width, insert.spec.height], [16, 144]);
  // X = 600 − 40 − 16 = 544; vrh na 716 − 60 = 656, donja ivica 656 − 144 = 512
  assert.deepEqual(insert.position, [1544, 612, 2046]);
});

test("zakrenut element (90°): položaj se rotira oko položaja elementa, ugao se prenosi na ručku", () => {
  const insert = handleInsert({ element: element(90), front: { label: "F", board: front as never, offset: [0, 0, 0] }, handle, direction: "horizontal", offsetX: 50, offsetY: 30 });
  assert.equal(insert.angle, 90);
  // lokalno (X 406, Z −46): svijet x = 1000 + 406·cos90 + (−46)(−sin90) = 1046; z = 2000 + 406·(−sin90) + (−46)(−cos90) = 1594
  assert.deepEqual(insert.position, [1046, 770, 1594]);
});

test("neispravni ulazi se odbijaju", () => {
  assert.throws(() => handleInsert({ element: element(0), front: { label: "F", board: undefined as never, offset: [0, 0, 0] }, handle, direction: "horizontal", offsetX: 50, offsetY: 30 }));
  assert.throws(() => handleInsert({ element: element(33), front: { label: "F", board: front as never, offset: [0, 0, 0] }, handle, direction: "horizontal", offsetX: 50, offsetY: 30 }));
  assert.throws(() => handleInsert({ element: element(0), front: { label: "F", board: { ...front, direction: 2 } as never, offset: [0, 0, 0] }, handle, direction: "horizontal", offsetX: 50, offsetY: 30 }));
});

test("fronte u pod-elementima: pomaci se zbrajaju, zakrenuti pod-elementi se preskaču", () => {
  const child = { name: "Fronta", angle: 0, position: [0, 100, 0], boards: [front], children: [] };
  const turned = { name: "Okrenuta", angle: 90, position: [0, 0, 0], boards: [front], children: [] };
  const root = { name: "Ormar", angle: 0, position: [0, 0, 0], boards: [], children: [{ name: "Kutija", angle: 0, position: [10, 20, 30], boards: [], children: [child, turned] }] } as unknown as CorpusS3dElement;
  const fronts = findHandleFronts(root);
  assert.equal(fronts.length, 1);
  assert.deepEqual(fronts[0]!.offset, [10, 120, 30]);
  assert.equal(fronts[0]!.label, "Kutija / Fronta / Fronta_");
});
