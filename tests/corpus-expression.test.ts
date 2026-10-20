import assert from "node:assert/strict";
import test from "node:test";
import {
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
