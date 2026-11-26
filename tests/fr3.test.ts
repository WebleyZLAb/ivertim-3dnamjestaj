import assert from "node:assert/strict";
import test from "node:test";
import { evaluateNode, evaluateText, parseExpression, type ExprContext, type Row } from "../lib/fastreport/fr3-expr.ts";
import { delphiColor, layoutReport, rtfToText } from "../lib/fastreport/fr3-layout.ts";
import { reportPagesToHtml } from "../lib/fastreport/fr3-html.ts";
import { parseFr3 } from "../lib/fastreport/fr3-parse.ts";
import { describeTemplate } from "../lib/fastreport/fr3-info.ts";
import { buildReportDatasets, readProjectInfo } from "../lib/fastreport/project-datasets.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

const ctx = (rows: Record<string, Row>, variables: Record<string, string> = {}): ExprContext => ({
  variableNames: new Set(Object.keys(variables).map((name) => name.toUpperCase())),
  row: (dataset) => rows[dataset.toUpperCase()],
  variable: (name) => variables[name] ?? variables[name.toUpperCase()],
  system: (name) => name === "PAGE#" ? 3 : undefined,
  forEachBandRow: () => undefined,
});

test("izrazi: polja, aritmetika, IIF i sistemske vrijednosti", () => {
  const context = ctx({ PARTS: { DNAME: "Bok", DQTY: 2, DHEIGHT: 700 } });
  assert.equal(evaluateText('Naziv: [PARTS."DNAME"] x[PARTS."DQTY"]', context), "Naziv: Bok x2");
  assert.equal(evaluateNode(parseExpression('<PARTS."DQTY">*<PARTS."DHEIGHT">+10'), context), 1410);
  assert.equal(evaluateText("[IIF(<PARTS.\"DQTY\">>1,'više','jedan')]", context), "više");
  assert.equal(evaluateText("Strana [Page#]", context), "Strana 3");
  assert.equal(evaluateText("[NEPOZNATO.\"X\"]|", context), "|");
  assert.equal(evaluateText("nema zagrade [ otvorena", context), "nema zagrade [ otvorena");
});

test("boje: Delphi BGR, sistemske i clNone", () => {
  assert.equal(delphiColor("255"), "rgb(255, 0, 0)");
  assert.equal(delphiColor("16777215"), "rgb(255, 255, 255)");
  assert.equal(delphiColor("-16777208"), "#000000");
  assert.equal(delphiColor("536870911"), null);
});

test("rtf se svodi na običan tekst", () => {
  assert.equal(rtfToText(String.raw`{\rtf1{\fonttbl{\f0 Arial;}}Pozdrav\par svijete \'e8}`), "Pozdrav\nsvijete è");
});

const xml = `<?xml version="1.0"?><TfrxReport Version="5.3.13">
<Variables><item Name="ZBIR" Value="SUM(&lt;PARTS.&#34;DHEIGHT&#34;&gt;,DetailData1)"/></Variables>
<TfrxReportPage Name="Page1" PaperWidth="100" PaperHeight="24" LeftMargin="0" RightMargin="0" TopMargin="0" BottomMargin="0">
 <TfrxReportTitle Name="Title" Height="20" Top="0"><TfrxMemoView Left="0" Top="0" Width="100" Height="20" Text="Naslov [PROJECTS.&#34;NAME&#34;]"/></TfrxReportTitle>
 <TfrxMasterData Name="Master" Height="10" Top="30" DataSet="PROJECTS"><TfrxMemoView Left="0" Top="0" Width="50" Height="10" Text="Projekt"/></TfrxMasterData>
 <TfrxGroupHeader Name="Group" Height="10" Top="45" Condition="PARTS.&#34;MATCODE&#34;"><TfrxMemoView Left="0" Top="0" Width="50" Height="10" Text="Grupa [PARTS.&#34;MATCODE&#34;]"/></TfrxGroupHeader>
 <TfrxDetailData Name="DetailData1" Height="10" Top="60" DataSet="PARTS" Filter="&lt;PARTS.&#34;DTYPE&#34;&gt;=0"><TfrxMemoView Left="0" Top="0" Width="50" Height="10" Text="[PARTS.&#34;DNAME&#34;] [Line#]"/></TfrxDetailData>
 <TfrxFooter Name="Foot" Height="10" Top="75"><TfrxMemoView Left="0" Top="0" Width="50" Height="10" Text="Zbir [ZBIR]"/></TfrxFooter>
 <TfrxPageFooter Name="PF" Height="8" Top="90"><TfrxMemoView Left="0" Top="0" Width="50" Height="8" Text="[Page#]/[TOTALPAGES#]"/></TfrxPageFooter>
</TfrxReportPage></TfrxReport>`;
const datasets = {
  PROJECTS: [{ NAME: "P1" }],
  PARTS: [
    { DNAME: "B", MATCODE: "M2", DTYPE: 0, DHEIGHT: 100 }, { DNAME: "A", MATCODE: "M1", DTYPE: 0, DHEIGHT: 200 },
    { DNAME: "F", MATCODE: "M1", DTYPE: 1, DHEIGHT: 999 }, { DNAME: "C", MATCODE: "M1", DTYPE: 0, DHEIGHT: 300 },
  ],
};
const texts = (page: { objects: { kind: string; text?: string }[] }) => page.objects.filter((o) => o.kind === "memo").map((o) => o.text);

test("raspored: naslov, master, grupe, filter detalja, podnožje i brojevi stranica", () => {
  const pages = layoutReport(parseFr3(xml), datasets, { now: new Date(2026, 10, 25) });
  const all = pages.flatMap((page) => texts(page));
  assert.deepEqual(all.filter((text) => !/^\d+\/\d+$/.test(text ?? "")), ["Naslov P1", "Projekt", "Grupa M1", "A 1", "C 2", "Grupa M2", "B 3", "Zbir 600"]);
  assert.equal(pages.length, 2);
  assert.deepEqual(pages.map((page) => texts(page).at(-1)), ["1/2", "2/2"]);
});

test("HTML sadrži stranice i izbjegava ubacivanje značajki iz teksta", () => {
  const html = reportPagesToHtml(layoutReport(parseFr3(xml.replace("Projekt", "<b>x</b>")), datasets));
  assert.match(html, /<div class="fr-page"/);
  assert.doesNotMatch(html, /<b>x<\/b>/);
});

test("skupovi podataka iz projekta i opis šablona", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><ELEMENT ENAME="Korpus" ECODE="K1" ESIRINA="600" EVISINA="720" EDUBINA="560"><DASKE>
    <AD DNAME="Bok" VISINA="700" DUBINA="500" DEBLJINA="18" MATNAME="Bijela" MATUID="W1"><POTROSNI><POTITEM TIP="0" NAZIV="1mm" MATN="K007" MUID="K007" UID="e" STR0="true" STR1="false" STR2="false" STR3="false"/></POTROSNI></AD>
    </DASKE><POTROSNI><POTITEM TIP="1" KOMADA="4" NAZIV="KONFIRMAT" OZN="CONF" UID="u1"/></POTROSNI></ELEMENT></PROJECTFILE>`);
  const sets = buildReportDatasets(project.elements, readProjectInfo("<PROJECTFILE/>", "a.S3D"));
  assert.equal(sets.PROJECTS![0]!.NAME, "a.S3D");
  assert.deepEqual([sets.PARTS!.length, sets.PARTS![0]!.ELEMENTID, sets.PARTS![0]!.DHEIGHT, sets.PARTS![0]!.DEW1CODE], [1, 1, 700, "K007"]);
  assert.deepEqual([sets.ELMFIT![0]!.PARENTID, sets.ELMFIT![0]!.QTY, sets.PRJEDGE![0]!.LEN], [1, 4, 0.58]);
  const info = describeTemplate(parseFr3(xml));
  assert.deepEqual(info.datasets, ["PARTS", "PROJECTS"]);
  assert.deepEqual(info.missing, []);
});

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { addChild, cssToDelphiColor, delphiToCssHex, getNode, newMemo, removeNode, serializeFr3, updateAttrs } from "../lib/fastreport/fr3-edit.ts";

test("uređivanje: izmjena atributa, dodavanje i brisanje ne mijenjaju original", () => {
  const original = parseFr3(xml);
  const snapshot = JSON.stringify(original);
  const memoPath = [1, 0, 0];
  assert.equal(getNode(original, memoPath)!.tag, "TfrxMemoView");
  const moved = updateAttrs(original, memoPath, { Left: "42", Text: "Novi", Width: undefined });
  assert.deepEqual([getNode(moved, memoPath)!.attrs["Left"], getNode(moved, memoPath)!.attrs["Text"], getNode(moved, memoPath)!.attrs["Width"]], ["42", "Novi", undefined]);
  const added = addChild(moved, [1, 0], newMemo(moved, 5, 6));
  assert.equal(getNode(added.root, added.path)!.attrs["Name"], "Memo1");
  assert.equal(getNode(removeNode(added.root, added.path), added.path), null);
  assert.equal(JSON.stringify(original), snapshot);
});

test("serijalizacija čuva sve atribute, znakove i raspored", () => {
  const original = parseFr3(xml);
  const text = 'Navodnik " <b> & red\r\nnovi\ttab';
  const changed = updateAttrs(original, [1, 0, 0], { Text: text });
  const again = parseFr3(serializeFr3(changed));
  assert.equal(getNode(again, [1, 0, 0])!.attrs["Text"], text);
  assert.deepEqual(JSON.parse(JSON.stringify(parseFr3(serializeFr3(original)))), JSON.parse(JSON.stringify(original)));
});

test("boje: CSS i Delphi se pretvaraju u oba smjera", () => {
  assert.equal(cssToDelphiColor("#ff0000"), "255");
  assert.equal(cssToDelphiColor("#0000ff"), "16711680");
  assert.equal(delphiToCssHex("255"), "#ff0000");
  assert.equal(delphiToCssHex("536870911", "#ffffff"), "#ffffff");
});

test("svih 37 isporučenih šablona prolazi parse → serijalizacija → parse bez gubitka", { skip: !existsSync(new URL("../.local-corpus-archive/Template/fr3", import.meta.url)) }, () => {
  const root = new URL("../.local-corpus-archive/Template/fr3/", import.meta.url);
  const walk = (dir: URL): URL[] => readdirSync(dir).flatMap((name) => { const child = new URL(name, dir); return statSync(child).isDirectory() ? walk(new URL(`${name}/`, dir)) : name.endsWith(".fr3") ? [child] : []; });
  const files = walk(root);
  assert.ok(files.length >= 30);
  for (const file of files) {
    const parsed = parseFr3(readFileSync(file, "utf8"));
    assert.deepEqual(parseFr3(serializeFr3(parsed)), parsed, file.pathname);
  }
});
