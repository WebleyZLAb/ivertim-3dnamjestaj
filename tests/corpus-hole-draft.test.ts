import test from "node:test";
import assert from "node:assert/strict";
import { holeFromDraft, type CorpusHoleDraft } from "../lib/corpus-hole-draft.ts";
const draft: CorpusHoleDraft = { name: "Rupa", xExpression: "B/2", yExpression: "L-32", diameter: "5", depth: "8", plane: "1", angle: "90" };

test("ručno bušenje prihvata svih šest ploha i odbija nepostojeću ili praznu plohu", () => {
  for (let plane = 0; plane <= 5; plane++) {
    const result = holeFromDraft({ ...draft, plane: String(plane) }, null);
    assert.notEqual(typeof result, "string");
    if (typeof result !== "string") assert.equal(result.plane, plane);
  }
  for (const plane of ["", " ", "-1", "6", "1.5", "NaN", "Infinity"])
    assert.equal(holeFromDraft({ ...draft, plane }, null), "Ploha mora biti cijeli broj od 0 do 5.");
  for (const angle of ["", " ", "NaN", "Infinity"])
    assert.equal(holeFromDraft({ ...draft, angle }, null), "Upiši broj za ugao bušenja.");
});

test("izmjena rupe čuva RAS podatke i izraze bez dijeljenja promjenjivih objekata", () => {
  const previous = { sourceIndex: 2, groupType: "GRUPA14", name: "Stara", xExpression: "10", yExpression: "20", diameter: 5, depth: 8, plane: 1, angle: 90, machiningMode: 2, machining: { RAS: "izvorno" } };
  const result = holeFromDraft({ ...draft, plane: "5", angle: "0" }, previous);
  assert.notEqual(typeof result, "string");
  if (typeof result === "string") return;
  assert.equal(result.xExpression, "B/2"); assert.equal(result.yExpression, "L-32");
  assert.equal(result.plane, 5); assert.equal(result.angle, 0);
  assert.equal(result.sourceIndex, 2); assert.equal(result.machiningMode, 2); assert.deepEqual(result.machining, previous.machining);
  assert.notEqual(result.machining, previous.machining);
});
