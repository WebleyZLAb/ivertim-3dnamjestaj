import { XMLParser, XMLValidator } from "fast-xml-parser";

type XmlRecord = Record<string, unknown>;

export interface CorpusS3dRoom {
  width: number | null;
  length: number | null;
  height: number | null;
  lowerHeight: number | null;
}

export interface CorpusS3dConsumable {
  type: string;
  name: string;
  materialName: string;
  materialUid: string;
  uid: string;
  designation: string;
  index: number | null;
  detailType: string;
  quantity: number | null;
  sides: readonly boolean[];
}

export interface CorpusS3dMacroLink {
  object1: number | null;
  object2: number | null;
  corpusFlag: number | null;
  name: string;
  encodedSections: readonly string[];
  encodedPayloads: Readonly<Record<string, readonly string[]>>;
  secondaryName: string;
  secondaryEncodedSections: readonly string[];
  secondaryEncodedPayloads: Readonly<Record<string, readonly string[]>>;
}

export interface CorpusS3dBoard {
  name: string;
  boardType: number | null;
  frontType: number | null;
  position: readonly [number | null, number | null, number | null];
  height: number | null;
  width: number | null;
  thickness: number | null;
  direction: number | null;
  angle: number | null;
  xAngle: number | null;
  zAngle: number | null;
  materialName: string;
  materialUid: string;
  color: number | null;
  transparent: boolean | null;
  visible: boolean | null;
  curveData: string | null;
  curvePoints: readonly CorpusS3dCurvePoint[];
  curveIsApproximate: boolean;
  holeCount: number;
  holes: readonly CorpusS3dHole[];
  consumables: readonly CorpusS3dConsumable[];
  unknownChildTags: readonly string[];
}

export interface CorpusS3dCurvePoint {
  index: number;
  x: number;
  z: number;
  style: number;
  previousControl: readonly [number, number] | null;
  nextControl: readonly [number, number] | null;
  arcRadius: number | null;
  arcSmooth: number | null;
}

export interface CorpusS3dHole {
  groupType: string;
  name: string;
  xExpression: string;
  yExpression: string;
  diameter: number | null;
  depth: number | null;
  plane: number | null;
  angle: number | null;
  machiningMode: number | null;
  machining: Readonly<Record<string, string>>;
}

export interface CorpusS3dElement {
  name: string;
  code: string;
  className: string;
  position: readonly [number | null, number | null, number | null];
  height: number | null;
  width: number | null;
  depth: number | null;
  angle: number | null;
  xAngle: number | null;
  zAngle: number | null;
  visible: boolean | null;
  editable: boolean | null;
  locked: boolean | null;
  variables: Readonly<Record<string, string>>;
  boards: readonly CorpusS3dBoard[];
  consumables: readonly CorpusS3dConsumable[];
  macroLinks: readonly CorpusS3dMacroLink[];
  children: readonly CorpusS3dElement[];
  unknownChildTags: readonly string[];
}

export interface CorpusS3dInspection {
  format: "corpus-s3d" | "corpus-e3d";
  version: string;
  sourcePath: string;
  room: CorpusS3dRoom;
  elements: readonly CorpusS3dElement[];
  topLevelTags: readonly string[];
  opaqueHexBlocks: Readonly<Record<string, number>>;
  unknownTopLevelTags: readonly string[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: false,
  allowBooleanAttributes: false,
});

const KNOWN_TOP_LEVEL_TAGS = new Set([
  "SOBA",
  "SVJETLO",
  "KAMERA",
  "INFO",
  "CREATOR",
  "ELEMENT",
  "PLANES",
  "DOCU",
]);

const KNOWN_ELEMENT_CHILD_TAGS = new Set([
  "EVAR",
  "EFVK",
  "SCMENU",
  "ACCGRP",
  "DASKE",
  "ELMLIST",
  "ELINKS",
  "EFRDATA",
  "EKOTE",
  "ESLIM",
  "SELBOX",
  "POTROSNI",
]);

const KNOWN_BOARD_CHILD_TAGS = new Set([
  "SELBOX",
  "POTROSNI",
  "KRIVULJE",
  "RUPE",
  "MAK",
  "MAKLINK",
  "MILTOOL",
  "CONMIL",
  "RAS",
  "ANG",
  "LAMSD",
  "LAMELLO",
  "PRO",
  "SVK",
  "BRR",
  "DKOTE",
]);

export function parseCorpusS3d(xml: string): CorpusS3dInspection {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    const detail = typeof validation === "object" ? validation.err.msg : "nepoznata XML greška";
    throw new Error(`Corpus S3D nije ispravan XML: ${detail}`);
  }

  const parsed = asRecord(parser.parse(xml));
  const project = asRecord(parsed.PROJECTFILE);
  if (!Object.keys(project).length) throw new Error("Corpus S3D nema PROJECTFILE korijen.");

  const room = asRecord(project.SOBA);
  const elements = asArray(project.ELEMENT).map((value) => parseElement(asRecord(value)));
  const topLevelTags = childTags(project);

  return {
    format: "corpus-s3d",
    version: text(project["@_VER"]),
    sourcePath: text(project["@_FILE"]),
    room: {
      width: numeric(room["@_SIRINA"]),
      length: numeric(room["@_DUZINA"]),
      height: numeric(room["@_VISINA"]),
      lowerHeight: numeric(room["@_VISINALOW"]),
    },
    elements,
    topLevelTags,
    opaqueHexBlocks: countOpaqueBlocks(project),
    unknownTopLevelTags: topLevelTags.filter((tag) => !KNOWN_TOP_LEVEL_TAGS.has(tag)),
  };
}

/** Čita samostalni Corpus element iz ELEMENTFILE biblioteke bez izmjene izvora. */
export function parseCorpusE3d(xml: string): CorpusS3dInspection {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    const detail = typeof validation === "object" ? validation.err.msg : "nepoznata XML greška";
    throw new Error(`Corpus E3D nije ispravan XML: ${detail}`);
  }
  const parsed = asRecord(parser.parse(xml));
  const elementFile = asRecord(parsed.ELEMENTFILE);
  if (!Object.keys(elementFile).length) throw new Error("Corpus E3D nema ELEMENTFILE korijen.");
  const topLevelTags = childTags(elementFile);
  return {
    format: "corpus-e3d",
    version: text(elementFile["@_VER"]),
    sourcePath: text(elementFile["@_FILE"]),
    room: { width: null, length: null, height: null, lowerHeight: null },
    elements: asArray(elementFile.ELEMENT).map((value) => parseElement(asRecord(value))),
    topLevelTags,
    opaqueHexBlocks: countOpaqueBlocks(elementFile),
    unknownTopLevelTags: topLevelTags.filter((tag) => tag !== "ELEMENT"),
  };
}

function parseElement(element: XmlRecord): CorpusS3dElement {
  const boardsContainer = asRecord(element.DASKE);
  const variables = Object.fromEntries(
    Object.entries(asRecord(element.EVAR))
      .filter(([key]) => key.startsWith("@_VAR"))
      .map(([, value]) => splitVariable(text(value)))
      .filter((entry): entry is [string, string] => entry !== null),
  );
  const tags = childTags(element);
  const childContainer = asRecord(element.ELMLIST);
  const children = asArray(childContainer.ELM).map((value) => parseElement(asRecord(value)));
  const consumablesContainer = asRecord(element.POTROSNI);
  const linksContainer = asRecord(element.ELINKS);

  return {
    name: text(element["@_ENAME"]),
    code: text(element["@_ESIFRA"]),
    className: text(element["@_ECLAS"]),
    position: [numeric(element["@_EXPOX"]), numeric(element["@_EYPOS"]), numeric(element["@_EZPOS"])],
    height: numeric(element["@_EVISINA"]),
    width: numeric(element["@_ESIRINA"]),
    depth: numeric(element["@_EDUBINA"]),
    angle: numeric(element["@_EKUT"]),
    xAngle: numeric(element["@_EXKUT"]),
    zAngle: numeric(element["@_EZKUT"]),
    visible: booleanValue(element["@_EVISIBLE"]),
    editable: booleanValue(element["@_EEDITABLE"]),
    locked: booleanValue(element["@_ELOCKED"]),
    variables,
    boards: asArray(boardsContainer.AD).map((value) => parseBoard(asRecord(value))),
    consumables: asArray(consumablesContainer.POTITEM).map((value) => parseConsumable(asRecord(value))),
    macroLinks: asArray(linksContainer.MAKLINK).map((value) => parseMacroLink(asRecord(value))),
    children,
    unknownChildTags: tags.filter((tag) => !KNOWN_ELEMENT_CHILD_TAGS.has(tag)),
  };
}

function parseMacroLink(link: XmlRecord): CorpusS3dMacroLink {
  const macro = asRecord(link.MM1);
  const secondaryMacro = asRecord(link.MM2);
  const encodedPayloads = parseMacroPayloads(macro);
  const secondaryEncodedPayloads = parseMacroPayloads(secondaryMacro);
  return {
    object1: numeric(link["@_OB1"]),
    object2: numeric(link["@_OB2"]),
    corpusFlag: numeric(link["@_CSP"]),
    name: text(macro["@_MN"]),
    encodedSections: Object.keys(encodedPayloads),
    encodedPayloads,
    secondaryName: text(secondaryMacro["@_MN"]),
    secondaryEncodedSections: Object.keys(secondaryEncodedPayloads),
    secondaryEncodedPayloads,
  };
}

function parseMacroPayloads(macro: XmlRecord): Record<string, readonly string[]> {
  return Object.fromEntries(Object.entries(macro).flatMap(([key, value]) => {
    if (key.startsWith("@_")) return [];
    const payloads = asArray(value)
      .map((entry) => asRecord(entry)["@_C6DAT"])
      .filter((payload) => payload !== undefined)
      .map((payload) => decodeXmlEntities(text(payload)));
    return payloads.length ? [[key, payloads] as const] : [];
  }));
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replaceAll(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replaceAll("&quot;", "\"").replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

function parseBoard(board: XmlRecord): CorpusS3dBoard {
  const consumablesContainer = asRecord(board.POTROSNI);
  const curve = asRecord(board.KRIVULJE);
  const tags = childTags(board);
  const holes = parseHoles(asRecord(board.RUPE));
  const curveData = nullableText(curve["@_DATA"]);
  const curvePoints = parseCurvePoints(curveData);

  return {
    name: text(board["@_DNAME"]),
    boardType: numeric(board["@_TIPDASKE"]),
    frontType: numeric(board["@_TIPFRONTE"]),
    position: [numeric(board["@_DXPOS"]), numeric(board["@_DYPOS"]), numeric(board["@_DZPOS"])],
    height: numeric(board["@_VISINA"]),
    width: numeric(board["@_DUBINA"]),
    thickness: numeric(board["@_DEBLJINA"]),
    direction: numeric(board["@_SMJER"]),
    angle: numeric(board["@_DKUT"]),
    xAngle: numeric(board["@_XKUT"]),
    zAngle: numeric(board["@_ZKUT"]),
    materialName: text(board["@_MATNAME"]),
    materialUid: text(board["@_MATUID"]),
    color: numeric(board["@_BOJA"]),
    transparent: booleanValue(board["@_PROZIRNO"]),
    visible: booleanValue(board["@_VISIBLE"]),
    curveData,
    curvePoints,
    curveIsApproximate: curvePoints.some((point) => point.style !== 0),
    holeCount: holes.length,
    holes,
    consumables: asArray(consumablesContainer.POTITEM).map((value) => parseConsumable(asRecord(value))),
    unknownChildTags: tags.filter((tag) => !KNOWN_BOARD_CHILD_TAGS.has(tag)),
  };
}

export function parseCurvePoints(data: string | null): CorpusS3dCurvePoint[] {
  if (!data) return [];
  const values = [...data.matchAll(/"([^"]*)"/g)].map((match) => match[1] ?? "");
  const points: CorpusS3dCurvePoint[] = [];
  let current: Partial<CorpusS3dCurvePoint> & { previousX?: number; previousZ?: number; nextX?: number; nextZ?: number } | null = null;
  const flush = () => {
    if (current?.index !== undefined && current.x !== undefined && current.z !== undefined) {
      points.push({
        index: current.index,
        x: current.x * 1000,
        z: current.z * 1000,
        style: current.style ?? 0,
        previousControl: current.previousX !== undefined && current.previousZ !== undefined ? [current.previousX * 1000, current.previousZ * 1000] : null,
        nextControl: current.nextX !== undefined && current.nextZ !== undefined ? [current.nextX * 1000, current.nextZ * 1000] : null,
        arcRadius: typeof current.arcRadius === "number" ? current.arcRadius * 1000 : null,
        arcSmooth: typeof current.arcSmooth === "number" ? current.arcSmooth : null,
      });
    }
  };
  for (const value of values) {
    const separator = value.indexOf("=");
    if (separator < 1) continue;
    const key = value.slice(0, separator);
    const raw = value.slice(separator + 1);
    if (key === "PTOCKA") {
      flush();
      current = { index: Number(raw) };
    } else if (current && key === "PTX") current.x = Number(raw);
    else if (current && key === "PTZ") current.z = Number(raw);
    else if (current && key === "PTSTYLE") current.style = Number(raw);
    else if (current && key === "PTPR0") current.previousX = Number(raw);
    else if (current && key === "PTPR1") current.previousZ = Number(raw);
    else if (current && key === "PTNE0") current.nextX = Number(raw);
    else if (current && key === "PTNE1") current.nextZ = Number(raw);
    else if (current && key === "PTARRA") current.arcRadius = Number(raw);
    else if (current && key === "PTARSM") current.arcSmooth = Number(raw);
  }
  flush();
  return points.filter((point) => [point.index, point.x, point.z, point.style].every(Number.isFinite));
}

function parseHoles(container: XmlRecord): CorpusS3dHole[] {
  const holes: CorpusS3dHole[] = [];
  for (const [groupType, value] of Object.entries(container)) {
    if (!/^GRUPA\d+$/i.test(groupType)) continue;
    for (const entry of asArray(value)) {
      const hole = asRecord(entry);
      const machining = asRecord(hole.RAS);
      holes.push({
        groupType,
        name: text(hole["@_RNA"]),
        xExpression: text(hole["@_RXP"]),
        yExpression: text(hole["@_RYP"]),
        diameter: numeric(hole["@_RFI"]),
        depth: numeric(hole["@_RDU"]),
        plane: numeric(hole["@_RPL"]),
        angle: numeric(hole["@_RAA"]),
        machiningMode: numeric(machining["@_MODE"]),
        machining: Object.fromEntries(Object.entries(machining)
          .filter(([key, raw]) => !key.startsWith("@_") && typeof raw !== "object")
          .map(([key, raw]) => [key, text(raw)])),
      });
    }
  }
  return holes;
}

function parseConsumable(item: XmlRecord): CorpusS3dConsumable {
  return {
    type: text(item["@_TIP"]),
    name: text(item["@_NAZIV"]),
    materialName: text(item["@_MATN"]),
    materialUid: text(item["@_MUID"]),
    uid: text(item["@_UID"]),
    designation: text(item["@_OZN"]),
    index: numeric(item["@_INDEX"]),
    detailType: text(item["@_TIPD"]),
    quantity: numeric(item["@_KOMADA"]),
    sides: [0, 1, 2, 3].map((side) => booleanValue(item[`@_STR${side}`]) === true),
  };
}

/** Return every element in stable parent-before-child order. */
export function flattenCorpusS3dElements(
  elements: readonly CorpusS3dElement[],
): CorpusS3dElement[] {
  const flattened: CorpusS3dElement[] = [];
  for (const element of elements) {
    flattened.push(element, ...flattenCorpusS3dElements(element.children));
  }
  return flattened;
}

function countOpaqueBlocks(value: unknown): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  visit(value, (key, child) => {
    if (key === "#text" && typeof child === "string" && isOpaqueHex(child)) {
      counts.HEX = (counts.HEX ?? 0) + 1;
    } else if (typeof child === "string" && isOpaqueHex(child)) {
      counts[key.replace(/^@_/, "")] = (counts[key.replace(/^@_/, "")] ?? 0) + 1;
    }
  });
  return counts;
}

function visit(value: unknown, callback: (key: string, value: unknown) => void): void {
  if (Array.isArray(value)) {
    for (const child of value) visit(child, callback);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    callback(key, child);
    visit(child, callback);
  }
}

function isOpaqueHex(value: string): boolean {
  const compact = value.trim();
  return compact.length >= 32 && compact.length % 2 === 0 && /^[0-9a-f]+$/i.test(compact);
}

function childTags(record: XmlRecord): string[] {
  return Object.keys(record).filter((key) => !key.startsWith("@_") && key !== "#text");
}

function splitVariable(value: string): [string, string] | null {
  const separator = value.indexOf("=");
  if (separator <= 0) return null;
  return [value.slice(0, separator), value.slice(separator + 1)];
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function asRecord(value: unknown): XmlRecord {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is XmlRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function nullableText(value: unknown): string | null {
  const result = text(value);
  return result ? result : null;
}

function numeric(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: unknown): boolean | null {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return null;
}
