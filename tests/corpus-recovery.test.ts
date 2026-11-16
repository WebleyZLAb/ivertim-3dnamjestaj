import assert from "node:assert/strict";
import test from "node:test";
import { createCorpusWorkingCopyFile } from "../lib/corpus-model.ts";
import { createCorpusRecoveryOperationQueue, createCorpusRecoverySnapshot, parseCorpusRecoverySnapshot, shouldClearCorpusRecovery } from "../lib/corpus-recovery.ts";
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

test("serijalizuje save i clear operacije tačnim redoslijedom", async () => {
  const queue = createCorpusRecoveryOperationQueue();
  const events: string[] = [];
  let releaseFirst!: () => void;
  let markStarted!: () => void;
  const firstBarrier = new Promise<void>((resolve) => { releaseFirst = resolve; });
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  const first = queue.run(async () => {
    events.push("save:start");
    markStarted();
    await firstBarrier;
    events.push("save:end");
  });
  const second = queue.run(async () => { events.push("clear"); });
  await started;
  assert.deepEqual(events, ["save:start"]);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(events, ["save:start", "save:end", "clear"]);
});

test("neuspjeli recovery upis ne blokira sljedeću operaciju", async () => {
  const queue = createCorpusRecoveryOperationQueue();
  const failed = queue.run(async () => { throw new Error("disk"); });
  const next = queue.run(async () => "clear-ok");
  await assert.rejects(failed, /disk/);
  assert.equal(await next, "clear-ok");
});

test("briše oporavak samo kada isti projekat pređe iz izmijenjenog u čisto stanje", () => {
  const dirty = { sessionId: 1, fileName: "KUHINJA.S3D", sourceXml: "<PROJECTFILE/>", dirty: true };
  assert.equal(shouldClearCorpusRecovery(null, { ...dirty, dirty: false }), false);
  assert.equal(shouldClearCorpusRecovery(dirty, { ...dirty, dirty: false }), true);
  assert.equal(shouldClearCorpusRecovery(dirty, { ...dirty, fileName: "DRUGI.S3D", dirty: false }), false);
  assert.equal(shouldClearCorpusRecovery(dirty, { ...dirty, sourceXml: "<PROJECTFILE VER=\"2\"/>", dirty: false }), false);
  assert.equal(shouldClearCorpusRecovery(dirty, { ...dirty, sessionId: 2, dirty: false }), false);
});
