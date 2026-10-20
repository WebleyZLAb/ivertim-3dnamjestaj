import assert from "node:assert/strict";
import test from "node:test";
import { corpusCmkDocumentFromDecodedPayloads, parseCorpusCmk } from "../lib/corpus-cmk.ts";

test("čita CMK sekcije, formule i redoslijed", () => {
  const document = parseCorpusCmk("[VARIJABLE]\r\nA=10\r\nB=IF(OBJ1.V>500;A+5;0)\r\n\r\n[JOINT]\r\nCONNECT=23\r\n");
  assert.deepEqual(document.sections.map(({ name }) => name), ["VARIJABLE", "JOINT"]);
  assert.equal(document.sections[0]?.entries[1]?.key, "B");
  assert.equal(document.sections[0]?.entries[1]?.syntaxSupported, true);
  assert.deepEqual(document.sections[0]?.entries[1]?.dependencies, ["OBJ1.V", "A"]);
  assert.deepEqual(document.unparsedLines, []);
});

test("čuva nepoznate CMK redove kao dokaz umjesto da ih odbaci", () => {
  const document = parseCorpusCmk("izvan sekcije\n[FORMULE]\nA=1\nčudan red");
  assert.deepEqual(document.unparsedLines, [
    { line: 1, content: "izvan sekcije" },
    { line: 4, content: "čudan red" },
  ]);
});

test("pretvara ponovljene ugrađene C6DAT sekcije u numerisani CMK model", () => {
  const document = corpusCmkDocumentFromDecodedPayloads({
    MSVA: ["A=10,B=20"],
    MSRA: ["GB=A,GN=PRVA", "GB=B,GN=DRUGA"],
    MSPO: ["PK1=A+B"],
    MSPI: ["GB=1"],
    MSMA: ["NAME=DRUGI_MAKRO"],
    MSGR: ["GB=2"],
    MSPOCK: ["X=5"],
  });
  assert.deepEqual(document.sections.map(({ name }) => name), ["VARIJABLE", "RASTER1", "RASTER2", "POTROSNI1", "PILA1", "MAKRO1", "GRUPA1", "MSPOCK1"]);
  assert.equal(document.sections[2]?.entries[1]?.value, "DRUGA");
});
