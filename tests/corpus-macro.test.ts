import assert from "node:assert/strict";
import test from "node:test";
import { analyzeCorpusMacroPayload, decodeCorpusText } from "../lib/corpus-macro.ts";

test("čuva slova iz UTF-8 i Windows-1250 Corpus payloadova", () => {
  assert.equal(decodeCorpusText(new TextEncoder().encode("Širina")), "Širina");
  assert.equal(decodeCorpusText(Uint8Array.from([0x8a, 0x69, 0x72, 0x69, 0x6e, 0x61])), "Širina");
});

test("izdvaja Corpus dodjele, zavisnosti i spoljne varijable", () => {
  const result = analyzeCorpusMacroPayload('A=10,"B=IF(OBJ1.V>500;A+5;0)",C=B*2');
  assert.deepEqual(result.assignments.map(({ name, syntaxSupported }) => ({ name, syntaxSupported })), [
    { name: "A", syntaxSupported: true },
    { name: "B", syntaxSupported: true },
    { name: "C", syntaxSupported: true },
  ]);
  assert.deepEqual(result.assignments[1]?.dependencies, ["OBJ1.V", "A"]);
  assert.deepEqual(result.externalVariables, ["OBJ1.V"]);
});

test("preskače komentare i označava tekstualne vrijednosti bez nagađanja", () => {
  const result = analyzeCorpusMacroPayload('"//=Cas.Minifix",J=0,NAME=Cas.Minifix 15/18,PK1=IF(SMJER=0;1;0)');
  assert.deepEqual(result.assignments.map(({ name }) => name), ["J", "NAME", "PK1"]);
  assert.equal(result.assignments[1]?.syntaxSupported, false);
  assert.deepEqual(result.externalVariables, ["SMJER"]);
});

test("ne dijeli zarez unutar funkcije ili navodnika", () => {
  const result = analyzeCorpusMacroPayload('"A=MAX(1,2)","B=IF(TRUE;3;4)"');
  assert.equal(result.assignments.length, 2);
});
