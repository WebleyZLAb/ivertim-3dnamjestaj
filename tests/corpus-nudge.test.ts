import assert from "node:assert/strict";
import test from "node:test";
import { corpusKeyboardRotation, corpusModelingSelectionScope, corpusModelingShortcut, corpusNormalizedAngle, corpusNudgeDelta } from "../lib/corpus-nudge.ts";

test("pretvara strelice i PageUp/PageDown u 3D korak od 10 mm", () => {
  assert.deepEqual(corpusNudgeDelta("ArrowLeft"), [-10, 0, 0]);
  assert.deepEqual(corpusNudgeDelta("ArrowRight"), [10, 0, 0]);
  assert.deepEqual(corpusNudgeDelta("ArrowUp"), [0, 0, -10]);
  assert.deepEqual(corpusNudgeDelta("ArrowDown"), [0, 0, 10]);
  assert.deepEqual(corpusNudgeDelta("PageUp"), [0, 10, 0]);
  assert.deepEqual(corpusNudgeDelta("PageDown"), [0, -10, 0]);
});

test("Shift koristi fini korak od 1 mm i druge tipke ne mijenjaju model", () => {
  assert.deepEqual(corpusNudgeDelta("ArrowRight", true), [1, 0, 0]);
  assert.deepEqual(corpusNudgeDelta("PageDown", true), [0, -1, 0]);
  assert.equal(corpusNudgeDelta("Enter"), null);
});

test("Q i E daju grubu ili finu normalizovanu rotaciju", () => {
  assert.equal(corpusKeyboardRotation("q"), -90);
  assert.equal(corpusKeyboardRotation("E"), 90);
  assert.equal(corpusKeyboardRotation("q", true), -1);
  assert.equal(corpusKeyboardRotation("e", true), 1);
  assert.equal(corpusKeyboardRotation("r"), null);
  assert.equal(corpusNormalizedAngle(450), 90);
  assert.equal(corpusNormalizedAngle(-360), 0);
});

test("prepoznaje samo svjesno kopiranje i uklanjanje modela", () => {
  const event = (key: string, patch = {}) => ({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, repeat: false, ...patch });
  assert.equal(corpusModelingShortcut(event("d", { ctrlKey: true })), "duplicate");
  assert.equal(corpusModelingShortcut(event("D", { metaKey: true })), "duplicate");
  assert.equal(corpusModelingShortcut(event("Delete")), "remove");
  assert.equal(corpusModelingShortcut(event("Backspace")), "remove");
  assert.equal(corpusModelingShortcut(event("d", { ctrlKey: true, repeat: true })), null);
  assert.equal(corpusModelingShortcut(event("Delete", { shiftKey: true })), null);
  assert.equal(corpusModelingShortcut(event("d")), null);
});

test("grupa ploča uvijek ima prednost nad grupom i pojedinačnim elementom", () => {
  assert.equal(corpusModelingSelectionScope(2, true, 3, true), "board-group");
  assert.equal(corpusModelingSelectionScope(1, false, 3, true), "board");
  assert.equal(corpusModelingSelectionScope(0, true, 3, true), "board");
  assert.equal(corpusModelingSelectionScope(0, false, 3, true), "element-group");
  assert.equal(corpusModelingSelectionScope(0, false, 1, true), "element");
  assert.equal(corpusModelingSelectionScope(0, false, 0, false), null);
});
