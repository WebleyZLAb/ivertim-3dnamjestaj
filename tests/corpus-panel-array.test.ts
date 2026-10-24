import test from "node:test";
import assert from "node:assert/strict";
import { corpusPanelArray, type CorpusPanelArraySpec } from "../lib/corpus-panel-array.ts";
import { generateCorpusCabinetE3d } from "../lib/corpus-generator.ts";
import { appendCorpusE3dBoard, writeCorpusE3dGeometryCopy } from "../lib/corpus-s3d-writer.ts";
import { parseCorpusE3d } from "../lib/corpus-s3d.ts";
import { buildCorpusCutList } from "../lib/corpus-cutlist.ts";

const spec: CorpusPanelArraySpec = { kind: 'shelves', count: 4, thickness: 18, frontInset: 20, opening: { x: 18, y: 18, z: 0, width: 782, height: 684, depth: 320 } };

test('četiri police imaju jednake čiste razmake i uvlačenje u Corpus Z smjeru', () => {
  const boards = corpusPanelArray(spec);
  const gap = (684 - 4 * 18) / 5;
  for (let index = 0; index < boards.length; index += 1) {
    const board = boards[index]!;
    const before = index === 0 ? 18 : boards[index - 1]!.position[1] + 18;
    assert.ok(Math.abs(board.position[1] - before - gap) < .001);
    assert.equal(board.position[2], -20);
    assert.equal(board.height, 782);
    assert.equal(board.width, 300);
    assert.equal(board.direction, 2);
  }
  assert.ok(Math.abs(702 - (boards.at(-1)!.position[1] + 18) - gap) < .001);
});

test('pojedinačne pozicije 140/280/420/560 i pregrade koriste odgovarajuće lokalne ose', () => {
  const shelves = corpusPanelArray({ ...spec, offsets: [140, 280, 420, 560] });
  assert.deepEqual(shelves.map(board => board.position[1]), [158, 298, 438, 578]);
  const dividers = corpusPanelArray({ ...spec, kind: 'dividers', count: 2, offsets: [200, 500] });
  assert.deepEqual(dividers.map(board => board.position), [[218, 18, -20], [518, 18, -20]]);
  assert.equal(dividers[0]!.direction, 0);
  assert.equal(dividers[0]!.height, 684);
});

test('raspored odbija preklapanje, položaje van otvora i nepotpune ili prevelike unose', () => {
  for (const invalid of [
    { count: 0 }, { count: 51 }, { count: 1.5 }, { thickness: 200 }, { frontInset: -1 },
    { frontInset: 320 }, { offsets: [10, 20, 100, 200] }, { offsets: [0, 100, 200, 680] },
    { offsets: [10] }, { thickness: Number.NaN }, { opening: { ...spec.opening, width: Number.POSITIVE_INFINITY } },
  ]) assert.throws(() => corpusPanelArray({ ...spec, ...invalid }));
});

test('dodane police prolaze E3D izvoz i ponovno učitavanje sa krojnom listom i očuvanim izvornim pločama', () => {
  const generated = generateCorpusCabinetE3d({ name: 'Test 818', code: 'TEST', width: 818, height: 720, depth: 320, thickness: 18, shelfCount: 0, includeBack: true, materialName: 'Iveral', color: 0xd8d1c1 });
  const original = parseCorpusE3d(generated.sourceXml).elements[0]!;
  let expanded = generated.sourceXml;
  for (const board of corpusPanelArray(spec, original.boards[0])) expanded = appendCorpusE3dBoard(expanded, board);
  const current = parseCorpusE3d(expanded).elements[0]!;
  assert.equal(current.boards.length, original.boards.length + 4);
  assert.deepEqual(current.boards.slice(0, original.boards.length), original.boards);
  const exported = writeCorpusE3dGeometryCopy(expanded, [current], [current]);
  const reloaded = parseCorpusE3d(exported).elements[0]!;
  assert.deepEqual(reloaded.boards, current.boards);
  const shelves = reloaded.boards.filter(board => board.name.startsWith('Polica'));
  assert.equal(shelves.length, 4);
  assert.ok(shelves.every(board => board.materialName === 'Iveral' && board.visible === true));
  assert.equal(buildCorpusCutList([reloaded]).skippedBoards, 0);
});
