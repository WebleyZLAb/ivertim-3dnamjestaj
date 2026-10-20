import assert from "node:assert/strict";
import test from "node:test";
import { flattenCorpusS3dElements, parseCorpusE3d, parseCorpusS3d } from "../lib/corpus-s3d.ts";

const sample = `<?xml version="1.0" encoding="UTF-8"?>
<PROJECTFILE FILE="D:\\sobasav\\test.S3D" VER="17">
  <SOBA SIRINA="5" DUZINA="4" VISINA="2.6" VISINALOW="2.4"/>
  <SVJETLO AMB1="0"/>
  <KAMERA CAMTYPE="1"/>
  <INFO>071054506C616E65436F6C6C656374696F6E</INFO>
  <CREATOR ID="0"/>
  <ELEMENT ECLAS="TElement" ENAME="Donji element" ESIFRA="D60" EXPOX="1.2" EYPOS="0" EZPOS="2.3" EVISINA="720" ESIRINA="600" EDUBINA="560" EKUT="90" EXKUT="5" EZKUT="-3" EVISIBLE="true" EEDITABLE="true" ELOCKED="false">
    <EVAR VAR0="VISINA_NOGICA=100" VAR1="BROJ_POLICA=2"/>
    <POTROSNI COUNT="1">
      <POTITEM TIP="1" NAZIV="Noga" MATN="NOGA_100" MUID="mat-leg" UID="leg-1" OZN="N100" INDEX="7" TIPD="2" KOMADA="4" STR0="false" STR1="false" STR2="false" STR3="false"/>
    </POTROSNI>
    <DASKE DCOUNT="2">
      <AD DNAME="Bok lijevi" DXPOS="0" DYPOS="0" DZPOS="0" VISINA="720" DUBINA="560" DEBLJINA="18" SMJER="0" DKUT="4" XKUT="2" ZKUT="1" MATNAME="W960_ST7" MATUID="EGGER_W960_ST7" BOJA="10066329" PROZIRNO="false" VISIBLE="true">
        <SELBOX>070D5473656C656374696F6E426F7801020006025551</SELBOX>
        <POTROSNI COUNT="1">
          <POTITEM TIP="0" NAZIV="Rubna traka" MATN="W960_ST7" UID="edge-1" STR0="true" STR1="false" STR2="true" STR3="false"/>
        </POTROSNI>
        <KRIVULJE DATA="&quot;PTOCKA=0&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=0&quot;,&quot;PTZ=0&quot;,&quot;PTOCKA=1&quot;,&quot;PTSTYLE=2&quot;,&quot;PTX=0.72&quot;,&quot;PTZ=0.56&quot;,&quot;PTPR0=0.8&quot;,&quot;PTPR1=0.6&quot;,&quot;PTNE0=0.7&quot;,&quot;PTNE1=0.5&quot;,&quot;PTARRA=0.03&quot;,&quot;PTARSM=1&quot;"/>
        <RUPE>
          <RVAR VAR0="B=VISINA" VAR1="L=ŠIRINA" VAR2="D=DEBLJINA"/>
          <GRUPA14 RXP="B/2-16" RYP="L/2+16" RPL="1" RNA="KIRNER VIJKA" RFI="5" RDU="5" RAA="90"><RAS MODE="4"><MILTOOL>103</MILTOOL><VIS>100</VIS><THRO>false</THRO></RAS></GRUPA14>
          <GRUPA14 RXP="B/2" RYP="L/2" RPL="1" RNA="CENTRALNI VIJAK" RFI="10" RDU="15" RAA="0"/>
        </RUPE>
      </AD>
      <AD DNAME="Polica" DXPOS="18" DYPOS="0" DZPOS="100" VISINA="564" DUBINA="500" DEBLJINA="18" MATNAME="W960_ST7" MATUID="EGGER_W960_ST7" VISIBLE="false"/>
    </DASKE>
    <ELMLIST ECOUNT="1">
      <ELM ECLAS="TfrontaElement" ENAME="Fronta" ESIFRA="F60" EXPOX="2" EYPOS="560" EZPOS="18" EVISINA="716" ESIRINA="596" EDUBINA="18" EVISIBLE="true">
        <DASKE DCOUNT="1"><AD DNAME="Fronta" VISINA="716" DUBINA="596" DEBLJINA="18" MATNAME="F001" MATUID="F001"/></DASKE>
      </ELM>
    </ELMLIST>
  </ELEMENT>
  <PLANES>071054506C616E65436F6C6C656374696F6E</PLANES>
  <DOCU>07165450726F6A6563745F446F6B756D656E746163696A61</DOCU>
</PROJECTFILE>`;

test("obnavlja numeričke XML entitete unutar C6DAT Base64 sadržaja", () => {
  const xml = `<PROJECTFILE VER="17"><ELEMENT ENAME="Makro"><ELINKS><MAKLINK OB1="0" OB2="-1" CSP="0"><MM1 MN="Test"><MSFO C6DAT="eJxz9v&#xA;fzc3UOsTUyBgAPjAKt"/><MSFO C6DAT="drugi"/></MM1><MM2 MN="Druga strana"><MSVA C6DAT="treci"/></MM2></MAKLINK></ELINKS></ELEMENT></PROJECTFILE>`;
  const link = parseCorpusS3d(xml).elements[0]?.macroLinks[0];
  assert.equal(link?.encodedPayloads.MSFO?.[0]?.replaceAll(/\s/g, ""), "eJxz9vfzc3UOsTUyBgAPjAKt");
  assert.deepEqual(link?.encodedPayloads.MSFO?.slice(1), ["drugi"]);
  assert.equal(link?.secondaryName, "Druga strana");
  assert.deepEqual(link?.secondaryEncodedPayloads.MSVA, ["treci"]);
});

test("čita samostalni E3D ELEMENTFILE istim dokazanim modelom", () => {
  const xml = `<ELEMENTFILE FILE="D1V" VER="17"><ELEMENT ECLAS="TElement" ENAME="D1V" ESIRINA="600" EVISINA="820" EDUBINA="560"><DASKE><AD DNAME="Bok" VISINA="720" DUBINA="560" DEBLJINA="18" SMJER="0"/></DASKE></ELEMENT></ELEMENTFILE>`;
  const inspection = parseCorpusE3d(xml);
  assert.equal(inspection.format, "corpus-e3d");
  assert.equal(inspection.sourcePath, "D1V");
  assert.equal(inspection.elements[0]?.name, "D1V");
  assert.equal(inspection.elements[0]?.boards[0]?.name, "Bok");
});

test("čita osnovnu S3D strukturu bez gubitka nepoznatih blokova", () => {
  const project = parseCorpusS3d(sample);

  assert.equal(project.format, "corpus-s3d");
  assert.equal(project.version, "17");
  assert.equal(project.sourcePath, "D:\\sobasav\\test.S3D");
  assert.deepEqual(project.room, { width: 5, length: 4, height: 2.6, lowerHeight: 2.4 });
  assert.equal(project.elements.length, 1);
  assert.deepEqual(project.topLevelTags, ["SOBA", "SVJETLO", "KAMERA", "INFO", "CREATOR", "ELEMENT", "PLANES", "DOCU"]);
  assert.deepEqual(project.unknownTopLevelTags, []);
  assert.deepEqual(project.opaqueHexBlocks, {
    INFO: 1,
    SELBOX: 1,
    PLANES: 1,
    DOCU: 1,
  });
});

test("čita elemente, varijable, daske, materijale, rubove i rupe", () => {
  const project = parseCorpusS3d(sample);
  const element = project.elements[0];
  assert.ok(element);

  assert.equal(element.name, "Donji element");
  assert.equal(element.code, "D60");
  assert.equal(element.className, "TElement");
  assert.deepEqual(element.position, [1.2, 0, 2.3]);
  assert.equal(element.height, 720);
  assert.equal(element.width, 600);
  assert.equal(element.depth, 560);
  assert.equal(element.angle, 90);
  assert.equal(element.xAngle, 5);
  assert.equal(element.zAngle, -3);
  assert.equal(element.visible, true);
  assert.equal(element.editable, true);
  assert.equal(element.locked, false);
  assert.deepEqual(element.variables, { VISINA_NOGICA: "100", BROJ_POLICA: "2" });
  assert.equal(element.boards.length, 2);
  assert.deepEqual(element.consumables, [{
    type: "1",
    name: "Noga",
    materialName: "NOGA_100",
    materialUid: "mat-leg",
    uid: "leg-1",
    designation: "N100",
    index: 7,
    detailType: "2",
    quantity: 4,
    sides: [false, false, false, false],
  }]);

  const board = element.boards[0];
  assert.ok(board);
  assert.equal(board.name, "Bok lijevi");
  assert.deepEqual(board.position, [0, 0, 0]);
  assert.equal(board.height, 720);
  assert.equal(board.width, 560);
  assert.equal(board.thickness, 18);
  assert.equal(board.direction, 0);
  assert.equal(board.angle, 4);
  assert.equal(board.xAngle, 2);
  assert.equal(board.zAngle, 1);
  assert.equal(board.materialName, "W960_ST7");
  assert.equal(board.materialUid, "EGGER_W960_ST7");
  assert.equal(board.color, 10066329);
  assert.equal(board.transparent, false);
  assert.equal(board.visible, true);
  assert.equal(board.holeCount, 2);
  assert.deepEqual(board.holes, [
    { groupType: "GRUPA14", name: "KIRNER VIJKA", xExpression: "B/2-16", yExpression: "L/2+16", diameter: 5, depth: 5, plane: 1, angle: 90, machiningMode: 4, machining: { MILTOOL: "103", VIS: "100", THRO: "false" } },
    { groupType: "GRUPA14", name: "CENTRALNI VIJAK", xExpression: "B/2", yExpression: "L/2", diameter: 10, depth: 15, plane: 1, angle: 0, machiningMode: null, machining: {} },
  ]);
  assert.deepEqual(board.curvePoints, [
    { index: 0, x: 0, z: 0, style: 0, previousControl: null, nextControl: null, arcRadius: null, arcSmooth: null },
    { index: 1, x: 720, z: 560, style: 2, previousControl: [800, 600], nextControl: [700, 500], arcRadius: 30, arcSmooth: 1 },
  ]);
  assert.equal(board.curveIsApproximate, true);
  assert.deepEqual(board.consumables, [
    {
      type: "0",
      name: "Rubna traka",
      materialName: "W960_ST7",
      materialUid: "",
      uid: "edge-1",
      designation: "",
      index: null,
      detailType: "",
      quantity: null,
      sides: [true, false, true, false],
    },
  ]);
});

test("čuva hijerarhiju pod-elemenata i daje stabilan ravni pregled", () => {
  const project = parseCorpusS3d(sample);
  const root = project.elements[0];
  assert.ok(root);
  assert.equal(root.children.length, 1);
  assert.equal(root.children[0]?.name, "Fronta");
  assert.equal(root.children[0]?.boards[0]?.name, "Fronta");

  const flattened = flattenCorpusS3dElements(project.elements);
  assert.deepEqual(flattened.map((element) => element.name), ["Donji element", "Fronta"]);
  assert.equal(flattened.flatMap((element) => element.boards).length, 3);
});

test("prijavljuje nepoznate tagove umjesto da ih tiho protumači", () => {
  const xml = sample
    .replace("<SVJETLO AMB1=\"0\"/>", "<SVJETLO AMB1=\"0\"/><NOVI_MODUL VALUE=\"1\"/>")
    .replace("<EVAR", "<NOVA_FUNKCIJA/><EVAR")
    .replace("<SELBOX>", "<NOVA_OBRADA/><SELBOX>");
  const project = parseCorpusS3d(xml);

  assert.deepEqual(project.unknownTopLevelTags, ["NOVI_MODUL"]);
  assert.deepEqual(project.elements[0]?.unknownChildTags, ["NOVA_FUNKCIJA"]);
  assert.deepEqual(project.elements[0]?.boards[0]?.unknownChildTags, ["NOVA_OBRADA"]);
});

test("odbija neispravan ili pogrešan XML", () => {
  assert.throws(() => parseCorpusS3d("<PROJECTFILE>"), /nije ispravan XML/);
  assert.throws(() => parseCorpusS3d("<OTHER/>"), /nema PROJECTFILE korijen/);
});
