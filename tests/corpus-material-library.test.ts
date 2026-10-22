import assert from "node:assert/strict";
import test from "node:test";
import {
  createCorpusMaterialIndex, matchCorpusMaterial, parseCorpusMaterialCatalog,
  resolveCorpusMaterialPicturePath,
} from "../lib/corpus-material-library.ts";

const source = `VER=12\nMATCOUNT=2\nORDER=4\n<MAT>\nNAZIV=HDF\nMUID=abc\nPICFILE=HDF.jpg\nTEXX=2000\nTEXY=1500\nTEXZ=1000\nTIPMAT=0\nCUSTOM=a=b\n<ENDMAT>\n<MAT>\nNAZIV=W908_ST7\nMUID=def\nPICFILE=decor/W908.jpg\nTEXX=2500\n<ENDMAT>`;

test("parsira MatDat zapis i čuva nepoznata polja bez gubitka", () => {
  const catalog = parseCorpusMaterialCatalog(source, "LESOMAL/MatDat.MXC");
  assert.equal(catalog.version, "12");
  assert.equal(catalog.declaredCount, 2);
  assert.equal(catalog.order, 4);
  assert.equal(catalog.warnings.length, 0);
  assert.deepEqual(catalog.records[0], {
    name: "HDF", uid: "abc", pictureFile: "HDF.jpg", textureSize: [2000, 1500, 1000], materialType: 0,
    fields: { NAZIV: ["HDF"], MUID: ["abc"], PICFILE: ["HDF.jpg"], TEXX: ["2000"], TEXY: ["1500"], TEXZ: ["1000"], TIPMAT: ["0"], CUSTOM: ["a=b"] },
    sourceCatalog: "LESOMAL/MatDat.MXC", recordIndex: 0,
  });
});

test("UID ima prednost, a naziv ostaje slabiji i eksplicitno označen pogodak", () => {
  const index = createCorpusMaterialIndex([parseCorpusMaterialCatalog(source)]);
  assert.equal(matchCorpusMaterial(index, "ABC", "pogrešno").kind, "uid");
  assert.equal(matchCorpusMaterial(index, "", "w908_st7").kind, "name");
  assert.equal(matchCorpusMaterial(index, "missing", "missing").kind, "missing");
});

test("ne bira automatski dvosmislen UID", () => {
  const left = parseCorpusMaterialCatalog(`MATCOUNT=1\n<MAT>\nNAZIV=A\nMUID=same\nPICFILE=a.jpg\n<ENDMAT>`, "a/MatDat.MXC");
  const right = parseCorpusMaterialCatalog(`MATCOUNT=1\n<MAT>\nNAZIV=B\nMUID=same\nPICFILE=b.jpg\n<ENDMAT>`, "b/MatDat.MXC");
  assert.equal(matchCorpusMaterial(createCorpusMaterialIndex([left, right]), "same", "").kind, "uid-ambiguous");
});

test("sigurno razrješava sliku relativno prema katalogu", () => {
  assert.deepEqual(resolveCorpusMaterialPicturePath("LESOMAL/MatDat.MXC", "HDF.jpg"), { ok: true, relativePath: "LESOMAL/HDF.jpg" });
  assert.deepEqual(resolveCorpusMaterialPicturePath("a/b/MatDat.MXC", "../x.png"), { ok: true, relativePath: "a/x.png" });
  assert.equal(resolveCorpusMaterialPicturePath("MatDat.MXC", "../secret.jpg").ok, false);
  assert.equal(resolveCorpusMaterialPicturePath("MatDat.MXC", "C:\\secret.jpg").ok, false);
  assert.equal(resolveCorpusMaterialPicturePath("MatDat.MXC", "shader.exe").ok, false);
});

test("prijavljuje nepodudaranje deklarisanog broja", () => {
  assert.deepEqual(parseCorpusMaterialCatalog("MATCOUNT=2\n<MAT>\nNAZIV=A\nMUID=1\n<ENDMAT>").warnings, ["MATCOUNT=2, pronađeno zapisa=1"]);
});
