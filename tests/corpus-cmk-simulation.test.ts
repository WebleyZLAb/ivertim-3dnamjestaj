import assert from "node:assert/strict";
import test from "node:test";
import { corpusMacroBoardContext, simulateCorpusCmk } from "../lib/corpus-cmk-simulation.ts";
import { parseCorpusCmk } from "../lib/corpus-cmk.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

test("simulira dokazive RASTER i POTROSNI vrijednosti bez izvršavanja koda", () => {
  const document = parseCorpusCmk(`[VARIJABLE]\nBROJ=3\n[FORMULE]\nDUBINA=OBJ1.DE+7\n[RASTER1]\nGB=BROJ\nGN=TIPLOVI\nGD=DUBINA\nGF=8\nGX=OBJ1.X+10\nGS=OBJ1.AUTOST\n[POTROSNI1]\nPK1=BROJ*2`);
  const simulation = simulateCorpusCmk(document, { "OBJ1.DE": 18, "OBJ1.X": 100 });
  assert.equal(simulation.unresolvedFormulaCount, 0);
  assert.equal(simulation.operations[0]?.kind, "raster");
  assert.equal(simulation.operations[0]?.fields.find(({ key }) => key === "GD")?.value, 25);
  assert.equal(simulation.operations[0]?.fields.find(({ key }) => key === "GN")?.literal, "TIPLOVI");
  assert.equal(simulation.operations[0]?.fields.find(({ key }) => key === "GS")?.value, null);
  assert.equal(simulation.operations[0]?.fields.find(({ key }) => key === "GS")?.literal, null);
  assert.equal(simulation.operations[1]?.fields[0]?.value, 6);
});

test("gradi OBJ1 i OBJ2 kontekst samo iz stvarnih mjera dasaka", () => {
  const element = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="E" EXPOX="10" EYPOS="20" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560"><DASKE><AD DNAME="Bok" DXPOS="0" DYPOS="100" DZPOS="0" VISINA="720" DUBINA="560" DEBLJINA="18" SMJER="0"/><AD DNAME="Pod" DXPOS="18" DYPOS="100" DZPOS="0" VISINA="564" DUBINA="520" DEBLJINA="18" SMJER="2"/></DASKE></ELEMENT></PROJECTFILE>`).elements[0]!;
  const context = corpusMacroBoardContext(element, element.boards[0]!, element.boards[1]!);
  assert.equal(context.V, 820);
  assert.equal(context["OBJ1.V"], 720);
  assert.equal(context["OBJ1.S"], 560);
  assert.equal(context["OBJ1.DE"], 18);
  assert.equal(context["OBJ2.X"], 18);
  assert.equal(context.SIRINA, 600);
  assert.equal(context.VISINA, 820);
  assert.equal(context.DUBINA, 560);
  assert.equal(context["OBJ1.SMJER"], 0);
  assert.equal(context["OBJ1.GR"], 18);
  assert.equal(context["OBJ1.MINX"], 0);
  assert.equal(context["OBJ1.MAXX"], 720);
  assert.equal(context["OBJ1.MINY"], 0);
  assert.equal(context["OBJ1.MAXY"], 560);
  assert.equal(context["OBJ1.AUTOST"], undefined);
});

test("uzima MIN/MAX makro granice iz nepravilne lokalne konture", () => {
  const element = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="E"><DASKE><AD DNAME="Oblik" VISINA="700" DUBINA="500" DEBLJINA="18" SMJER="2"><KRIVULJE DATA="&quot;PTOCKA=0&quot;,&quot;PTX=-0.01&quot;,&quot;PTZ=0.02&quot;,&quot;PTSTYLE=0&quot;,&quot;PTOCKA=1&quot;,&quot;PTX=0.65&quot;,&quot;PTZ=0.02&quot;,&quot;PTSTYLE=0&quot;,&quot;PTOCKA=2&quot;,&quot;PTX=0.65&quot;,&quot;PTZ=0.48&quot;,&quot;PTSTYLE=0&quot;,&quot;PTOCKA=3&quot;,&quot;PTX=-0.01&quot;,&quot;PTZ=0.48&quot;,&quot;PTSTYLE=0&quot;"/></AD></DASKE></ELEMENT></PROJECTFILE>`).elements[0]!;
  const context = corpusMacroBoardContext(element, element.boards[0]!, null);
  assert.deepEqual(
    [context["OBJ1.MINX"], context["OBJ1.MAXX"], context["OBJ1.MINY"], context["OBJ1.MAXY"]],
    [-10, 650, 20, 480],
  );
});

test("dokazani element i SMJER aliasi rade direktno u CMK formulama", () => {
  const element = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="E" ESIRINA="600" EVISINA="820" EDUBINA="560"><DASKE><AD DNAME="Bok" VISINA="720" DUBINA="560" DEBLJINA="18" SMJER="1"/></DASKE></ELEMENT></PROJECTFILE>`).elements[0]!;
  const document = parseCorpusCmk(`[RASTER1]\nGX=SIRINA/2\nGY=VISINA-20\nGD=DUBINA/10\nGP=OBJ1.SMJER`);
  const simulation = simulateCorpusCmk(document, corpusMacroBoardContext(element, element.boards[0]!, null));
  const fields = Object.fromEntries(simulation.operations[0]!.fields.map((field) => [field.key, field.value]));
  assert.deepEqual(fields, { GX: 300, GY: 800, GD: 56, GP: 1 });
});
