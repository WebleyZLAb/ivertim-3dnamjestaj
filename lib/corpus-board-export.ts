import type { CorpusS3dBoard, CorpusS3dElement } from "./corpus-s3d.ts";
import { corpusBoardInUsedMaterial } from "./corpus-used-material.ts";

/**
 * Izvoz po pločama, profil „Ivertim" iz Corpusa (`export/Ivertim.exp`, redoslijed kolona
 * 9,10,30,31,32,33,13,7,4,6,0,51,1,50,52,3,47,46; razdjelnik zarez, datoteka corpus.CSV).
 * Za razliku od krojne liste, svaka ploča je poseban red (količina 1).
 *
 * Provjereno na pravim Corpus CSV-ovima (Desktop\IVERTIM - Laptop\CORPUS CSV Export) za Nikica uzglavlje (11/11 redova),
 * Tijana, ormari i Komplet kuća: dimenzije, četiri trake, vlakna, količina, šifra materijala, naziv elementa i daske.
 * - Naziv Mat je `FULLNAME` iz kataloga i prazan kad ga katalog nema (ne naziv materijala).
 * - Naziv Ele je naziv elementa koji neposredno sadrži dasku (npr. "Fronta"), a Šifra Eler razvijen `ESIFRA` tog elementa.
 * - Šifra Daske je razvijen `DSIFRA` daske (makroi u `expandCorpusCode`).
 * - Program (kolona 16) je broj iz atributa `PROGRAM` daske (Corpus ga dodjeljuje pri izvozu i sprema u S3D); kad
 *   projekat nije izvožen u tom stanju, prazno je. Naziv programa (kolona 15) je u svim uzorcima prazan.
* - Ploče bez broja programa, istih mjera, materijala i traka u istom elementu spajaju se u jedan red s količinom 2, 3…
 *   Kad korijenski element još nema nijedan broj programa (nije izvožen), spajaju se samo police (`TIPDASKE=2`), jer se obrada
 *   (koja ploče čini zasebnim redovima) ne može izračunati; ploče s programom su uvijek zasebni redovi (provjereno: Polica + Polica1 daju jedan red sa 2.00).
 * - Tekst je ASCII (č, ć, š, ž, đ → c, c, s, z, d), kao u Corpusovom CSV-u.
 * Duž pripada STR2 i STR3 (visina), Šir pripada STR0 i STR1 (širina; potvrđeno računom dužina traka).
 * Redoslijed unutar para (Duž D = STR3, Šir Do = STR0, Šir Go = STR1) je pretpostavka.
 */

export const BOARD_EXPORT_HEADER = [
  "Dužina", "Širina", "Duž L Šif", "Duž D Šif", "Šir Do Šif", "Šir Go Šif", "God", "Količina", "Šifra Mat", "Naziv Mat",
  "Naziv Ele", "Šifra Eler", "Naziv Daske", "Šifra Daske", "Naziv Programa", "Program", "Primjedba8", "Primjedba",
] as const;

export type BoardExportLookups = {
  /** Naziv materijala iz kataloga. */
  label?: (uid: string, name: string) => string;
  /** Šifra materijala, smjer vlakana i puni naziv (FULLNAME) iz kataloga. */
  details?: (uid: string, name: string) => { code: string; grain: boolean; fullName?: string } | null;
  /** Šifra trake iz kataloga (npr. 1_K697) za dekor, debljinu trake ("1mm") i debljinu ploče (bira širinu trake). */
  edgeCode?: (decorUid: string, edgeName: string, boardThickness?: number) => string;
};

export type CodeContext = {
  /** Naziv objekta čija se šifra razvija (daske ili elementa). */
  name: string;
  /** Naziv korijenskog elementa. */
  topName: string;
  /** Razvijena šifra korijenskog elementa (prazno za sam korijenski element). */
  topCode: string;
  /** Šifra materijala daske, ili prve daske elementa (za %SM%). */
  materialCode?: string;
};

/**
 * Razvija makroe u šifri (`ESIFRA`, `DSIFRA`): %NE% vlastiti naziv, %TPNE% naziv korijenskog elementa,
 * %TPSE% razvijena šifra korijenskog elementa, %KMC% i %KMPO% su "0", %ND% naziv daske (kao %NE% za dasku) i
 * %SM% šifra materijala (cokla sa šifrom %SM% u materijalu 7045 daje "7045"). Provjereno na Corpus CSV-ovima.
 */
export function expandCorpusCode(template: string, context: CodeContext): string {
  return template.replace(/%(NE|TPNE|TPSE|KMC|KMPO|SM|ND)%/g, (_, macro: string) => {
    switch (macro) {
      case "NE": return context.name;
      case "TPNE": return context.topName;
      case "TPSE": return context.topCode;
      case "ND": return context.name;
      case "SM": return context.materialCode ?? "";
      case "KMC": case "KMPO": return "0";
      default: return "";
    }
  });
}

const DIACRITICS: Record<string, string> = { č: "c", ć: "c", š: "s", ž: "z", đ: "d", Č: "C", Ć: "C", Š: "S", Ž: "Z", Đ: "D" };

/** ASCII tekst kao u Corpusovom CSV-u: srpski i hrvatski dijakritici se zamjenjuju osnovnim slovom. */
export function corpusAscii(value: string): string {
  return value.replace(/[čćšžđČĆŠŽĐ]/g, (char) => DIACRITICS[char] ?? char);
}

export function corpusBoardExportRows(elements: readonly CorpusS3dElement[], lookups: BoardExportLookups = {}): string[][] {
  const label = lookups.label ?? ((uid: string, name: string) => name || uid);
  const rows: string[][] = [];
  const mergeKeys: (string | null)[] = [];
  let elementInstance = 0;
  // Korijenski element koji je već izvožen ima brojeve programa u S3D-u; tada su neobrađene ploče sve one bez broja.
  let hasPrograms = false;
  const anyProgram = (element: CorpusS3dElement): boolean => element.boards.some((board) => board.program) || element.children.some(anyProgram);
  const visit = (items: readonly CorpusS3dElement[], top: { name: string; code: string } | null) => {
    items.forEach((element, index) => {
      if (element.visible === false) return;
      const elementName = element.name || element.code || `Element ${index + 1}`;
      const topInfo = top ?? { name: elementName, code: "" };
      const firstBoard = element.boards.find((board) => corpusBoardInUsedMaterial(board)) ?? element.boards[0];
      const materialCodeOf = (board: CorpusS3dBoard | undefined) => board ? (lookups.details?.(board.materialUid, board.materialName)?.code || label(board.materialUid, board.materialName)) : "";
      const elementCode = expandCorpusCode(element.code || "%NE%", { name: elementName, topName: topInfo.name, topCode: top ? top.code : "", materialCode: materialCodeOf(firstBoard) });
      const ownTop = top ?? { name: elementName, code: elementCode };
      const instance = ++elementInstance;
      if (!top) hasPrograms = anyProgram(element);
      for (const board of element.boards) {
        if (!corpusBoardInUsedMaterial(board)) continue;
        const height = board.height!, width = board.width!;
        const edges = board.consumables.filter((item) => item.type === "0");
        const side = (sideIndex: number) => {
          const edge = edges.find((item) => item.sides[sideIndex]);
          return edge ? (lookups.edgeCode?.(edge.materialUid, edge.name, board.thickness ?? undefined) || label(edge.materialUid, edge.materialName)) : "";
        };
        const material = lookups.details?.(board.materialUid, board.materialName);
        const row = [
          height.toFixed(2), width.toFixed(2), side(2), side(3), side(0), side(1), material?.grain ? "true" : "false", "1.00",
          material?.code ?? "", material?.fullName ?? "", elementName, elementCode,
          board.name || "Ploča", expandCorpusCode(board.code || "%NE%", { name: board.name || "Ploča", topName: ownTop.name, topCode: ownTop.code, materialCode: material?.code || label(board.materialUid, board.materialName) }), "", board.program ?? "", board.program1 ?? "", board.note ?? "",
        ].map(corpusAscii);
        // Police istih mjera, materijala i traka u istom elementu: jedan red s većom količinom.
        const mergeKey = !board.program && (hasPrograms || board.boardType === 2) ? JSON.stringify([instance, row[0], row[1], row.slice(2, 6), row[8], board.thickness]) : null;
        const existing = mergeKey === null ? -1 : mergeKeys.indexOf(mergeKey);
        if (existing >= 0) rows[existing]![7] = (Number(rows[existing]![7]) + 1).toFixed(2);
        else { rows.push(row); mergeKeys.push(mergeKey); }
      }
      visit(element.children, ownTop);
    });
  };
  visit(elements, null);
  // Corpus redove grupiše po materijalu (stabilno, redoslijed elemenata se čuva unutar materijala).
  return rows.map((row, index) => ({ row, index })).sort((left, right) => left.row[8]!.localeCompare(right.row[8]!, "hr") || left.index - right.index).map((entry) => entry.row);
}

const cell = (value: string, delimiter: string) => value.includes(delimiter) || /["\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/** CSV kao Corpusov izvoz: bez zaglavlja i bez BOM-a (ASCII), razdjelnik zarez, redovi završavaju CRLF-om. */
export function corpusBoardExportCsv(rows: readonly string[][], options: { delimiter?: "," | ";" | "\t"; header?: boolean; bom?: boolean } = {}): string {
  const delimiter = options.delimiter ?? ",";
  const all = options.header ? [[...BOARD_EXPORT_HEADER], ...rows] : rows;
  return `${options.bom === true ? "\uFEFF" : ""}${all.map((row) => row.map((value) => cell(value, delimiter)).join(delimiter)).join("\r\n")}\r\n`;
}
