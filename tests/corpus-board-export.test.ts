import assert from "node:assert/strict";
import test from "node:test";
import { BOARD_EXPORT_HEADER, corpusAscii, corpusBoardExportCsv, corpusBoardExportRows, expandCorpusCode } from "../lib/corpus-board-export.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

const edge = (sides: string) => `<POTITEM TIP="0" NAZIV="1mm" MATN="K007" MUID="K007" UID="e1" ${sides}/>`;
const xml = `<PROJECTFILE VER="17">
<ELEMENT ENAME="Korpus" ESIFRA="K1"><DASKE>
<AD DNAME="Bok" VISINA="1994" DUBINA="560" DEBLJINA="18" MATNAME="Bijela" MATUID="W1"><POTROSNI>${edge('STR0="false" STR1="false" STR2="true" STR3="false"')}</POTROSNI></AD>
<AD DNAME="Ledja" VISINA="574" DUBINA="596" DEBLJINA="3" MATNAME="HDF" MATUID="H1"/>
<AD DNAME="Skrivena" VISINA="10" DUBINA="10" DEBLJINA="18" MATNAME="Bijela" MATUID="W1" VISIBLE="false"/>
</DASKE></ELEMENT></PROJECTFILE>`;

test("izvoz po pločama ima 18 kolona i jedan red po vidljivoj ploči, grupisano po materijalu", () => {
  const rows = corpusBoardExportRows(parseCorpusS3d(xml).elements, {
    details: (uid) => uid === "H1" ? { code: "HDF", grain: false, fullName: "HDF/Lesomal BIJELI" } : { code: "W908", grain: true, fullName: "Osnovna bijela" },
    edgeCode: (uid, name) => `${name.replace("mm", "")}_${uid}`,
  });
  assert.equal(BOARD_EXPORT_HEADER.length, 18);
  assert.deepEqual(rows.map((row) => row.length), [18, 18]);
  // Redoslijed po šifri materijala: HDF prije W908.
  assert.deepEqual(rows[0], ["574.00", "596.00", "", "", "", "", "false", "1.00", "HDF", "HDF/Lesomal BIJELI", "Korpus", "K1", "Ledja", "Ledja", "", "", "", ""]);
  assert.deepEqual(rows[1]!.slice(0, 10), ["1994.00", "560.00", "1_K007", "", "", "", "true", "1.00", "W908", "Osnovna bijela"]);
});

test("CSV profil Ivertim: razdjelnik zarez, bez BOM-a kao Corpus, zaglavlje i BOM po izboru", () => {
  const rows = [["1.00", "a,b"]];
  assert.equal(corpusBoardExportCsv(rows), '1.00,"a,b"\r\n');
  assert.equal(corpusBoardExportCsv(rows, { bom: true, delimiter: ";" }), "\uFEFF1.00;a,b\r\n");
  assert.match(corpusBoardExportCsv(rows, { header: true }), /^Dužina,Širina,/);
});

test("makroi šifre: %NE%, %TPNE%, %TPSE%, %KMC% i %KMPO% kao u Corpusovom izvozu", () => {
  const context = { name: "Radna_Ploha1", topName: "Radna_Ploha", topCode: "Radna_Ploha00" };
  assert.equal(expandCorpusCode("%NE%", context), "Radna_Ploha1");
  assert.equal(expandCorpusCode("%TPNE%", context), "Radna_Ploha");
  // Prava Corpus vrijednosti: daska Radna_Ploha1 → "Radna_Ploha100Radna_Ploha00", korijenski element → "Radna_Ploha00".
  assert.equal(expandCorpusCode("%NE%%KMC%%KMPO%%TPSE%", context), "Radna_Ploha100Radna_Ploha00");
  assert.equal(expandCorpusCode("%NE%%KMC%%KMPO%%TPSE%", { name: "Radna_Ploha", topName: "Radna_Ploha", topCode: "" }), "Radna_Ploha00");
  assert.equal(expandCorpusCode("DONJI_1V", context), "DONJI_1V");
  // Provjereno na Corpus CSV-ovima: %ND% je naziv daske, %SM% šifra materijala (cokla u 7045 → "7045").
  assert.equal(expandCorpusCode("%ND%", { name: "PLAFON1", topName: "B7", topCode: "" }), "PLAFON1");
  assert.equal(expandCorpusCode("%SM%", { ...context, materialCode: "7045" }), "7045");
});

test("ASCII: dijakritici se zamjenjuju kao u Corpusovom CSV-u", () => {
  assert.equal(corpusAscii("BLENDA_bočna Šuma Đurđa ćup žica"), "BLENDA_bocna Suma Durda cup zica");
});

const shelves = `<PROJECTFILE VER="17">
<ELEMENT ENAME="G2V" ESIFRA="%NE%"><DASKE>
<AD DNAME="Lijevi_bok" VISINA="720" DUBINA="320" DEBLJINA="18" MATNAME="Bijela" MATUID="W1" DSIFRA="%NE%"/>
<AD DNAME="Desni_Bok" VISINA="720" DUBINA="320" DEBLJINA="18" MATNAME="Bijela" MATUID="W1" DSIFRA="%NE%"/>
<AD DNAME="PLAFON" VISINA="782" DUBINA="300" DEBLJINA="18" MATNAME="Bijela" MATUID="W1" DSIFRA="DONJI_1V"/>
<AD DNAME="Polica" TIPDASKE="2" VISINA="782" DUBINA="280" DEBLJINA="18" MATNAME="Bijela" MATUID="W1"/>
<AD DNAME="Polica1" TIPDASKE="2" VISINA="782" DUBINA="280" DEBLJINA="18" MATNAME="Bijela" MATUID="W1"/>
</DASKE><ELMLIST><ELM ENAME="Fronta" ESIFRA="%NE%"><DASKE><AD DNAME="FRD" VISINA="700" DUBINA="400" DEBLJINA="18" MATNAME="Bijela" MATUID="W1" TIPFRONTE="1" DSIFRA="%TPNE%"/></DASKE></ELM></ELMLIST></ELEMENT>
</PROJECTFILE>`;

test("police istih mjera u istom elementu se spajaju u jedan red s količinom 2; ostale ploče ostaju zasebne", () => {
  const rows = corpusBoardExportRows(parseCorpusS3d(shelves).elements);
  assert.deepEqual(rows.map((row) => [row[12], row[7]]), [["Lijevi_bok", "1.00"], ["Desni_Bok", "1.00"], ["PLAFON", "1.00"], ["Polica", "2.00"], ["FRD", "1.00"]]);
});

test("šifra daske je razvijen DSIFRA, a element je onaj koji neposredno sadrži dasku", () => {
  const rows = corpusBoardExportRows(parseCorpusS3d(shelves).elements);
  assert.deepEqual(rows.map((row) => [row[10], row[11], row[12], row[13]]), [
    ["G2V", "G2V", "Lijevi_bok", "Lijevi_bok"], ["G2V", "G2V", "Desni_Bok", "Desni_Bok"], ["G2V", "G2V", "PLAFON", "DONJI_1V"], ["G2V", "G2V", "Polica", "Polica"],
    ["Fronta", "Fronta", "FRD", "G2V"],
  ]);
});

test("u izvoženom elementu (ima brojeve programa) spajaju se sve ploče bez programa, a one s programom ne", () => {
  const exported = `<PROJECTFILE VER="17"><ELEMENT ENAME="E" ESIFRA="%NE%"><DASKE>
    <AD DNAME="Lijevi_bok" PROGRAM="100000003" VISINA="720" DUBINA="320" DEBLJINA="18" MATNAME="Bijela" MATUID="W1"/>
    <AD DNAME="Desni_Bok" PROGRAM="100000004" VISINA="720" DUBINA="320" DEBLJINA="18" MATNAME="Bijela" MATUID="W1"/>
    <AD DNAME="Pregrada1" VISINA="500" DUBINA="300" DEBLJINA="18" MATNAME="Bijela" MATUID="W1"/>
    <AD DNAME="Pregrada2" VISINA="500" DUBINA="300" DEBLJINA="18" MATNAME="Bijela" MATUID="W1"/>
  </DASKE></ELEMENT></PROJECTFILE>`;
  const rows = corpusBoardExportRows(parseCorpusS3d(exported).elements);
  assert.deepEqual(rows.map((row) => [row[12], row[7], row[15]]), [["Lijevi_bok", "1.00", "100000003"], ["Desni_Bok", "1.00", "100000004"], ["Pregrada1", "2.00", ""]]);
});
