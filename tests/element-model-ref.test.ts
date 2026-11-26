import assert from "node:assert/strict";
import test from "node:test";
import { elementModelRef, withElementModelRef } from "../lib/element-model-ref.ts";
import { parseCorpusE3d } from "../lib/corpus-s3d.ts";
import { generateCorpusElementE3d } from "../lib/corpus-element-generator.ts";

test("putanja modela se čita iz opisa; neispravne putanje se odbijaju", () => {
  assert.equal(elementModelRef("ivertim-model=Handles/100_66_043.dae"), "Handles/100_66_043.dae");
  assert.equal(elementModelRef("ivertim-model=Handles\\a b.dae"), "Handles/a b.dae");
  assert.equal(elementModelRef("obični opis"), null);
  assert.equal(elementModelRef("ivertim-model=../tajna.dae"), null);
  assert.equal(elementModelRef("ivertim-model=Handles/a.exe"), null);
  assert.equal(elementModelRef(undefined), null);
});

test("upis modela u E3D izvor: opis se čita nazad kroz parser, a ploče ostaju", () => {
  const generated = generateCorpusElementE3d({ name: "Rucka_test", code: "", className: "TElement", width: 144, height: 16, depth: 28, starterDirection: 1, starterBoardName: "Rucka", thickness: 28, materialName: "Metal", materialUid: "", color: 0xb0b0b0 });
  const xml = withElementModelRef(generated.sourceXml, "Handles/100_66_043.dae");
  const element = parseCorpusE3d(xml).elements[0]!;
  assert.equal(elementModelRef(element.description), "Handles/100_66_043.dae");
  assert.equal(element.boards.length, 1);
  // ponovni upis zamjenjuje, ne dupla atribut
  const again = withElementModelRef(xml, "Handles/101_13_084.dae");
  assert.equal((again.match(/EOPIS=/g) ?? []).length, 1);
  assert.equal(elementModelRef(parseCorpusE3d(again).elements[0]!.description), "Handles/101_13_084.dae");
  assert.throws(() => withElementModelRef(xml, "../x.dae"));
});
