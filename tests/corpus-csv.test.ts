import assert from "node:assert/strict";
import test from "node:test";
import { corpusCsvCell, corpusCsvText } from "../lib/corpus-csv.ts";

test("označava Excel formule i poslije vodećeg whitespacea kao tekst", () => {
  for (const value of ["=SUM(1;2)", "+CMD", "-2+3", "@IMPORT", "\t=SUM(1)", "\r\n@X"]) {
    assert.equal(corpusCsvText(value), `'${value}`);
  }
  assert.equal(corpusCsvText("Običan - naziv"), "Običan - naziv");
});

test("CSV ćelija escapeuje delimiter, navodnike i nove redove", () => {
  assert.equal(corpusCsvCell(`a;"b"\nc`), `"a;""b""\nc"`);
  assert.equal(corpusCsvCell("obično"), "obično");
});
