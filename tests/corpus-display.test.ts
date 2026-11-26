import assert from "node:assert/strict";
import test from "node:test";
import { corpusDisplayCode } from "../lib/corpus-board-export.ts";
import { humanizeCorpusLabel } from "../lib/corpus-variable-definitions.ts";

test("šifra elementa za prikaz: %NE% postaje naziv, šifra bez makroa ostaje", () => {
  assert.equal(corpusDisplayCode({ name: "Podni", code: "%NE%" }), "Podni");
  assert.equal(corpusDisplayCode({ name: "Podni", code: "DONJI_1V" }), "DONJI_1V");
  assert.equal(corpusDisplayCode({ name: "Podni", code: "" }), "");
});

test("čitljivi nazivi varijabli i izbora: VELIKA SLOVA postaju rečenica, ostalo ostaje", () => {
  assert.equal(humanizeCorpusLabel("VIDLJIVOST_NOGICA"), "Vidljivost nogica");
  assert.equal(humanizeCorpusLabel("DA"), "Da");
  assert.equal(humanizeCorpusLabel("KONFIRMAT+TIPL"), "Konfirmat+tipl");
  assert.equal(humanizeCorpusLabel("Ivertim proba"), "Ivertim proba");
  assert.equal(humanizeCorpusLabel("10"), "10");
});
