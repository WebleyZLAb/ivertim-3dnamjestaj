import assert from "node:assert/strict";
import test from "node:test";
import { createCorpusWorkingCopyFile } from "../lib/corpus-model.ts";
import { createCorpusRecoverySnapshot, parseCorpusRecoverySnapshot } from "../lib/corpus-recovery.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

const xml = `<PROJECTFILE VER="17"><SOBA SIRINA="4000" DUZINA="4000"/><ELEMENT ENAME="E"><DASKE/></ELEMENT></PROJECTFILE>`;

test("pravi i provjerava lokalni paket oporavka bez mijenjanja izvornog XML-a", () => {
  const project = parseCorpusS3d(xml);
  const workingCopy = createCorpusWorkingCopyFile("kuhinja.S3D", project.elements, project.elements, "2026-10-22T07:00:00.000Z");
  const snapshot = createCorpusRecoverySnapshot("kuhinja.S3D", xml.length, xml, workingCopy, "2026-10-22T07:01:00.000Z");
  assert.equal(parseCorpusRecoverySnapshot(structuredClone(snapshot)).sourceXml, xml);
  assert.equal(snapshot.workingCopy.sourceFile, "kuhinja.S3D");
});

test("odbija nepotpun, nepoznat i prazan lokalni oporavak", () => {
  assert.throws(() => parseCorpusRecoverySnapshot({}), /nije podržane verzije/);
  assert.throws(() => parseCorpusRecoverySnapshot({ format: "ivertim-corpus-recovery", version: 2 }), /nije podržane verzije/);
  assert.throws(() => createCorpusRecoverySnapshot("", 0, xml, {} as never), /nema izvorni/);
  assert.throws(() => createCorpusRecoverySnapshot("a.s3d", -1, xml, {} as never), /Veličina/);
});
