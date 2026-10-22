import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeCorpusAssignments,
  corpusExpressionDependencies,
  evaluateCorpusAssignments,
  evaluateCorpusExpression,
  isCorpusExpressionSyntaxSupported,
} from "../lib/corpus-expression.ts";

test("računa Corpus IF, poređenja i logičke operatore", () => {
  assert.equal(evaluateCorpusExpression("IF(B<=120 AND IZBOR=0;2;5)", { B: 100, IZBOR: 0 }), 2);
  assert.equal(evaluateCorpusExpression("IF(B<=120 AND IZBOR=0;2;5)", { B: 200, IZBOR: 0 }), 5);
  assert.equal(evaluateCorpusExpression("IF(OTVARANJE=0 OR OTVARANJE=1;100;22.5)", { OTVARANJE: 1 }), 100);
  assert.equal(evaluateCorpusExpression("IF(FALSE;NEPOZNATO;7)", {}), 7);
});

test("podržava tačkaste varijable i ograničene matematičke funkcije", () => {
  assert.equal(evaluateCorpusExpression("MAX(OBJ1.V/2;ABS(-30))", { "OBJ1.V": 100 }), 50);
  assert.equal(evaluateCorpusExpression("ROUND(2.6)", {}), 3);
});

test("odbija proizvoljan kod, nepoznate funkcije i dijeljenje nulom", () => {
  assert.equal(evaluateCorpusExpression("globalThis.alert(1)", {}), null);
  assert.equal(evaluateCorpusExpression("UNKNOWN_FN(1)", {}), null);
  assert.equal(evaluateCorpusExpression("10/0", {}), null);
  assert.equal(evaluateCorpusExpression("A+1", {}), null);
});

test("provjerava gramatiku nezavisno od vrijednosti varijabli", () => {
  assert.equal(isCorpusExpressionSyntaxSupported("IF(OBJ1.V<120;A+1;B/2)"), true);
  assert.equal(isCorpusExpressionSyntaxSupported("UNKNOWN_FN(A)"), false);
  assert.equal(isCorpusExpressionSyntaxSupported("A ? B : C"), false);
});

test("rješava lanac zavisnih dodjela i zadržava cikluse kao neriješene", () => {
  const result = evaluateCorpusAssignments([
    { name: "C", expression: "B*2" },
    { name: "B", expression: "A+5" },
    { name: "IZABRANO", expression: "IF(C>=30;TRUE;FALSE)" },
    { name: "X", expression: "Y+1" },
    { name: "Y", expression: "X+1" },
  ], { A: 10 });
  assert.equal(result.values.B, 15);
  assert.equal(result.values.C, 30);
  assert.equal(result.values.IZABRANO, true);
  assert.deepEqual(result.unresolved.map(({ name }) => name), ["X", "Y"]);
});

test("objašnjava razriješene, nedostajuće, ciklične i nepodržane dodjele", () => {
  const analysis = analyzeCorpusAssignments([
    { name: "B", expression: "A+5" },
    { name: "C", expression: "B*2" },
    { name: "NEDOSTAJE", expression: "SPOLJNA+1" },
    { name: "X", expression: "Y+1" },
    { name: "Y", expression: "X+1" },
    { name: "LOŠA", expression: "UNKNOWN_FN(1)" },
    { name: "NULA", expression: "10/0" },
  ], { A: 10 });

  assert.deepEqual(analysis.map(({ name, status, value }) => ({ name, status, value })), [
    { name: "B", status: "resolved", value: 15 },
    { name: "C", status: "resolved", value: 30 },
    { name: "NEDOSTAJE", status: "missing", value: null },
    { name: "X", status: "cycle", value: null },
    { name: "Y", status: "cycle", value: null },
    { name: "LOŠA", status: "invalid", value: null },
    { name: "NULA", status: "unresolved", value: null },
  ]);
  assert.deepEqual(analysis[2]!.missing, ["SPOLJNA"]);
  assert.deepEqual(corpusExpressionDependencies("IF(A>0;MAX(B;C);D)"), ["A", "B", "C", "D"]);
  assert.equal(corpusExpressionDependencies("A ? B : C"), null);
});

test("kratko grananje može razriješiti izraz iako neaktivna grana ima nepoznatu varijablu", () => {
  const [analysis] = analyzeCorpusAssignments([{ name: "A", expression: "IF(FALSE;NEPOZNATO;7)" }]);
  assert.equal(analysis!.status, "resolved");
  assert.equal(analysis!.value, 7);
  assert.deepEqual(analysis!.dependencies, ["NEPOZNATO"]);
});
