import assert from "node:assert/strict";
import test from "node:test";
import { corpusSafeDownloadFileName, corpusSafeFileStem } from "../lib/corpus-file-name.ts";

test("čuva čitljiv Unicode naziv i uklanja Windows zabranjene znakove", () => {
  assert.equal(corpusSafeFileStem("  Čelić / kuhinja: 1  "), "Čelić---kuhinja--1");
  assert.equal(corpusSafeDownloadFileName("Čelić / kuhinja: 1-KROJNA.csv"), "Čelić---kuhinja--1-KROJNA.csv");
});

test("izbjegava rezervisana Windows imena i završne tačke", () => {
  assert.equal(corpusSafeFileStem("CON"), "IVERTIM-CON");
  assert.equal(corpusSafeDownloadFileName("LPT1.S3D"), "IVERTIM-LPT1.S3D");
  assert.equal(corpusSafeFileStem("ormar...   "), "ormar");
});

test("ograničava dužinu stabla i čuva kontrolisanu ekstenziju", () => {
  const result = corpusSafeDownloadFileName(`${"a".repeat(200)}.ivertim-corpus.json`);
  assert.equal([...result.slice(0, result.lastIndexOf("."))].length, 120);
  assert.equal(result.endsWith(".json"), true);
});
