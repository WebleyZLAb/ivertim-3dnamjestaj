import assert from "node:assert/strict";
import test from "node:test";
import { updateCorpusBoard, updateCorpusBoardAppearance, updateCorpusBoardHoles, updateCorpusElement, updateCorpusElementIdentity, updateCorpusElementVariables } from "../lib/corpus-model.ts";
import { parseCorpusE3d, parseCorpusS3d } from "../lib/corpus-s3d.ts";
import { appendCorpusE3dBoard, createCorpusE3dSourceFromS3d, duplicateCorpusE3dBoard, duplicateCorpusE3dBoardCopies, duplicateCorpusE3dBoards, moveCorpusE3dBoard, removeCorpusE3dBoard, removeCorpusE3dBoards, renameCorpusE3dBoard, replaceCorpusE3dBoardContour, replaceCorpusE3dBoardEdgeBanding, replaceCorpusE3dElementVariables, writeCorpusE3dGeometryCopy, writeCorpusS3dGeometryCopy, writeCorpusS3dWithImportedElements } from "../lib/corpus-s3d-writer.ts";

test("upisuje E3D radnu kopiju i čuva nepoznate podatke", () => {
  const xml = `\uFEFF<!-- Ver=17-->\r\n<ELEMENTFILE FILE="D1V" VER="17"><ELEMENT ENAME="D1V" EXPOX="0" EYPOS="0" EZPOS="0" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0" CUSTOM="ostaje"><DASKE><AD DNAME="Bok" DXPOS="0" DYPOS="0" DZPOS="0" DUBINA="560" VISINA="720" DEBLJINA="18" SMJER="0"/></DASKE></ELEMENT></ELEMENTFILE>`;
  const original = parseCorpusE3d(xml);
  const changed = updateCorpusElement(original.elements, original.elements[0]!, { position: [10, 20, 30], width: 650, height: 830, depth: 570, angle: 5, xAngle: 1, zAngle: 2 });
  const output = writeCorpusE3dGeometryCopy(xml, original.elements, changed.elements);
  const reparsed = parseCorpusE3d(output);
  assert.deepEqual(reparsed.elements[0]?.position, [10, 20, 30]);
  assert.equal(reparsed.elements[0]?.width, 650);
  assert.match(output, /CUSTOM="ostaje"/);
  assert.ok(output.startsWith("\uFEFF<!-- Ver=17-->\r\n"));
});

test("vraća potpuno isti E3D tekst kada nema izmjena", () => {
  const xml = `<ELEMENTFILE FILE="A" VER="17"><ELEMENT ENAME="A"/></ELEMENTFILE>`;
  const original = parseCorpusE3d(xml);
  assert.equal(writeCorpusE3dGeometryCopy(xml, original.elements, original.elements), xml);
});

test("uvozi E3D element u novu S3D kopiju i uključuje njegove lokalne izmjene", () => {
  const s3d = `<PROJECTFILE VER="17">\r\n  <SOBA/>\r\n  <ELEMENT ENAME="Postojeći"/>\r\n</PROJECTFILE>`;
  const e3d = `<ELEMENTFILE FILE="D1V" VER="17"><ELEMENT ENAME="D1V" EXPOX="0" EYPOS="0" EZPOS="0" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0" CUSTOM="ostaje"><DASKE><AD DNAME="Bok"/></DASKE></ELEMENT></ELEMENTFILE>`;
  const project = parseCorpusS3d(s3d);
  const library = parseCorpusE3d(e3d);
  const imported = library.elements[0]!;
  const changedImport = updateCorpusElement([imported], imported, { position: [100, 200, 300], width: 650, height: 830, depth: 570, angle: 5, xAngle: 1, zAngle: 2 }).elements[0]!;
  const output = writeCorpusS3dWithImportedElements(s3d, project.elements, [...project.elements, changedImport], [{ sourceFile: "D1V.E3D", sourceXml: e3d, originalElement: imported }]);
  const reparsed = parseCorpusS3d(output);
  assert.equal(reparsed.elements.length, 2);
  assert.deepEqual(reparsed.elements[1]?.position, [100, 200, 300]);
  assert.match(output, /CUSTOM="ostaje"/);
  assert.match(output, /<ELEMENT ENAME="Postojeći"\/>/);
});

test("upisuje izmijenjenu geometriju u novi S3D i čuva nepoznate podatke", () => {
  const opaque = "071054506C616E65436F6C6C656374696F6E";
  const xml = `<?xml version="1.0"?><PROJECTFILE VER="17"><UNKNOWN KEEP="yes">${opaque}</UNKNOWN><ELEMENT ENAME="A" EXPOX="0" EYPOS="1" EZPOS="2" ESIRINA="100" EVISINA="200" EDUBINA="300" EKUT="0"><ELMLIST><ELM ENAME="B" CUSTOM="ne diraj" EXPOX="3" EYPOS="4" EZPOS="5" ESIRINA="40" EVISINA="50" EDUBINA="60"/></ELMLIST></ELEMENT></PROJECTFILE>`;
  const project = parseCorpusS3d(xml);
  const child = project.elements[0]!.children[0]!;
  const changed = updateCorpusElement(project.elements, child, { position: [13.5, 14, 15], width: 140, height: 150, depth: 160, angle: 22.5, xAngle: 12, zAngle: -8 });
  const output = writeCorpusS3dGeometryCopy(xml, project.elements, changed.elements);
  const reparsed = parseCorpusS3d(output);

  assert.deepEqual(reparsed.elements[0]!.children[0]!.position, [13.5, 14, 15]);
  assert.equal(reparsed.elements[0]!.children[0]!.width, 140);
  assert.equal(reparsed.elements[0]!.children[0]!.angle, 22.5);
  assert.equal(reparsed.elements[0]!.children[0]!.xAngle, 12);
  assert.equal(reparsed.elements[0]!.children[0]!.zAngle, -8);
  assert.match(output, /CUSTOM="ne diraj"/);
  assert.match(output, new RegExp(opaque));
  assert.match(output, /<UNKNOWN KEEP="yes">/);
  assert.equal(project.elements[0]!.children[0]!.width, 40);
});

test("vraća potpuno iste bajtove kada nema izmjena", () => {
  const xml = `<PROJECTFILE VER='17'>\r\n  <SOBA/>\r\n  <ELEMENT ENAME='A'/>\r\n</PROJECTFILE>`;
  const project = parseCorpusS3d(xml);
  assert.equal(writeCorpusS3dGeometryCopy(xml, project.elements, project.elements), xml);
});

test("dodaje nedostajuće dokazane geometrijske atribute bez promjene ostalih", () => {
  const xml = `<PROJECTFILE VER="17"><ELEMENT ENAME="A" EXPOX="0" EYPOS="0" EZPOS="0" ESIRINA="1" EVISINA="2" EDUBINA="3"/></PROJECTFILE>`;
  const project = parseCorpusS3d(xml);
  const changed = updateCorpusElement(project.elements, project.elements[0]!, { position: [1, 2, 3], width: 10, height: 20, depth: 30, angle: 45, xAngle: 5, zAngle: 6 });
  const output = writeCorpusS3dGeometryCopy(xml, project.elements, changed.elements);
  assert.match(output, /EKUT="45"/);
  assert.match(output, /EXKUT="5"/);
  assert.match(output, /EZKUT="6"/);
  assert.equal(parseCorpusS3d(output).elements[0]!.angle, 45);
});

test("upisuje geometriju ploče i čuva njene obrade i konturu", () => {
  const xml = `<PROJECTFILE VER="17"><ELEMENT ENAME="A"><DASKE><AD DNAME="Polica" DXPOS="1" DYPOS="2" DZPOS="3" DUBINA="500" VISINA="600" DEBLJINA="18" SMJER="2" CUSTOM="ostaje"><RUPE><GRUPA14 RNA="Rupa" RFI="5"/></RUPE><KRIVULJE DATA="&quot;PTOCKA=0&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=0&quot;,&quot;PTZ=0&quot;"/></AD></DASKE></ELEMENT></PROJECTFILE>`;
  const project = parseCorpusS3d(xml);
  const changed = updateCorpusBoard(project.elements, project.elements[0]!, 0, {
    position: [10, 20, 30], width: 510, height: 610, thickness: 19, direction: 1, angle: 4, xAngle: 5, zAngle: 6,
  });
  const output = writeCorpusS3dGeometryCopy(xml, project.elements, changed.elements);
  const board = parseCorpusS3d(output).elements[0]!.boards[0]!;
  assert.deepEqual(board.position, [10, 20, 30]);
  assert.equal(board.width, 510);
  assert.equal(board.height, 610);
  assert.equal(board.thickness, 19);
  assert.equal(board.direction, 1);
  assert.match(output, /CUSTOM="ostaje"/);
  assert.match(output, /<RUPE><GRUPA14/);
  assert.match(output, /<KRIVULJE DATA=/);
});

test("upisuje materijal, boju, providnost i vidljivost ploče", () => {
  const xml = `<PROJECTFILE VER="17"><ELEMENT ENAME="A"><DASKE><AD DNAME="Front" MATNAME="Bijela" MATUID="W1" BOJA="16777215" PROZIRNO="false" VISIBLE="true"/></DASKE></ELEMENT></PROJECTFILE>`;
  const project = parseCorpusS3d(xml);
  const changed = updateCorpusBoardAppearance(project.elements, project.elements[0]!, 0, {
    materialName: `Hrast & "natur"`, materialUid: "HRAST-1", color: 0x8a6644, transparent: true, visible: false,
  });
  const output = writeCorpusS3dGeometryCopy(xml, project.elements, changed.elements);
  const board = parseCorpusS3d(output).elements[0]!.boards[0]!;
  assert.equal(board.materialName, `Hrast & "natur"`);
  assert.equal(board.materialUid, "HRAST-1");
  assert.equal(board.color, 0x8a6644);
  assert.equal(board.transparent, true);
  assert.equal(board.visible, false);
  assert.match(output, /MATNAME="Hrast &amp; &quot;natur&quot;"/);
});

test("upisuje dimenzije prostorije u novu S3D kopiju", () => {
  const xml = `<PROJECTFILE VER="17"><SOBA SIRINA="4" DUZINA="5" VISINA="1.2" VISINALOW="1.4" CUSTOM="ostaje"/></PROJECTFILE>`;
  const project = parseCorpusS3d(xml);
  const room = { width: 4.5, length: 6, height: 1.3, lowerHeight: 1.5 };
  const output = writeCorpusS3dGeometryCopy(xml, project.elements, project.elements, { original: project.room, current: room });
  assert.deepEqual(parseCorpusS3d(output).room, room);
  assert.match(output, /CUSTOM="ostaje"/);
});

test("upisuje identitet i stanje elementa i čuva nepoznate atribute", () => {
  const xml = `<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A" ESIFRA="A1" ECLAS="DONJI" EVISIBLE="true" EEDITABLE="true" ELOCKED="false" CUSTOM="ostaje"/></PROJECTFILE>`;
  const original = parseCorpusS3d(xml);
  const changed = updateCorpusElementIdentity(original.elements, original.elements[0]!, {
    name: `Novi & "element"`, code: "B2", className: "GORNJI", visible: false, editable: false, locked: true,
  });
  const output = writeCorpusS3dGeometryCopy(xml, original.elements, changed.elements);
  assert.match(output, /CUSTOM="ostaje"/);
  assert.match(output, /ENAME="Novi &amp; &quot;element&quot;"/);
  const reparsed = parseCorpusS3d(output);
  assert.equal(reparsed.elements[0]!.name, `Novi & "element"`);
  assert.equal(reparsed.elements[0]!.code, "B2");
  assert.equal(reparsed.elements[0]!.className, "GORNJI");
  assert.equal(reparsed.elements[0]!.visible, false);
  assert.equal(reparsed.elements[0]!.editable, false);
  assert.equal(reparsed.elements[0]!.locked, true);
});

test("mijenja samo postojeće EVAR vrijednosti i čuva atribute, redoslijed i izraze", () => {
  const xml = `<PROJECTFILE VER="17"><ELEMENT ENAME="A"><EVAR VAR0="A=1" CUSTOM="ostaje" VAR1="B=IF(A&gt;0;2;3)"/></ELEMENT></PROJECTFILE>`;
  const original = parseCorpusS3d(xml);
  const changed = updateCorpusElementVariables(original.elements, original.elements[0]!, { A: "5", B: "IF(A>4;7;8)" });
  const output = writeCorpusS3dGeometryCopy(xml, original.elements, changed.elements);

  assert.match(output, /<EVAR VAR0="A=5" CUSTOM="ostaje" VAR1="B=IF\(A&gt;4;7;8\)"\/>/);
  assert.deepEqual(parseCorpusS3d(output).elements[0]!.variables, { A: "5", B: "IF(A>4;7;8)" });
});

test("EVAR izvoz odbija nejednoznačno ponovljeno ime varijable", () => {
  const xml = `<PROJECTFILE VER="17"><ELEMENT ENAME="A"><EVAR VAR0="A=1" VAR1="A=1"/></ELEMENT></PROJECTFILE>`;
  const original = parseCorpusS3d(xml);
  const changed = updateCorpusElementVariables(original.elements, original.elements[0]!, { A: "2" });
  assert.throws(() => writeCorpusS3dGeometryCopy(xml, original.elements, changed.elements), /nije jednoznačno pronađena/);
});

test("strukturno dodaje, preimenuje i uklanja E3D varijable uz neprekinut VARn niz", () => {
  const xml = `<ELEMENTFILE VER="17"><ELEMENT ENAME="A"><EVAR CUSTOM="ostaje" VAR0="A=1" VAR1="B=2"/><DASKE/></ELEMENT></ELEMENTFILE>`;
  const output = replaceCorpusE3dElementVariables(xml, [0], { SIRINA: "600", BROJ_POLICA: "3", USLOV: "IF(BROJ_POLICA>0;1;0)" });

  assert.match(output, /<EVAR CUSTOM="ostaje" VAR0="SIRINA=600" VAR1="BROJ_POLICA=3" VAR2="USLOV=IF\(BROJ_POLICA&gt;0;1;0\)"\/>/);
  assert.deepEqual(parseCorpusE3d(output).elements[0]!.variables, { SIRINA: "600", BROJ_POLICA: "3", USLOV: "IF(BROJ_POLICA>0;1;0)" });
  const removed = replaceCorpusE3dElementVariables(output, [0], { SIRINA: "650" });
  assert.match(removed, /<EVAR CUSTOM="ostaje" VAR0="SIRINA=650"\/>/);
  assert.doesNotMatch(removed, /VAR1=/);
});

test("dodaje prvi EVAR blok elementu koji ga nema i podržava ugniježđenu putanju", () => {
  const xml = `<ELEMENTFILE VER="17"><ELEMENT ENAME="A"><ELMLIST><ELM ENAME="B"><DASKE/></ELM></ELMLIST></ELEMENT></ELEMENTFILE>`;
  const output = replaceCorpusE3dElementVariables(xml, [0, 0], { TIP: "1" });
  const parsed = parseCorpusE3d(output);

  assert.deepEqual(parsed.elements[0]!.variables, {});
  assert.deepEqual(parsed.elements[0]!.children[0]!.variables, { TIP: "1" });
  assert.match(output, /<ELM ENAME="B"><EVAR VAR0="TIP=1"\/><DASKE\/>/);
});

test("strukturni EVAR editor odbija dvosmislena i semantički duplirana imena", () => {
  const duplicateXml = `<ELEMENTFILE VER="17"><ELEMENT ENAME="A"><EVAR VAR0="WTH=1" VAR1="WTH=2"/></ELEMENT></ELEMENTFILE>`;
  assert.throws(() => replaceCorpusE3dElementVariables(duplicateXml, [0], { WTH: "3" }), /nije jednoznačna/);
  assert.throws(() => replaceCorpusE3dElementVariables(`<ELEMENTFILE><ELEMENT/></ELEMENTFILE>`, [0], { Sirina: "1", SIRINA: "2" }), /jednoznačni/);
  assert.throws(() => replaceCorpusE3dElementVariables(`<ELEMENTFILE><ELEMENT/></ELEMENTFILE>`, [0], { "LOŠE=IME": "1" }), /znak =/);
});

test("upisuje ručno dodane i izmijenjene rupe u S3D kopiju", () => {
  const xml = `<PROJECTFILE VER="17"><ELEMENT ENAME="A"><DASKE><AD DNAME="Polica"><RUPE><GRUPA14 RNA="Stara" RXP="10" RYP="20" RFI="5" RDU="8" RPL="1" RAL="90"><RAS MODE="4"><MILTOOL>103</MILTOOL></RAS></GRUPA14></RUPE></AD></DASKE></ELEMENT></PROJECTFILE>`;
  const original = parseCorpusS3d(xml);
  const first = original.elements[0]!.boards[0]!.holes[0]!;
  const changed = updateCorpusBoardHoles(original.elements, original.elements[0]!, 0, [
    { ...first, name: "Centar", xExpression: "B/2" },
    { groupType: "GRUPA14", name: "Nova", xExpression: "32", yExpression: "L-32", diameter: 8, depth: 12, plane: 1, angle: 90, machiningMode: null, machining: {} },
  ]);
  const output = writeCorpusS3dGeometryCopy(xml, original.elements, changed.elements);
  const holes = parseCorpusS3d(output).elements[0]!.boards[0]!.holes;
  assert.equal(holes.length, 2);
  assert.equal(holes[0]!.name, "Centar");
  assert.equal(holes[0]!.machining.MILTOOL, "103");
  assert.equal(holes[1]!.diameter, 8);
});

test("izdvaja izvorni korijenski S3D element kao samostalni E3D bez gubitka sadržaja", () => {
  const xml = `<PROJECTFILE VER="19"><SOBA/><ELEMENT ENAME="Prvi"><NEPOZNATO A="1"/><ELMLIST ECOUNT="1"><ELM ENAME="Dijete"/></ELMLIST></ELEMENT><ELEMENT ENAME="Drugi"/></PROJECTFILE>`;
  const e3d = createCorpusE3dSourceFromS3d(xml, 0);
  const parsed = parseCorpusE3d(e3d);
  assert.equal(parsed.version, "19");
  assert.equal(parsed.elements[0]?.name, "Prvi");
  assert.equal(parsed.elements[0]?.children[0]?.name, "Dijete");
  assert.match(e3d, /<NEPOZNATO A="1"\/>/);
  assert.doesNotMatch(e3d, /ENAME="Drugi"/);
  assert.throws(() => createCorpusE3dSourceFromS3d(xml, 2), /nije pronađen/);
});

test("udvostručava izvorni S3D element i izvozi obje nezavisne geometrije", () => {
  const xml = `<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="Ormar" EXPOX="20" EYPOS="0" EZPOS="500" ESIRINA="600" EVISINA="800" EDUBINA="500" EKUT="0" EXKUT="0" EZKUT="0" CUSTOM="ostaje"><DASKE><AD DNAME="Bok"/></DASKE></ELEMENT></PROJECTFILE>`;
  const project = parseCorpusS3d(xml);
  const original = project.elements[0]!;
  const duplicate = structuredClone(original);
  duplicate.position = [620, 0, 500];
  const sourceXml = createCorpusE3dSourceFromS3d(xml, 0);
  const output = writeCorpusS3dWithImportedElements(xml, project.elements, [original, duplicate], [{
    sourceFile: "Ormar.E3D",
    sourceXml,
    originalElement: original,
  }]);
  const reparsed = parseCorpusS3d(output);

  assert.equal(reparsed.elements.length, 2);
  assert.deepEqual(reparsed.elements[0]?.position, [20, 0, 500]);
  assert.deepEqual(reparsed.elements[1]?.position, [620, 0, 500]);
  assert.equal(reparsed.elements[1]?.boards[0]?.name, "Bok");
  assert.equal((output.match(/CUSTOM="ostaje"/g) ?? []).length, 2);
});

test("udvostručava E3D ploču bez gubitka konture, rupa i nepoznatih obrada", () => {
  const xml = `<ELEMENTFILE VER="17"><ELEMENT ENAME="A"><DASKE DCOUNT="1"><AD DNAME="Bok" CUSTOM="ostaje"><RUPE><GRUPA14 RNA="R1" RXP="10" RYP="20"/></RUPE><KRIVULJE DATA="kontura"/><NEPOZNATA_OBRADA X="1"/></AD></DASKE></ELEMENT></ELEMENTFILE>`;
  const output = duplicateCorpusE3dBoard(xml, 0, "Bok kopija");
  const parsed = parseCorpusE3d(output);

  assert.equal(parsed.elements[0]?.boards.length, 2);
  assert.equal(parsed.elements[0]?.boards[1]?.name, "Bok kopija");
  assert.equal(parsed.elements[0]?.boards[1]?.holes[0]?.name, "R1");
  assert.equal((output.match(/CUSTOM="ostaje"/g) ?? []).length, 2);
  assert.equal((output.match(/<NEPOZNATA_OBRADA X="1"\/>/g) ?? []).length, 2);
  assert.match(output, /<DASKE DCOUNT="2">/);
  assert.throws(() => duplicateCorpusE3dBoard(xml, 4, "Nema"), /nije pronađena/);
});

test("pravi niz E3D ploča sa novim koordinatama i čuva cijeli izvorni fragment", () => {
  const xml = `<ELEMENTFILE><ELEMENT><DASKE DCOUNT="1">\r\n  <AD DNAME="Polica" DXPOS="18" DYPOS="100" DZPOS="0" CUSTOM="ostaje"><RUPE><GRUPA14 RNA="R1"/></RUPE><NEPOZNATO A="1"/></AD>\r\n</DASKE></ELEMENT></ELEMENTFILE>`;
  const output = duplicateCorpusE3dBoardCopies(xml, 0, [
    { name: "Polica 2", position: [18, 200, 0] },
    { name: "Polica 3", position: [18, 300, -10] },
  ]);
  const boards = parseCorpusE3d(output).elements[0]!.boards;
  assert.deepEqual(boards.map(({ name, position }) => [name, ...position]), [
    ["Polica", 18, 100, 0], ["Polica 2", 18, 200, 0], ["Polica 3", 18, 300, -10],
  ]);
  assert.equal((output.match(/CUSTOM="ostaje"/g) ?? []).length, 3);
  assert.equal((output.match(/<NEPOZNATO A="1"\/>/g) ?? []).length, 3);
  assert.match(output, /DCOUNT="3"/);
  assert.match(output, /\r\n  <AD DNAME="Polica 2"/);
  assert.throws(() => duplicateCorpusE3dBoardCopies(xml, 0, []), /1 do 50/);
  assert.throws(() => duplicateCorpusE3dBoardCopies(xml, 0, [{ name: "", position: [0, 0, 0] }]), /naziv/);
});

test("grupno kopira različite ploče uz očuvan redoslijed i pune fragmente", () => {
  const xml = `<ELEMENTFILE><ELEMENT><DASKE DCOUNT="3"><AD DNAME="A" CUSTOM="A"><RUPE/></AD><AD DNAME="B" CUSTOM="B"><NEPOZNATO/></AD><AD DNAME="C" CUSTOM="C"/></DASKE></ELEMENT></ELEMENTFILE>`;
  const output = duplicateCorpusE3dBoards(xml, [
    { boardIndex: 0, name: "A kopija", position: [10, 20, 30] },
    { boardIndex: 2, name: "C kopija", position: [40, 50, 60] },
  ]);
  const boards = parseCorpusE3d(output).elements[0]!.boards;
  assert.deepEqual(boards.map((board) => [board.name, ...board.position]), [
    ["A", null, null, null], ["A kopija", 10, 20, 30], ["B", null, null, null], ["C", null, null, null], ["C kopija", 40, 50, 60],
  ]);
  assert.equal((output.match(/CUSTOM="A"/g) ?? []).length, 2);
  assert.equal((output.match(/CUSTOM="C"/g) ?? []).length, 2);
  assert.match(output, /DCOUNT="5"/);
  assert.throws(() => duplicateCorpusE3dBoards(xml, [{ boardIndex: 3, name: "Nema", position: [0, 0, 0] }]), /nije pronađena/);
});

test("pomjera cijeli E3D AD fragment i čuva njegove nepoznate blokove", () => {
  const xml = `<ELEMENTFILE><ELEMENT><DASKE DCOUNT="3">\n  <AD DNAME="A"><UNKNOWN ID="A"/></AD>\n  <AD DNAME="B"><RUPE><GRUPA14 RNA="B"/></RUPE></AD>\n  <AD DNAME="C" CUSTOM="ostaje"/>\n</DASKE></ELEMENT></ELEMENTFILE>`;
  const moved = moveCorpusE3dBoard(xml, 2, 0);
  const parsed = parseCorpusE3d(moved);

  assert.deepEqual(parsed.elements[0]!.boards.map(({ name }) => name), ["C", "A", "B"]);
  assert.match(moved, /<AD DNAME="C" CUSTOM="ostaje"\/>[\s\S]*<AD DNAME="A"><UNKNOWN ID="A"\/><\/AD>[\s\S]*<AD DNAME="B"><RUPE>/);
  assert.equal(moveCorpusE3dBoard(xml, 1, 1), xml);
  assert.throws(() => moveCorpusE3dBoard(xml, 3, 0), /nije ispravna/);
});

test("uklanja samo izabranu E3D ploču i ažurira DCOUNT", () => {
  const xml = `<ELEMENTFILE VER="17"><ELEMENT ENAME="A"><DASKE DCOUNT="3">\n  <AD DNAME="Prva" CUSTOM="1"><RUPE/></AD>\n  <AD DNAME="Druga" CUSTOM="2"><NEPOZNATO/></AD>\n  <AD DNAME="Treća" CUSTOM="3"/>\n</DASKE></ELEMENT></ELEMENTFILE>`;
  const output = removeCorpusE3dBoard(xml, 1);
  const parsed = parseCorpusE3d(output);

  assert.deepEqual(parsed.elements[0]?.boards.map((board) => board.name), ["Prva", "Treća"]);
  assert.match(output, /<DASKE DCOUNT="2">/);
  assert.match(output, /CUSTOM="1"/);
  assert.match(output, /CUSTOM="3"/);
  assert.doesNotMatch(output, /CUSTOM="2"|<NEPOZNATO\/>/);
  assert.throws(() => removeCorpusE3dBoard(`<ELEMENTFILE><ELEMENT><DASKE><AD DNAME="Jedina"/></DASKE></ELEMENT></ELEMENTFILE>`, 0), /Posljednja ploča/);
});

test("grupno uklanja označene ploče i zadržava najmanje jednu", () => {
  const xml = `<ELEMENTFILE><ELEMENT><DASKE DCOUNT="4"><AD DNAME="A"/><AD DNAME="B"/><AD DNAME="C"/><AD DNAME="D"/></DASKE></ELEMENT></ELEMENTFILE>`;
  const output = removeCorpusE3dBoards(xml, [2, 0, 2]);
  assert.deepEqual(parseCorpusE3d(output).elements[0]!.boards.map((board) => board.name), ["B", "D"]);
  assert.match(output, /DCOUNT="2"/);
  assert.throws(() => removeCorpusE3dBoards(xml, [0, 1, 2, 3]), /najmanje jednu/);
  assert.throws(() => removeCorpusE3dBoards(xml, [4]), /nije pronađena/);
});

test("dodaje novu pravougaonu E3D ploču sa potpunom geometrijom i izgledom", () => {
  const xml = `<ELEMENTFILE VER="17"><ELEMENT ENAME="A"><DASKE DCOUNT="1"><AD DNAME="Bok"/></DASKE></ELEMENT></ELEMENTFILE>`;
  const output = appendCorpusE3dBoard(xml, {
    name: "Nova & polica", position: [18, 350, 0], height: 564, width: 560, thickness: 18, direction: 2,
    materialName: `Hrast "natur"`, materialUid: "HRAST-1", color: 0x886644, transparent: false, visible: true,
  });
  const board = parseCorpusE3d(output).elements[0]?.boards[1];

  assert.equal(board?.name, "Nova & polica");
  assert.deepEqual(board?.position, [18, 350, 0]);
  assert.equal(board?.height, 564);
  assert.equal(board?.width, 560);
  assert.equal(board?.direction, 2);
  assert.equal(board?.curvePoints.length, 4);
  assert.equal(board?.materialName, `Hrast "natur"`);
  assert.match(output, /DCOUNT="2"/);
});

test("dodaje prvu ploču i u samostalnu DASKE sekciju", () => {
  const xml = `<ELEMENTFILE><ELEMENT ENAME="A"><DASKE/></ELEMENT></ELEMENTFILE>`;
  const output = appendCorpusE3dBoard(xml, { name: "Prva", position: [0, 0, 0], height: 100, width: 200, thickness: 18, direction: 2, materialName: "", materialUid: "", color: 0xffffff, transparent: false, visible: true });
  assert.equal(parseCorpusE3d(output).elements[0]?.boards[0]?.name, "Prva");
  assert.match(output, /<DASKE DCOUNT="1">/);
});

test("dodaje ploče u sve tri Corpus orijentacije", () => {
  let xml = `<ELEMENTFILE><ELEMENT ENAME="A"><DASKE/></ELEMENT></ELEMENTFILE>`;
  for (const direction of [0, 1, 2] as const) {
    xml = appendCorpusE3dBoard(xml, { name: `Smjer ${direction}`, position: [direction * 10, 20, 30], height: 100 + direction, width: 200 + direction, thickness: 18, direction, materialName: "Test", materialUid: "M-1", color: 0x123456, transparent: direction === 1, visible: direction !== 0 });
  }
  const boards = parseCorpusE3d(xml).elements[0]?.boards ?? [];
  assert.deepEqual(boards.map((board) => board.direction), [0, 1, 2]);
  assert.deepEqual(boards.map((board) => board.position), [[0, 20, 30], [10, 20, 30], [20, 20, 30]]);
  assert.deepEqual(boards.map((board) => board.name), ["Smjer 0", "Smjer 1", "Smjer 2"]);
  assert.match(xml, /DCOUNT="3"/);
});

test("mijenja samo naziv izabrane E3D ploče", () => {
  const xml = `<ELEMENTFILE><ELEMENT><DASKE><AD DNAME="Staro" CUSTOM="ostaje"><RUPE/><NEPOZNATO X="1"/></AD><AD DNAME="Druga"/></DASKE></ELEMENT></ELEMENTFILE>`;
  const output = renameCorpusE3dBoard(xml, 0, `Novo & "ime"`);
  const parsed = parseCorpusE3d(output);
  assert.equal(parsed.elements[0]?.boards[0]?.name, `Novo & "ime"`);
  assert.equal(parsed.elements[0]?.boards[1]?.name, "Druga");
  assert.match(output, /CUSTOM="ostaje"/);
  assert.match(output, /<NEPOZNATO X="1"\/>/);
  assert.throws(() => renameCorpusE3dBoard(xml, 0, "   "), /ne može biti prazan/);
});

test("zamjenjuje ravnu konturu ploče i čuva ostale Corpus blokove", () => {
  const xml = `<ELEMENTFILE><ELEMENT><DASKE><AD DNAME="Radna" VISINA="600" DUBINA="500" CUSTOM="ostaje"><RUPE><GRUPA14 RNA="R1"/></RUPE><KRIVULJE DATA="staro"/><NEPOZNATA_OBRADA X="1"/></AD></DASKE></ELEMENT></ELEMENTFILE>`;
  const output = replaceCorpusE3dBoardContour(xml, 0, [
    { x: 0, z: 0 }, { x: 600, z: 0 }, { x: 600, z: 300 }, { x: 450, z: 300 }, { x: 450, z: 500 }, { x: 0, z: 500 },
  ]);
  const board = parseCorpusE3d(output).elements[0]?.boards[0];
  assert.equal(board?.curvePoints.length, 6);
  assert.deepEqual(board?.curvePoints.map(({ x, z, style }) => [x, z, style]), [[0, 0, 0], [600, 0, 0], [600, 300, 0], [450, 300, 0], [450, 500, 0], [0, 500, 0]]);
  assert.equal(board?.height, 600);
  assert.equal(board?.width, 500);
  assert.match(output, /CUSTOM="ostaje"/);
  assert.match(output, /<GRUPA14 RNA="R1"\/>/);
  assert.match(output, /<NEPOZNATA_OBRADA X="1"\/>/);
  assert.throws(() => replaceCorpusE3dBoardContour(xml, 0, [{ x: 0, z: 0 }, { x: 100, z: 100 }, { x: 0, z: 100 }, { x: 100, z: 0 }]), /presijecati/);
  assert.throws(() => replaceCorpusE3dBoardContour(xml, 0, [{ x: 0, z: 0 }, { x: 1, z: 1 }]), /najmanje tri/);
});

test("zamjenjuje samo rubne POTITEM zapise i čuva ostali potrošni materijal", () => {
  const xml = `<ELEMENTFILE><ELEMENT><DASKE><AD DNAME="Radna"><POTROSNI COUNT="2"><POTITEM TIP="0" NAZIV="Stara" STR0="true"/><POTITEM TIP="1" NAZIV="Okov" UID="okov-1" KOMADA="2"/></POTROSNI><RUPE/><NEPOZNATO/></AD></DASKE></ELEMENT></ELEMENTFILE>`;
  const output = replaceCorpusE3dBoardEdgeBanding(xml, 0, { name: "ABS 1 mm", materialName: "Bijela", materialUid: "MAT-1", uid: "ABS-1", sides: [true, false, true, false] });
  const items = parseCorpusE3d(output).elements[0]?.boards[0]?.consumables ?? [];
  assert.equal(items.length, 2);
  assert.equal(items[0]?.type, "1");
  assert.equal(items[0]?.name, "Okov");
  assert.equal(items[1]?.type, "0");
  assert.equal(items[1]?.name, "ABS 1 mm");
  assert.deepEqual(items[1]?.sides, [true, false, true, false]);
  assert.match(output, /COUNT="2"/);
  assert.match(output, /<NEPOZNATO\/>/);
  assert.doesNotMatch(output, /NAZIV="Stara"/);

  const removed = replaceCorpusE3dBoardEdgeBanding(output, 0, { name: "", materialName: "", materialUid: "", uid: "", sides: [false, false, false, false] });
  const remaining = parseCorpusE3d(removed).elements[0]?.boards[0]?.consumables ?? [];
  assert.deepEqual(remaining.map(({ type, name }) => [type, name]), [["1", "Okov"]]);
  assert.match(removed, /COUNT="1"/);
});
