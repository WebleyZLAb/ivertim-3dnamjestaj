import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("S3D audit koristi centralni Windows-1250 dekoder", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ivertim-corpus-audit-"));
  try {
    const prefix = new TextEncoder().encode(`<?xml version="1.0" encoding="windows-1250"?>\n<PROJECTFILE FILE="KUHINJA.S3D" VER="17"><SOBA SIRINA="4" DUZINA="4" VISINA="1.2" VISINALOW="1.4"/><ELEMENT ENAME="`);
    const suffix = new TextEncoder().encode(`" ESIRINA="600" EVISINA="720" EDUBINA="560" EXPOX="0" EYPOS="0" EZPOS="560" EKUT="0" EXKUT="0" EZKUT="0"><DASKE DCOUNT="0"/></ELEMENT></PROJECTFILE>`);
    await writeFile(path.join(directory, "kuhinja.s3d"), new Uint8Array([...prefix, 0xc8, 0xe6, 0x9e, 0x9a, 0xf0, ...suffix]));

    const result = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/audit-s3d.ts", directory], {
      cwd: path.resolve(import.meta.dirname, ".."),
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.files, 1);
    assert.equal(report.parsed, 1);
    assert.equal(report.failed, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("S3D audit završava greškom kada makar jedan projekat ne prođe", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ivertim-corpus-audit-failure-"));
  try {
    await writeFile(path.join(directory, "pokvaren.s3d"), `<PROJECTFILE><ELEMENT>`);
    const result = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/audit-s3d.ts", directory], {
      cwd: path.resolve(import.meta.dirname, ".."),
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.files, 1);
    assert.equal(report.failed, 1);
    assert.equal(report.failures.length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("proizvodni audit prihvata pnpm separator i obrazlaže svaku preskočenu ploču", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ivertim-corpus-production-audit-"));
  try {
    await writeFile(path.join(directory, "profili.s3d"), `<PROJECTFILE VER="17"><ELEMENT ENAME="Profili"><DASKE>
      <AD DNAME="L profil" TIPDASKE="0" TIPFRONTE="0" VISINA="600" DUBINA="40" DEBLJINA="0" MATNAME="Metal"/>
      <AD DNAME="Nogica" TIPDASKE="0" TIPFRONTE="5" VISINA="100" DUBINA="50" DEBLJINA="0" MATNAME="Metal"/>
    </DASKE></ELEMENT></PROJECTFILE>`);
    const result = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/audit-s3d-production.ts", "--", directory], {
      cwd: path.resolve(import.meta.dirname, ".."),
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.skippedBoards, 2);
    assert.equal(report.skippedBoardDetails["DEBLJINA=0"].count, 2);
    assert.deepEqual(report.skippedBoardDetails["DEBLJINA=0"].frontTypes, { 0: 1, 5: 1 });
    assert.match(report.skippedBoardDetails["DEBLJINA=0"].samplesByFrontType[0][0], /L profil/);
    assert.match(report.skippedBoardDetails["DEBLJINA=0"].samplesByFrontType[5][0], /Nogica/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
