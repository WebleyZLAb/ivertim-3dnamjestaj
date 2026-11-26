import { corpusBoardPartKind, type CorpusS3dBoard, type CorpusS3dElement } from "../corpus-s3d.ts";
import { corpusBoardInUsedMaterial } from "../corpus-used-material.ts";
import { buildCorpusConsumablesList } from "../corpus-consumables.ts";
import type { Row } from "./fr3-expr.ts";

/**
 * Skupovi podataka za Corpus šablone izvještaja (PROJECTS, PROJECT, PARTS, ETI, ELEMENT, PRJFIT, PRJEDGE, EDGE, ELMFIT, ELMEDGE).
 * Nazivi polja su preuzeti iz izraza u 37 isporučenih .fr3 šablona. Značenja koja nisu potvrđena
 * u Corpusu označena su u komentarima. Skupovi OPTIPART, OPTPAGE, VRMAT, OPTP i OPE_ALL (optimizacija, cijene, vrste materijala) još nisu dostupni; EXTRA, EQUIPMENT i ACCESSORIES su prazni.
 */

export type ReportDatasets = Record<string, Row[]>;

export type ProjectInfo = {
  fileName: string;
  customer: string;
  /** Datum projekta kao dd.mm.yyyy; prazno ako nije pročitan. */
  date: string;
};

export const AVAILABLE_DATASETS: ReadonlySet<string> = new Set(["PROJECTS", "PROJECT", "PARTS", "ETI", "ELEMENT", "PRJFIT", "PRJEDGE", "EDGE", "ELMFIT", "ELMEDGE", "EXTRA", "EQUIPMENT", "ACCESSORIES"]);

/** Čita podatke o projektu koji se vide u zaglavlju izvještaja. */
export function readProjectInfo(sourceXml: string, fileName: string): ProjectInfo {
  const creator = /<CREATOR\b([^>]*)>/.exec(sourceXml)?.[1] ?? "";
  const attribute = (name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(creator)?.[1]?.trim() ?? "";
  const customer = [attribute("NAZIV"), attribute("PREZ")].filter(Boolean).join(" ");
  return { fileName, customer, date: readInfoDate(sourceXml) };
}

/** INFO je heksadecimalni Delphi tok; polje "dat" je TDateTime (double, dani od 30.12.1899.). */
function readInfoDate(sourceXml: string): string {
  const hex = /<INFO>([0-9A-Fa-f]+)<\/INFO>/.exec(sourceXml)?.[1];
  if (!hex) return "";
  const marker = "0603646174"; // dužina 3 + "dat"
  const at = hex.toLowerCase().indexOf(marker);
  if (at < 0) return "";
  const dataStart = at + marker.length + 2; // preskoči oznaku tipa vrijednosti
  const raw = hex.slice(dataStart, dataStart + 16);
  if (raw.length < 16) return "";
  const bytes = new Uint8Array(8);
  for (let index = 0; index < 8; index++) bytes[index] = parseInt(raw.slice(index * 2, index * 2 + 2), 16);
  const days = new DataView(bytes.buffer).getFloat64(0, true);
  if (!Number.isFinite(days) || days < 36526 || days > 73050) return "";
  const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(days) * 86400000);
  return `${String(date.getUTCDate()).padStart(2, "0")}.${String(date.getUTCMonth() + 1).padStart(2, "0")}.${date.getUTCFullYear()}`;
}

type Label = (uid: string, name: string) => string;
/** Šifra materijala i smjer vlakana (GOD u katalogu: -1 ima vlakna) iz kataloga; null ako materijal nije u katalogu. */
export type EdgeCode = (decorUid: string, edgeName: string) => string;
export type ReportPrices = { fitting?: (uid: string) => number | null; edge?: (decorUid: string, edgeName: string) => number | null };
export type MaterialDetails = (uid: string, name: string) => { code: string; grain: boolean; fullName?: string } | null;

const edgeThickness = (name: string) => { const value = Number(/^(\d+(?:[.,]\d+)?)/.exec(name)?.[1]?.replace(",", ".")); return Number.isFinite(value) ? value : 0; };

/** Vrsta dijela u šablonima (DTYPE): 0 ploča, 1 fronta, 2 pomoćni dio, 3 nepoznato. Pretpostavka, nije potvrđena u Corpusu. */
function partType(board: CorpusS3dBoard): number {
  const kind = corpusBoardPartKind(board.frontType);
  return kind === "board" ? 0 : kind === "front" ? 1 : kind === "auxiliary" ? 2 : 3;
}

export function buildReportDatasets(elements: readonly CorpusS3dElement[], info: ProjectInfo, label: Label = (uid, name) => name || uid, details: MaterialDetails = () => null, edgeCode: EdgeCode = () => "", prices: ReportPrices = {}): ReportDatasets {
  const parts: Row[] = [];
  const edgeTotals = new Map<string, { name: string; code: string; thickness: number; matName: string; length: number; uid: string }>();
  const rootEdges = new Map<number, Map<string, { name: string; code: string; thickness: number; matName: string; length: number; uid: string }>>();
  const roots: Row[] = [];
  const rootFittings: Row[] = [];

  elements.forEach((root, rootIndex) => {
    if (root.visible === false) return;
    const rootId = rootIndex + 1;
    roots.push({
      ID: rootId, CODE: root.code, NAME: root.name, W: root.width, H: root.height, D: root.depth, QTY: 1, DESCR: "", NOTE: "", LABEL: root.name, PRICE: 0, TYPE: 0,
    });
    const visit = (items: readonly CorpusS3dElement[]) => {
      items.forEach((element, elementIndex) => {
        if (element.visible === false) return;
        const elementName = element.name || element.code || `Element ${elementIndex + 1}`;
        element.boards.forEach((board) => {
          if (!corpusBoardInUsedMaterial(board)) return;
          const height = board.height!, width = board.width!, thickness = board.thickness!;
          const side = (index: number) => {
            const edge = board.consumables.find((item) => item.type === "0" && item.sides[index]);
            return edge ? { code: edgeCode(edge.materialUid, edge.name) || label(edge.materialUid, edge.materialName), th: edgeThickness(edge.name) } : { code: "", th: 0 };
          };
          // Duž L = STR2 (potvrđeno u Corpus izvozu), Duž D = STR3, Šir Do = STR0, Šir Go = STR1 (redoslijed u paru pretpostavljen).
          const [h1, w1, h2, w2] = [side(2), side(0), side(3), side(1)];
          const material = details(board.materialUid, board.materialName);
          parts.push({
            PROJECTID: 1, ELEMENTID: rootId, ECODE: root.code || root.name, ENAME: elementName, DNAME: board.name || "Ploča", DQTY: 1, DTYPE: partType(board),
            DHEIGHT: height, DWIDTH: width, DTHICKNESS: thickness, DFINALHEIGHT: height, DFINALWIDTH: width,
            MATERIALID: board.materialUid || board.materialName, MATNAME: label(board.materialUid, board.materialName), MATCODE: material?.code || label(board.materialUid, board.materialName),
            GRAIN: material?.grain ? 1 : 0, GLUEID: 0, DNOTE: "", DNOTEEXTRA: "", DPROGRAM: "", DPROGRAM1: "", PROJECTRNBR: "",
            DEH1CODE: h1.code, DEH1TH: h1.th, DEH2CODE: h2.code, DEH2TH: h2.th, DEW1CODE: w1.code, DEW1TH: w1.th, DEW2CODE: w2.code, DEW2TH: w2.th,
          });
          for (const edge of board.consumables) {
            if (edge.type !== "0") continue;
            const [s0, s1, s2, s3] = edge.sides;
            const sides = edge.sides.filter(Boolean).length;
            // Kao u Corpusu: STR0/STR1 duž širine, STR2/STR3 duž visine, plus 80 mm po oblijepljenoj strani.
            const length = ((s0 ? width : 0) + (s1 ? width : 0) + (s2 ? height : 0) + (s3 ? height : 0)) / 1000 + 0.08 * sides;
            if (sides === 0) continue;
            const matName = label(edge.materialUid, edge.materialName);
            const key = `${edge.name}|${edge.materialUid || edge.materialName}`;
            for (const target of [edgeTotals, rootEdges.get(rootId) ?? rootEdges.set(rootId, new Map()).get(rootId)!]) {
              const entry = target.get(key) ?? { name: edge.name, code: matName, thickness: edgeThickness(edge.name), matName, length: 0, uid: edge.materialUid };
              entry.length += length;
              target.set(key, entry);
            }
          }
        });
        visit(element.children);
      });
    };
    visit([root]);
    for (const item of buildCorpusConsumablesList([root]).filter((entry) => entry.type === "1")) {
      rootFittings.push({ PARENTID: rootId, NAME: item.name, CODE: item.designation || item.uid, CODE1: "", MCODE: "", MAN: "", CAT: "", IMG: "", JMJ: "kom", QTY: item.quantity, PRICE: prices.fitting?.(item.uid) ?? 0, ACCESS: 0 });
    }
  });
  parts.sort((left, right) => Number(left.ELEMENTID) - Number(right.ELEMENTID));

  const edgeRows = (map: Map<string, { name: string; code: string; thickness: number; matName: string; length: number; uid: string }>, extra: Row = {}): Row[] =>
    [...map.values()].map((edge) => ({ NAME: edge.name, CODE: edge.code, MATNAME: edge.matName, MATIMG: "", TH: edge.thickness, W: 0, CL: 0, LEN: Math.round(edge.length * 100) / 100, PRICE: prices.edge?.(edge.uid, edge.name) ?? 0, ...extra }));
  const fittings: Row[] = buildCorpusConsumablesList(elements).filter((item) => item.type === "1").map((item) => ({
    NAME: item.name, CODE: item.designation || item.uid, CODE1: "", CODE2: "", CODE3: "", MCODE: "", MAN: "", CAT: "", CATID: 0, SCAT: "", SCODE: "", SUP: "", IMG: "", JMJ: "kom", QTY: item.quantity, PRICE: prices.fitting?.(item.uid) ?? 0, ACCESS: 0,
  }));
  const elmEdges: Row[] = [...rootEdges.entries()].flatMap(([parentId, map]) => edgeRows(map, { PARENTID: parentId }));
  const project: Row = {
    ID: 1, NAME: info.fileName, KIME: info.customer, KADR: "", KGRA: "", PDAT: info.date, DATE: info.date, PNBR: "", RNBR: "", TPRI: "", AVANS: 0, DSCR: "", DC: "", WLOGO: "", WTTXT: "", WTVAL: "", WCUUTYPE: "",
  };
  return {
    PROJECTS: [project], PROJECT: [project], PARTS: parts, ETI: parts, ELEMENT: roots, PRJFIT: fittings, PRJEDGE: edgeRows(edgeTotals), EDGE: edgeRows(edgeTotals),
    ELMFIT: rootFittings, ELMEDGE: elmEdges, EXTRA: [], EQUIPMENT: [], ACCESSORIES: [],
  };
}
