import assert from "node:assert/strict";
import test from "node:test";
import { applyCorpusWorkingCopyFile, applyCorpusWorkingCopyProject, corpusElementAtPath, createCorpusWorkingCopyFile, findCorpusElementPath, updateCorpusBoard, updateCorpusBoardAppearance, updateCorpusBoardHoles, updateCorpusElement, updateCorpusElementIdentity, updateCorpusElementVariables, updateCorpusRoom } from "../lib/corpus-model.ts";
import { parseCorpusE3d, parseCorpusS3d } from "../lib/corpus-s3d.ts";

test("mijenja samo ciljani element u radnoj kopiji", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="Roditelj" EXPOX="0" EYPOS="0" EZPOS="0" EVISINA="100" ESIRINA="100" EDUBINA="100"><ELMLIST><ELM ENAME="Dijete" EXPOX="10" EYPOS="20" EZPOS="30" EVISINA="40" ESIRINA="50" EDUBINA="60"/></ELMLIST></ELEMENT></PROJECTFILE>`);
  const parent = project.elements[0]!;
  const child = parent.children[0]!;
  const result = updateCorpusElement(project.elements, child, { position: [110, 120, 130], width: 150, height: 140, depth: 160, angle: 45 });

  assert.equal(project.elements[0]!.children[0]!.width, 50);
  assert.notEqual(result.elements[0], parent);
  assert.equal(result.updated?.width, 150);
  assert.deepEqual(result.updated?.position, [110, 120, 130]);
  assert.equal(result.elements[0]!.children[0], result.updated);
});

test("nalazi isti ugniježđeni element kroz izmijenjene verzije stabla", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A"><ELMLIST><ELM ENAME="B"><ELMLIST><ELM ENAME="C"/></ELMLIST></ELM></ELMLIST></ELEMENT></PROJECTFILE>`);
  const target = project.elements[0]!.children[0]!.children[0]!;
  const path = findCorpusElementPath(project.elements, target);
  assert.deepEqual(path, [0, 0, 0]);
  assert.equal(corpusElementAtPath(project.elements, path!), target);
  assert.equal(corpusElementAtPath(project.elements, [4, 2]), null);
});

test("ne mijenja stablo ako cilj nije dio projekta", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A"/></PROJECTFILE>`);
  const foreign = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="B"/></PROJECTFILE>`).elements[0]!;
  const result = updateCorpusElement(project.elements, foreign, { position: [0, 0, 0], width: 1, height: 1, depth: 1, angle: 0 });
  assert.equal(result.updated, null);
  assert.equal(result.elements[0], project.elements[0]);
});

test("izvozi samo promijenjenu geometriju kao sigurnu radnu kopiju", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A" ECOD="A1" EXPOX="0" EYPOS="0" EZPOS="0" EVISINA="100" ESIRINA="100" EDUBINA="100"><ELMLIST><ELM ENAME="B" ECOD="B1" EXPOX="10" EYPOS="20" EZPOS="30" EVISINA="40" ESIRINA="50" EDUBINA="60"/></ELMLIST></ELEMENT></PROJECTFILE>`);
  const child = project.elements[0]!.children[0]!;
  const result = updateCorpusElement(project.elements, child, { position: [11, 22, 33], width: 55, height: 44, depth: 66, angle: 15 });
  const exported = createCorpusWorkingCopyFile("kuhinja.S3D", project.elements, result.elements, "2026-10-18T08:00:00.000Z");

  assert.equal(exported.format, "ivertim-corpus-working-copy");
  assert.equal(exported.sourceFile, "kuhinja.S3D");
  assert.equal(exported.changes.length, 1);
  assert.deepEqual(exported.changes[0]!.path, [0, 0]);
  assert.equal(exported.changes[0]!.before.width, 50);
  assert.equal(exported.changes[0]!.after.width, 55);

  const imported = applyCorpusWorkingCopyFile("KUHINJA.s3d", project.elements, exported);
  assert.equal(imported[0]!.children[0]!.width, 55);
  assert.deepEqual(imported[0]!.children[0]!.position, [11, 22, 33]);
});

test("odbija radnu kopiju drugog projekta i nevažeće vrijednosti", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A"/></PROJECTFILE>`);
  assert.throws(() => applyCorpusWorkingCopyFile("a.s3d", project.elements, {}), /nije IVERTIM Corpus/);
  assert.throws(() => applyCorpusWorkingCopyFile("a.s3d", project.elements, {
    format: "ivertim-corpus-working-copy", version: 1, sourceFile: "b.s3d", exportedAt: "", changes: [],
  }), /pripada projektu b.s3d/);
});

test("odbija zastarjelu radnu kopiju kada je projekat istog imena promijenjen", () => {
  const original = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A" ESIFRA="A1" EXPOX="0" EYPOS="0" EZPOS="0" EVISINA="100" ESIRINA="100" EDUBINA="100"/></PROJECTFILE>`);
  const changed = updateCorpusElement(original.elements, original.elements[0]!, { position: [1, 0, 0], width: 100, height: 100, depth: 100, angle: 0 });
  const sidecar = createCorpusWorkingCopyFile("isti.s3d", original.elements, changed.elements);
  const newer = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A" ESIFRA="A1" EXPOX="9" EYPOS="0" EZPOS="0" EVISINA="100" ESIRINA="100" EDUBINA="100"/></PROJECTFILE>`);
  assert.throws(() => applyCorpusWorkingCopyFile("isti.s3d", newer.elements, sidecar), /razlikuje od projekta/);
});

test("mijenja ploču, izvozi je u radnu kopiju verzije 9 i ponovo je učitava", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A"><DASKE><AD DNAME="Polica" DXPOS="1" DYPOS="2" DZPOS="3" DUBINA="500" VISINA="600" DEBLJINA="18" SMJER="2" DKUT="0" XKUT="0" ZKUT="0"/></DASKE></ELEMENT></PROJECTFILE>`);
  const element = project.elements[0]!;
  const changed = updateCorpusBoard(project.elements, element, 0, {
    position: [11, 12, 13], width: 510, height: 610, thickness: 19, direction: 1, angle: 5, xAngle: 6, zAngle: 7,
  });
  assert.equal(project.elements[0]!.boards[0]!.width, 500);
  assert.equal(changed.updatedElement!.boards[0]!.width, 510);

  const sidecar = createCorpusWorkingCopyFile("ploca.s3d", project.elements, changed.elements, "2026-10-18T09:00:00.000Z");
  assert.equal(sidecar.version, 9);
  assert.equal(sidecar.boardChanges.length, 1);
  assert.deepEqual(sidecar.boardChanges[0]!.elementPath, [0]);
  const imported = applyCorpusWorkingCopyFile("ploca.s3d", project.elements, sidecar);
  assert.equal(imported[0]!.boards[0]!.width, 510);
  assert.equal(imported[0]!.boards[0]!.direction, 1);
});

test("čuva dodani E3D element u radnoj kopiji verzije 9", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="Postojeći"/></PROJECTFILE>`);
  const sourceXml = `<ELEMENTFILE FILE="D1V" VER="17"><ELEMENT ENAME="D1V" EXPOX="100" EYPOS="200" EZPOS="300" ESIRINA="650" EVISINA="830" EDUBINA="570" CUSTOM="ostaje"/></ELEMENTFILE>`;
  const sidecar = createCorpusWorkingCopyFile("kuhinja.s3d", project.elements, project.elements, undefined, undefined, [{ sourceFile: "D1V.E3D", sourceXml }]);
  const imported = applyCorpusWorkingCopyProject("kuhinja.s3d", project.elements, project.room, sidecar);

  assert.equal(sidecar.version, 9);
  assert.equal(sidecar.imports.length, 1);
  assert.equal(imported.elements.length, 2);
  assert.equal(imported.elements[1]!.name, "D1V");
  assert.deepEqual(imported.elements[1]!.position, [100, 200, 300]);
  assert.equal(imported.importedE3dSources[0]!.sourceFile, "D1V.E3D");
  assert.equal(imported.importedE3dSources[0]!.originalElement, imported.elements[1]);
});

test("radna kopija verzije 9 čuva punu strukturu samostalnog E3D-a", () => {
  const originalXml = `<ELEMENTFILE FILE="samostalni.E3D" VER="17"><ELEMENT ENAME="Samostalni"><DASKE DCOUNT="1"><AD DNAME="Prva" DXPOS="0" DYPOS="0" DZPOS="0" VISINA="600" DUBINA="500" DEBLJINA="18" SMJER="1"/></DASKE></ELEMENT></ELEMENTFILE>`;
  const changedXml = originalXml.replace(`DCOUNT="1"`, `DCOUNT="2"`).replace(`</DASKE>`, `<AD DNAME="Druga" DXPOS="0" DYPOS="100" DZPOS="0" VISINA="600" DUBINA="500" DEBLJINA="18" SMJER="1"/></DASKE>`);
  const original = parseCorpusE3d(originalXml);
  const changed = parseCorpusE3d(changedXml);
  const sidecar = createCorpusWorkingCopyFile("samostalni.E3D", original.elements, changed.elements, undefined, undefined, [], { sourceFile: "samostalni.E3D", sourceXml: changedXml });
  const restored = applyCorpusWorkingCopyProject("SAMOSTALNI.e3d", original.elements, original.room, sidecar);

  assert.equal(sidecar.version, 9);
  assert.equal(sidecar.changes.length, 0);
  assert.equal(restored.elements[0]!.boards.length, 2);
  assert.equal(restored.elements[0]!.boards[1]!.name, "Druga");
  assert.equal(restored.standaloneE3dSource!.sourceXml, changedXml);
  assert.equal(restored.standaloneE3dSource!.originalElement, restored.elements[0]);
});

test("čuva izmjenu postojećih EVAR vrijednosti u radnoj kopiji verzije 9", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A"><EVAR VAR0="VISINA=100" VAR1="TIP=IF(VISINA&gt;50;1;0)"/></ELEMENT></PROJECTFILE>`);
  const changed = updateCorpusElementVariables(project.elements, project.elements[0]!, { VISINA: "120", TIP: "IF(VISINA>60;2;0)" });
  const sidecar = createCorpusWorkingCopyFile("varijable.s3d", project.elements, changed.elements);

  assert.equal(sidecar.version, 9);
  assert.deepEqual(sidecar.elementVariableChanges, [{ path: [0], before: { VISINA: "100", TIP: "IF(VISINA>50;1;0)" }, after: { VISINA: "120", TIP: "IF(VISINA>60;2;0)" } }]);
  const restored = applyCorpusWorkingCopyFile("varijable.s3d", project.elements, sidecar);
  assert.deepEqual(restored[0]!.variables, { VISINA: "120", TIP: "IF(VISINA>60;2;0)" });
});

test("radna kopija odbija dodavanje ili brisanje EVAR imena", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A"><EVAR VAR0="A=1"/></ELEMENT></PROJECTFILE>`);
  const changed = updateCorpusElementVariables(project.elements, project.elements[0]!, { A: "2" });
  const sidecar = createCorpusWorkingCopyFile("varijable.s3d", project.elements, changed.elements);
  const invalid = structuredClone(sidecar);
  invalid.elementVariableChanges[0]!.after = { A: "2", NOVA: "3" };
  assert.throws(() => applyCorpusWorkingCopyFile("varijable.s3d", project.elements, invalid), /nije IVERTIM Corpus/);
});

test("dodaje, mijenja i briše rupe ploče kroz radnu kopiju", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A"><DASKE><AD DNAME="Polica"><RUPE><GRUPA14 RNA="Stara" RXP="10" RYP="20" RFI="5" RDU="8" RPL="1" RAL="90"/></RUPE></AD></DASKE></ELEMENT></PROJECTFILE>`);
  const board = project.elements[0]!.boards[0]!;
  const holes = [{ ...board.holes[0]!, name: "Izmijenjena", xExpression: "B/2" }, {
    groupType: "GRUPA14", name: "Nova", xExpression: "32", yExpression: "L-32", diameter: 8, depth: 12, plane: 1, angle: 90, machiningMode: null, machining: {},
  }];
  const changed = updateCorpusBoardHoles(project.elements, project.elements[0]!, 0, holes);
  assert.equal(changed.updatedElement!.boards[0]!.holeCount, 2);
  const sidecar = createCorpusWorkingCopyFile("rupe.s3d", project.elements, changed.elements);
  assert.equal(sidecar.boardHolesChanges.length, 1);
  const imported = applyCorpusWorkingCopyFile("rupe.s3d", project.elements, sidecar);
  assert.deepEqual(imported[0]!.boards[0]!.holes.map(({ name }) => name), ["Izmijenjena", "Nova"]);
  const emptied = updateCorpusBoardHoles(imported, imported[0]!, 0, []);
  assert.equal(emptied.updatedElement!.boards[0]!.holeCount, 0);
});

test("odbija neispravan E3D zapis u radnoj kopiji verzije 6", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/></PROJECTFILE>`);
  const sidecar = createCorpusWorkingCopyFile("a.s3d", project.elements, project.elements, undefined, undefined, [{ sourceFile: "prazan.e3d", sourceXml: `<ELEMENTFILE VER="17"/>` }]);
  assert.throws(() => applyCorpusWorkingCopyProject("a.s3d", project.elements, project.room, sidecar), /tačno jedan korijenski element/);
});

test("čuva identitet i stanje elementa u radnoj kopiji", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A" ESIFRA="A1" ECLAS="DONJI" EVISIBLE="true" EEDITABLE="true" ELOCKED="false"/></PROJECTFILE>`);
  const changed = updateCorpusElementIdentity(project.elements, project.elements[0]!, {
    name: "Novi & element", code: "B2", className: "GORNJI", visible: false, editable: false, locked: true,
  });
  const sidecar = createCorpusWorkingCopyFile("element.s3d", project.elements, changed.elements);
  assert.equal(sidecar.elementIdentityChanges.length, 1);
  const imported = applyCorpusWorkingCopyFile("element.s3d", project.elements, sidecar);
  assert.equal(imported[0]!.name, "Novi & element");
  assert.equal(imported[0]!.code, "B2");
  assert.equal(imported[0]!.className, "GORNJI");
  assert.equal(imported[0]!.visible, false);
  assert.equal(imported[0]!.editable, false);
  assert.equal(imported[0]!.locked, true);
});

test("čuva i ponovo učitava dimenzije prostorije", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA SIRINA="4" DUZINA="5" VISINA="1.2" VISINALOW="1.4"/></PROJECTFILE>`);
  const room = updateCorpusRoom(project.room, { width: 4.5, length: 6, height: 1.3, lowerHeight: 1.5 });
  const sidecar = createCorpusWorkingCopyFile("soba.s3d", project.elements, project.elements, "2026-10-18T10:00:00.000Z", { original: project.room, current: room });
  assert.deepEqual(sidecar.roomChange?.after, room);
  const imported = applyCorpusWorkingCopyProject("soba.s3d", project.elements, project.room, sidecar);
  assert.deepEqual(imported.room, room);
  assert.deepEqual(imported.elements, project.elements);
});

test("odbija radnu kopiju sa neupotrebljivom prostorijom", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA SIRINA="4" DUZINA="5" VISINA="1.2" VISINALOW="1.4"/></PROJECTFILE>`);
  const invalid = createCorpusWorkingCopyFile("a.s3d", project.elements, project.elements, "2026-01-01T00:00:00.000Z", {
    original: project.room,
    current: { ...project.room, width: 0 },
  });
  assert.throws(() => applyCorpusWorkingCopyProject("a.s3d", project.elements, project.room, invalid), /nije IVERTIM Corpus/);
});

test("čuva izgled i materijal ploče u radnoj kopiji", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A"><DASKE><AD DNAME="Front" MATNAME="Bijela" MATUID="W1" BOJA="16777215" PROZIRNO="false" VISIBLE="true"/></DASKE></ELEMENT></PROJECTFILE>`);
  const changed = updateCorpusBoardAppearance(project.elements, project.elements[0]!, 0, {
    materialName: "Hrast", materialUid: "HRAST-1", color: 0xaabbcc, transparent: true, visible: false,
  });
  const sidecar = createCorpusWorkingCopyFile("izgled.s3d", project.elements, changed.elements);
  assert.equal(sidecar.boardAppearanceChanges.length, 1);
  const imported = applyCorpusWorkingCopyFile("izgled.s3d", project.elements, sidecar);
  assert.equal(imported[0]!.boards[0]!.materialName, "Hrast");
  assert.equal(imported[0]!.boards[0]!.color, 0xaabbcc);
  assert.equal(imported[0]!.boards[0]!.transparent, true);
  assert.equal(imported[0]!.boards[0]!.visible, false);
});
