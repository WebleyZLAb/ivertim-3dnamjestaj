import test from "node:test";
import assert from "node:assert/strict";
import { beginCorpusEditorSession, acceptCorpusEditorSession, type CorpusEditorSnapshot } from "../lib/corpus-editor-session.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";
import { updateCorpusBoard, updateCorpusBoardHoles } from "../lib/corpus-model.ts";
import { DEMO_S3D } from "../src/demo-project.ts";

function fixture() {
  const inspection = parseCorpusS3d(DEMO_S3D);
  return { inspection, importedE3dSources: [], standaloneE3dSource: null, history: [] as readonly CorpusEditorSnapshot[], future: [] as readonly CorpusEditorSnapshot[], dirty: false };
}

test('geometrija i bušenje prihvaćeni u editoru vraćaju se zajedno jednim Undo snimkom', () => {
  const before = fixture();
  const local = beginCorpusEditorSession(before);
  const original = before.inspection.elements[0]!;
  const board = original.boards[2]!;
  assert.ok(board.holes.length > 0);
  const moved = updateCorpusBoard(local.inspection.elements, original, 2, { ...board, position: [18, 150, 0] });
  const drilled = updateCorpusBoardHoles(moved.elements, moved.updatedElement!, 2, []);
  const current = { ...local, inspection: { ...local.inspection, elements: drilled.elements }, dirty: true };
  const accepted = acceptCorpusEditorSession(before, current);
  assert.equal(accepted.history.length, 1);
  assert.equal(accepted.history[0]!.inspection, before.inspection);
  assert.deepEqual(accepted.history[0]!.inspection.elements[0]!.boards[2], board);
  assert.deepEqual(accepted.inspection.elements[0]!.boards[2]!.position, [18, 150, 0]);
  assert.deepEqual(accepted.inspection.elements[0]!.boards[2]!.holes, []);
  assert.equal(accepted.history[0]!.standaloneE3dSource, before.standaloneE3dSource);
});

test('prazan editor i sve poništene izmjene čuvaju raniji Undo/Redo i dirty stanje', () => {
  const base = fixture();
  const snapshot: CorpusEditorSnapshot = { inspection: base.inspection, importedE3dSources: [], standaloneE3dSource: null };
  const before = { ...base, history: [snapshot], future: [snapshot], dirty: true };
  const local = beginCorpusEditorSession(before);
  assert.equal(local.history.length, 0);
  assert.equal(local.future.length, 0);
  const accepted = acceptCorpusEditorSession(before, { ...local, dirty: false });
  assert.equal(accepted.history, before.history);
  assert.equal(accepted.future, before.future);
  assert.equal(accepted.dirty, true);
});

test('lokalni Undo počinje od nule i pri 100 ranijih radnji; prihvatanje zadržava posljednjih 100', () => {
  const base = fixture();
  const snapshot: CorpusEditorSnapshot = { inspection: base.inspection, importedE3dSources: [], standaloneE3dSource: null };
  const before = { ...base, history: Array.from({ length: 100 }, () => snapshot) };
  const local = beginCorpusEditorSession(before);
  assert.equal(local.history.length, 0);
  const accepted = acceptCorpusEditorSession(before, { ...local, inspection: { ...local.inspection } });
  assert.equal(accepted.history.length, 100);
  assert.equal(accepted.history.at(-1)!.inspection, before.inspection);
  assert.equal(before.history.length, 100);
});
