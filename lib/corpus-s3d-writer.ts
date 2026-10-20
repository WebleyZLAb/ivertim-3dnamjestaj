import type { CorpusS3dElement, CorpusS3dHole, CorpusS3dRoom } from "./corpus-s3d.ts";
import { createCorpusWorkingCopyFile } from "./corpus-model.ts";

const ELEMENT_ATTRIBUTE_KEYS = ["EXPOX", "EYPOS", "EZPOS", "ESIRINA", "EVISINA", "EDUBINA", "EKUT", "EXKUT", "EZKUT"] as const;
const ELEMENT_IDENTITY_ATTRIBUTE_KEYS = ["ENAME", "ESIFRA", "ECLAS", "EVISIBLE", "EEDITABLE", "ELOCKED"] as const;
const BOARD_ATTRIBUTE_KEYS = ["DXPOS", "DYPOS", "DZPOS", "DUBINA", "VISINA", "DEBLJINA", "SMJER", "DKUT", "XKUT", "ZKUT"] as const;
const ROOM_ATTRIBUTE_KEYS = ["SIRINA", "DUZINA", "VISINA", "VISINALOW"] as const;

/**
 * Create a new S3D document by changing only proven element geometry attributes.
 * Every unknown tag, opaque block, board and formatting byte outside edited start
 * tags is copied from the original document.
 */
export function writeCorpusS3dGeometryCopy(
  xml: string,
  original: readonly CorpusS3dElement[],
  current: readonly CorpusS3dElement[],
  rooms?: { original: CorpusS3dRoom; current: CorpusS3dRoom },
): string {
  const workingCopy = createCorpusWorkingCopyFile("source.s3d", original, current, "", rooms);
  const changes = workingCopy.changes;
  const boardChanges = workingCopy.boardChanges;
  const boardAppearanceChanges = workingCopy.boardAppearanceChanges;
  const boardHolesChanges = workingCopy.boardHolesChanges;
  const roomChange = workingCopy.roomChange;
  const elementIdentityChanges = workingCopy.elementIdentityChanges;
  if (!changes.length && !boardChanges.length && !boardAppearanceChanges.length && !boardHolesChanges.length && !roomChange && !elementIdentityChanges.length) return xml;

  const byPath = new Map(changes.map((change) => [change.path.join("."), change.after]));
  const boardsByPath = new Map(boardChanges.map((change) => [`${change.elementPath.join(".")}:${change.boardIndex}`, change.after]));
  const boardAppearanceByPath = new Map(boardAppearanceChanges.map((change) => [`${change.elementPath.join(".")}:${change.boardIndex}`, change.after]));
  const boardHolesByPath = new Map(boardHolesChanges.map((change) => [`${change.elementPath.join(".")}:${change.boardIndex}`, change.after]));
  const identitiesByPath = new Map(elementIdentityChanges.map((change) => [change.path.join("."), change.after]));
  const tags = scanXmlTags(xml);
  const replacements: Array<{ start: number; end: number; value: string }> = [];
  const foundPaths = new Set<string>();
  const foundBoardPaths = new Set<string>();
  const foundBoardAppearancePaths = new Set<string>();
  const foundBoardHolesPaths = new Set<string>();
  const foundIdentityPaths = new Set<string>();
  const stack: Array<{ tag: "ELEMENT" | "ELM"; path: number[]; nextChild: number; nextBoard: number }> = [];
  let nextRoot = 0;
  let roomFound = false;
  let activeBoardPath: string | null = null;

  for (const token of tags) {
    if (token.closing) {
      if (token.name === "AD") activeBoardPath = null;
      if ((token.name === "ELEMENT" || token.name === "ELM") && stack.at(-1)?.tag === token.name) stack.pop();
      continue;
    }
    if (token.name === "RUPE" && activeBoardPath && boardHolesByPath.has(activeBoardPath)) {
      const holes = boardHolesByPath.get(activeBoardPath)!;
      const value = serializeHolesContainer(holes);
      if (token.selfClosing) replacements.push({ start: token.start, end: token.end, value });
      else {
        const closing = tags.find((candidate) => candidate.start >= token.end && candidate.closing && candidate.name === "RUPE");
        if (!closing) throw new Error(`RUPE sekcija ploče ${activeBoardPath} nije zatvorena.`);
        replacements.push({ start: token.start, end: closing.end, value });
      }
      foundBoardHolesPaths.add(activeBoardPath);
      continue;
    }
    if (token.name === "SOBA" && roomChange) {
      const roomValues = [roomChange.after.width, roomChange.after.length, roomChange.after.height, roomChange.after.lowerHeight];
      if (roomValues.some((value) => value === null || !Number.isFinite(value) || value! < 0)) {
        throw new Error("Prostorija nema potpune dimenzije za S3D izvoz.");
      }
      let value = token.raw;
      ROOM_ATTRIBUTE_KEYS.forEach((key, index) => { value = setXmlAttribute(value, key, formatS3dNumber(roomValues[index]!)); });
      replacements.push({ start: token.start, end: token.end, value });
      roomFound = true;
      continue;
    }
    if (token.name === "AD") {
      const parent = stack.at(-1);
      if (!parent) continue;
      const boardPath = `${parent.path.join(".")}:${parent.nextBoard++}`;
      activeBoardPath = boardPath;
      const geometry = boardsByPath.get(boardPath);
      const appearance = boardAppearanceByPath.get(boardPath);
      if (geometry || appearance) {
        let value = token.raw;
        if (geometry) {
        foundBoardPaths.add(boardPath);
        const values = [
          geometry.position[0], geometry.position[1], geometry.position[2],
          geometry.width, geometry.height, geometry.thickness, geometry.direction,
          geometry.angle, geometry.xAngle, geometry.zAngle,
        ];
        if (values.some((value) => value === null || !Number.isFinite(value))) {
          throw new Error(`Ploča ${boardPath} nema potpunu geometriju za S3D izvoz.`);
        }
        BOARD_ATTRIBUTE_KEYS.forEach((key, index) => { value = setXmlAttribute(value, key, formatS3dNumber(values[index]!)); });
        }
        if (appearance) {
          if (appearance.color === null || appearance.transparent === null || appearance.visible === null) {
            throw new Error(`Ploča ${boardPath} nema potpun izgled za S3D izvoz.`);
          }
          foundBoardAppearancePaths.add(boardPath);
          value = setXmlAttribute(value, "MATNAME", escapeXmlAttribute(appearance.materialName));
          value = setXmlAttribute(value, "MATUID", escapeXmlAttribute(appearance.materialUid));
          value = setXmlAttribute(value, "BOJA", String(appearance.color));
          value = setXmlAttribute(value, "PROZIRNO", String(appearance.transparent));
          value = setXmlAttribute(value, "VISIBLE", String(appearance.visible));
        }
        replacements.push({ start: token.start, end: token.end, value });
      }
      continue;
    }
    if (token.name !== "ELEMENT" && token.name !== "ELM") continue;

    let path: number[];
    if (token.name === "ELEMENT") path = [nextRoot++];
    else {
      const parent = stack.at(-1);
      if (!parent) throw new Error("S3D sadrži ELM bez roditeljskog ELEMENT/ELM čvora.");
      path = [...parent.path, parent.nextChild++];
    }

    const geometry = byPath.get(path.join("."));
    const identity = identitiesByPath.get(path.join("."));
    if (geometry || identity) {
      let value = token.raw;
      if (geometry) {
      foundPaths.add(path.join("."));
      const values = [
        geometry.position[0], geometry.position[1], geometry.position[2],
        geometry.width, geometry.height, geometry.depth, geometry.angle, geometry.xAngle, geometry.zAngle,
      ];
      if (values.some((value) => value === null || !Number.isFinite(value))) {
        throw new Error(`Element ${path.join(".")} nema potpunu geometriju za S3D izvoz.`);
      }
      ELEMENT_ATTRIBUTE_KEYS.forEach((key, index) => { value = setXmlAttribute(value, key, formatS3dNumber(values[index]!)); });
      }
      if (identity) {
        if (identity.visible === null || identity.editable === null || identity.locked === null) {
          throw new Error(`Element ${path.join(".")} nema potpuno stanje za S3D izvoz.`);
        }
        foundIdentityPaths.add(path.join("."));
        const values = [identity.name, identity.code, identity.className].map(escapeXmlAttribute);
        values.push(String(identity.visible), String(identity.editable), String(identity.locked));
        ELEMENT_IDENTITY_ATTRIBUTE_KEYS.forEach((key, index) => { value = setXmlAttribute(value, key, values[index]!); });
      }
      replacements.push({ start: token.start, end: token.end, value });
    }

    if (!token.selfClosing) stack.push({ tag: token.name, path, nextChild: 0, nextBoard: 0 });
  }

  for (const path of byPath.keys()) {
    if (!foundPaths.has(path)) {
      throw new Error(`Izmijenjeni element ${path} nije pronađen u izvornom S3D dokumentu.`);
    }
  }
  for (const path of boardsByPath.keys()) {
    if (!foundBoardPaths.has(path)) throw new Error(`Izmijenjena ploča ${path} nije pronađena u izvornom S3D dokumentu.`);
  }
  for (const path of boardAppearanceByPath.keys()) {
    if (!foundBoardAppearancePaths.has(path)) throw new Error(`Izgled izmijenjene ploče ${path} nije pronađen u izvornom S3D dokumentu.`);
  }
  for (const path of boardHolesByPath.keys()) {
    if (!foundBoardHolesPaths.has(path)) {
      throw new Error(`RUPE sekcija izmijenjene ploče ${path} nije pronađena u izvornom S3D dokumentu.`);
    }
  }
  for (const path of identitiesByPath.keys()) {
    if (!foundIdentityPaths.has(path)) throw new Error(`Identitet izmijenjenog elementa ${path} nije pronađen u izvornom S3D dokumentu.`);
  }
  if (roomChange && !roomFound) throw new Error("SOBA sekcija nije pronađena u izvornom S3D dokumentu.");

  let output = xml;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, replacement.start) + replacement.value + output.slice(replacement.end);
  }
  return output;
}

/** E3D koristi isti ELEMENT/ELM/AD atributni model, ali nema SOBA sekciju. */
export function writeCorpusE3dGeometryCopy(
  xml: string,
  original: readonly CorpusS3dElement[],
  current: readonly CorpusS3dElement[],
): string {
  return writeCorpusS3dGeometryCopy(xml, original, current);
}

export interface CorpusE3dImportSource {
  sourceFile: string;
  sourceXml: string;
  originalElement: CorpusS3dElement;
}

export interface CorpusNewBoardSpec {
  name: string;
  position: readonly [number, number, number];
  height: number;
  width: number;
  thickness: number;
  direction: 0 | 1 | 2;
  materialName: string;
  materialUid: string;
  color: number;
  transparent: boolean;
  visible: boolean;
}

export interface CorpusStraightContourPoint {
  x: number;
  z: number;
}

export interface CorpusEdgeBandingSpec {
  name: string;
  materialName: string;
  materialUid: string;
  uid: string;
  sides: readonly [boolean, boolean, boolean, boolean];
}

/** Izdvaja jedan izvorni korijenski S3D element u samostalni E3D omotač. */
export function createCorpusE3dSourceFromS3d(xml: string, rootIndex: number): string {
  if (!Number.isInteger(rootIndex) || rootIndex < 0) throw new Error("Indeks korijenskog elementa nije ispravan.");
  const fragments = extractRootElementFragments(xml);
  const fragment = fragments[rootIndex];
  if (!fragment) throw new Error(`Korijenski S3D element ${rootIndex} nije pronađen.`);
  const version = /<PROJECTFILE\b[^>]*\bVER\s*=\s*["']([^"']*)["']/i.exec(xml)?.[1] ?? "17";
  const newline = xml.includes("\r\n") ? "\r\n" : "\n";
  return `<ELEMENTFILE VER="${escapeXmlAttribute(version)}">${newline}${fragment}${newline}</ELEMENTFILE>`;
}

/**
 * Udvostručava direktnu ploču korijenskog E3D elementa bez ponovne
 * serijalizacije ostatka dokumenta. Tako ostaju sačuvani kontura, rupe,
 * obrade i svi još neprotumačeni Corpus blokovi unutar ploče.
 */
export function duplicateCorpusE3dBoard(xml: string, boardIndex: number, name: string): string {
  if (!Number.isInteger(boardIndex) || boardIndex < 0) throw new Error("Indeks ploče nije ispravan.");
  const { container, boards } = findRootBoardFragments(xml);
  const board = boards[boardIndex];
  if (!board) throw new Error(`Ploča ${boardIndex} nije pronađena u E3D elementu.`);
  const fragment = xml.slice(board.start, board.end);
  const opening = scanXmlTags(fragment).find((token) => !token.closing && token.name === "AD");
  if (!opening) throw new Error(`Početak ploče ${boardIndex} nije pronađen.`);
  const renamedOpening = setXmlAttribute(opening.raw, "DNAME", escapeXmlAttribute(name.trim() || `Ploča ${boards.length + 1}`));
  const renamedFragment = renamedOpening + fragment.slice(opening.end);
  const newline = xml.includes("\r\n") ? "\r\n" : "\n";
  const lineStart = xml.lastIndexOf("\n", board.start - 1) + 1;
  const indent = xml.slice(lineStart, board.start).match(/^\s*/)?.[0] ?? "";
  const updatedContainer = setXmlAttribute(container.raw, "DCOUNT", String(boards.length + 1));
  const insertion = `${newline}${indent}${renamedFragment}`;
  return xml.slice(0, container.start) + updatedContainer
    + xml.slice(container.end, board.end) + insertion + xml.slice(board.end);
}

/** Uklanja direktnu ploču korijenskog E3D elementa i čuva ostatak XML-a bajt-po-bajt. */
export function removeCorpusE3dBoard(xml: string, boardIndex: number): string {
  if (!Number.isInteger(boardIndex) || boardIndex < 0) throw new Error("Indeks ploče nije ispravan.");
  const { container, boards } = findRootBoardFragments(xml);
  const board = boards[boardIndex];
  if (!board) throw new Error(`Ploča ${boardIndex} nije pronađena u E3D elementu.`);
  if (boards.length <= 1) throw new Error("Posljednja ploča elementa ne može se ukloniti.");
  const updatedContainer = setXmlAttribute(container.raw, "DCOUNT", String(boards.length - 1));
  let removalStart = board.start;
  const previousNewline = xml.lastIndexOf("\n", board.start - 1);
  if (previousNewline >= container.end && xml.slice(previousNewline + 1, board.start).trim() === "") removalStart = previousNewline;
  return xml.slice(0, container.start) + updatedContainer
    + xml.slice(container.end, removalStart) + xml.slice(board.end);
}

/** Mijenja samo DNAME izabrane direktne ploče korijenskog E3D elementa. */
export function renameCorpusE3dBoard(xml: string, boardIndex: number, name: string): string {
  if (!Number.isInteger(boardIndex) || boardIndex < 0) throw new Error("Indeks ploče nije ispravan.");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Naziv ploče ne može biti prazan.");
  const { boards } = findRootBoardFragments(xml);
  const board = boards[boardIndex];
  if (!board) throw new Error(`Ploča ${boardIndex} nije pronađena u E3D elementu.`);
  const fragment = xml.slice(board.start, board.end);
  const opening = scanXmlTags(fragment).find((token) => !token.closing && token.name === "AD");
  if (!opening) throw new Error(`Početak ploče ${boardIndex} nije pronađen.`);
  const renamed = setXmlAttribute(opening.raw, "DNAME", escapeXmlAttribute(trimmed));
  return xml.slice(0, board.start) + renamed + fragment.slice(opening.end) + xml.slice(board.end);
}

/** Zamjenjuje KRIVULJE izabrane E3D ploče provjerenom zatvorenom konturom ravnih segmenata. */
export function replaceCorpusE3dBoardContour(xml: string, boardIndex: number, points: readonly CorpusStraightContourPoint[]): string {
  if (!Number.isInteger(boardIndex) || boardIndex < 0) throw new Error("Indeks ploče nije ispravan.");
  validateStraightContour(points);
  const { boards } = findRootBoardFragments(xml);
  const board = boards[boardIndex];
  if (!board) throw new Error(`Ploča ${boardIndex} nije pronađena u E3D elementu.`);
  const fragment = xml.slice(board.start, board.end);
  const tags = scanXmlTags(fragment);
  const opening = tags.find((token) => !token.closing && token.name === "AD");
  if (!opening) throw new Error(`Početak ploče ${boardIndex} nije pronađen.`);
  const curveOpeningIndex = tags.findIndex((token) => !token.closing && token.name === "KRIVULJE");
  const curveXml = serializeStraightContour(points);
  let nextFragment: string;
  if (curveOpeningIndex >= 0) {
    const curveOpening = tags[curveOpeningIndex]!;
    if (curveOpening.selfClosing) nextFragment = fragment.slice(0, curveOpening.start) + curveXml + fragment.slice(curveOpening.end);
    else {
      const curveClosing = tags.find((token, index) => index > curveOpeningIndex && token.closing && token.name === "KRIVULJE");
      if (!curveClosing) throw new Error(`KRIVULJE sekcija ploče ${boardIndex} nije zatvorena.`);
      nextFragment = fragment.slice(0, curveOpening.start) + curveXml + fragment.slice(curveClosing.end);
    }
  } else {
    const closing = [...tags].reverse().find((token) => token.closing && token.name === "AD");
    if (!closing) throw new Error(`Ploča ${boardIndex} nema mjesto za KRIVULJE sekciju.`);
    nextFragment = fragment.slice(0, closing.start) + curveXml + fragment.slice(closing.start);
  }
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minZ = Math.min(...points.map((point) => point.z));
  const maxZ = Math.max(...points.map((point) => point.z));
  const nextTags = scanXmlTags(nextFragment);
  const nextOpening = nextTags.find((token) => !token.closing && token.name === "AD")!;
  let resized = setXmlAttribute(nextOpening.raw, "VISINA", formatS3dNumber(maxX - minX));
  resized = setXmlAttribute(resized, "DUBINA", formatS3dNumber(maxZ - minZ));
  nextFragment = resized + nextFragment.slice(nextOpening.end);
  return xml.slice(0, board.start) + nextFragment + xml.slice(board.end);
}

/** Zamjenjuje samo TIP=0 rubnu obradu izabrane E3D ploče i čuva ostale POTITEM zapise. */
export function replaceCorpusE3dBoardEdgeBanding(xml: string, boardIndex: number, spec: CorpusEdgeBandingSpec): string {
  if (!Number.isInteger(boardIndex) || boardIndex < 0) throw new Error("Indeks ploče nije ispravan.");
  if (!spec.name.trim() && spec.sides.some(Boolean)) throw new Error("Naziv rubne trake ne može biti prazan.");
  const { boards } = findRootBoardFragments(xml);
  const board = boards[boardIndex];
  if (!board) throw new Error(`Ploča ${boardIndex} nije pronađena u E3D elementu.`);
  const fragment = xml.slice(board.start, board.end);
  const tags = scanXmlTags(fragment);
  const containerIndex = tags.findIndex((token) => !token.closing && token.name === "POTROSNI");
  const edgeItem = spec.sides.some(Boolean) ? serializeEdgeBanding(spec) : "";
  let nextFragment: string;
  if (containerIndex >= 0) {
    const opening = tags[containerIndex]!;
    if (opening.selfClosing) {
      const replacement = edgeItem ? `<POTROSNI COUNT="1">${edgeItem}</POTROSNI>` : `<POTROSNI COUNT="0"/>`;
      nextFragment = fragment.slice(0, opening.start) + replacement + fragment.slice(opening.end);
    } else {
      const closing = tags.find((token, index) => index > containerIndex && token.closing && token.name === "POTROSNI");
      if (!closing) throw new Error(`POTROSNI sekcija ploče ${boardIndex} nije zatvorena.`);
      const content = fragment.slice(opening.end, closing.start);
      const contentTags = scanXmlTags(content);
      const removals: Array<{ start: number; end: number }> = [];
      let retainedCount = 0;
      for (let index = 0; index < contentTags.length; index += 1) {
        const token = contentTags[index]!;
        if (token.closing || token.name !== "POTITEM") continue;
        const isEdge = xmlAttribute(token.raw, "TIP") === "0";
        if (!isEdge) { retainedCount += 1; continue; }
        if (token.selfClosing) removals.push({ start: token.start, end: token.end });
        else {
          const end = contentTags.find((candidate, candidateIndex) => candidateIndex > index && candidate.closing && candidate.name === "POTITEM");
          if (!end) throw new Error("POTITEM rubne obrade nije zatvoren.");
          removals.push({ start: token.start, end: end.end });
        }
      }
      let retained = content;
      for (const removal of removals.sort((a, b) => b.start - a.start)) retained = retained.slice(0, removal.start) + retained.slice(removal.end);
      const updatedOpening = setXmlAttribute(opening.raw, "COUNT", String(retainedCount + (edgeItem ? 1 : 0)));
      nextFragment = fragment.slice(0, opening.start) + updatedOpening + retained + edgeItem + fragment.slice(closing.start);
    }
  } else {
    if (!edgeItem) return xml;
    const insertBefore = tags.find((token) => !token.closing && token.name === "RUPE")
      ?? [...tags].reverse().find((token) => token.closing && token.name === "AD");
    if (!insertBefore) throw new Error(`Ploča ${boardIndex} nema mjesto za POTROSNI sekciju.`);
    nextFragment = fragment.slice(0, insertBefore.start) + `<POTROSNI COUNT="1">${edgeItem}</POTROSNI>` + fragment.slice(insertBefore.start);
  }
  return xml.slice(0, board.start) + nextFragment + xml.slice(board.end);
}

/** Dodaje novu pravougaonu ploču u direktnu DASKE sekciju korijenskog E3D elementa. */
export function appendCorpusE3dBoard(xml: string, spec: CorpusNewBoardSpec): string {
  validateNewBoardSpec(spec);
  const { container, boards, closing } = findRootBoardFragments(xml);
  const fragment = serializeNewBoard(spec);
  const newline = xml.includes("\r\n") ? "\r\n" : "\n";
  const containerLineStart = xml.lastIndexOf("\n", container.start - 1) + 1;
  const containerIndent = xml.slice(containerLineStart, container.start).match(/^\s*/)?.[0] ?? "";
  const boardIndent = boards.length
    ? (xml.slice(xml.lastIndexOf("\n", boards[0]!.start - 1) + 1, boards[0]!.start).match(/^\s*/)?.[0] ?? `${containerIndent}  `)
    : `${containerIndent}  `;
  if (container.selfClosing) {
    const replacement = `<DASKE DCOUNT="1">${newline}${boardIndent}${fragment}${newline}${containerIndent}</DASKE>`;
    return xml.slice(0, container.start) + replacement + xml.slice(container.end);
  }
  if (!closing) throw new Error("DASKE sekcija nije zatvorena.");
  const updatedContainer = setXmlAttribute(container.raw, "DCOUNT", String(boards.length + 1));
  const insertion = `${newline}${boardIndent}${fragment}`;
  return xml.slice(0, container.start) + updatedContainer
    + xml.slice(container.end, closing.start) + insertion + xml.slice(closing.start);
}

/**
 * Dodaje samostalne E3D korijenske elemente u novu S3D kopiju. Svaki uvezeni
 * element prvo prolazi kroz isti attribute-only writer, pa njegove kasnije
 * lokalne izmjene ostaju uključene bez prepisivanja nepoznatih E3D blokova.
 */
export function writeCorpusS3dWithImportedElements(
  xml: string,
  original: readonly CorpusS3dElement[],
  current: readonly CorpusS3dElement[],
  imports: readonly CorpusE3dImportSource[],
  rooms?: { original: CorpusS3dRoom; current: CorpusS3dRoom },
): string {
  if (current.length !== original.length + imports.length) {
    throw new Error("Broj korijenskih elemenata ne odgovara izvornom S3D-u i uvezenim E3D elementima.");
  }
  let output = writeCorpusS3dGeometryCopy(xml, original, current.slice(0, original.length), rooms);
  if (!imports.length) return output;
  const closing = /<\/PROJECTFILE\s*>/i.exec(output);
  if (!closing || closing.index === undefined) throw new Error("PROJECTFILE završetak nije pronađen za E3D uvoz.");
  const newline = output.includes("\r\n") ? "\r\n" : "\n";
  const fragments = imports.map((source, index) => {
    const currentElement = current[original.length + index];
    if (!currentElement) throw new Error(`Uvezeni E3D element ${index} nedostaje u radnoj kopiji.`);
    const editedE3d = writeCorpusE3dGeometryCopy(source.sourceXml, [source.originalElement], [currentElement]);
    return extractSingleRootElement(editedE3d);
  });
  const prefix = output.slice(0, closing.index);
  const separator = prefix.endsWith("\n") ? "" : newline;
  return `${prefix}${separator}${fragments.join(newline)}${newline}${output.slice(closing.index)}`;
}

type XmlTagToken = {
  start: number;
  end: number;
  raw: string;
  name: string;
  closing: boolean;
  selfClosing: boolean;
};

function scanXmlTags(xml: string): XmlTagToken[] {
  const result: XmlTagToken[] = [];
  for (let start = xml.indexOf("<"); start >= 0; start = xml.indexOf("<", start + 1)) {
    if (xml.startsWith("<!--", start)) {
      const end = xml.indexOf("-->", start + 4);
      if (end < 0) break;
      start = end + 2;
      continue;
    }
    if (xml.startsWith("<![CDATA[", start)) {
      const end = xml.indexOf("]]>", start + 9);
      if (end < 0) break;
      start = end + 2;
      continue;
    }
    let quote = "";
    let end = start + 1;
    for (; end < xml.length; end += 1) {
      const char = xml[end]!;
      if (quote) {
        if (char === quote) quote = "";
      } else if (char === "\"" || char === "'") quote = char;
      else if (char === ">") break;
    }
    if (end >= xml.length) break;
    const raw = xml.slice(start, end + 1);
    const match = raw.match(/^<\s*(\/?)\s*([A-Za-z_][\w:.-]*)/);
    if (match && !raw.startsWith("<?") && !raw.startsWith("<!")) {
      result.push({
        start,
        end: end + 1,
        raw,
        name: match[2]!.toUpperCase(),
        closing: match[1] === "/",
        selfClosing: /\/\s*>$/.test(raw),
      });
    }
    start = end;
  }
  return result;
}

function extractSingleRootElement(xml: string): string {
  const tags = scanXmlTags(xml);
  const startIndex = tags.findIndex((token) => !token.closing && token.name === "ELEMENT");
  if (startIndex < 0) throw new Error("E3D nema korijenski ELEMENT za uvoz.");
  const start = tags[startIndex]!;
  if (start.selfClosing) return start.raw;
  let depth = 0;
  for (let index = startIndex; index < tags.length; index += 1) {
    const token = tags[index]!;
    if (token.name !== "ELEMENT" && token.name !== "ELM") continue;
    if (!token.closing && !token.selfClosing) depth += 1;
    else if (token.closing) depth -= 1;
    if (depth === 0) return xml.slice(start.start, token.end).trim();
  }
  throw new Error("E3D korijenski ELEMENT nije zatvoren.");
}

function extractRootElementFragments(xml: string): string[] {
  const tags = scanXmlTags(xml);
  const result: string[] = [];
  let depth = 0;
  let start: XmlTagToken | null = null;
  for (const token of tags) {
    if (token.name !== "ELEMENT" && token.name !== "ELM") continue;
    if (!token.closing) {
      if (depth === 0) start = token;
      if (!token.selfClosing) depth += 1;
      else if (depth === 0) {
        result.push(token.raw.trim());
        start = null;
      }
    } else {
      depth -= 1;
      if (depth === 0 && start) {
        result.push(xml.slice(start.start, token.end).trim());
        start = null;
      }
    }
  }
  return result;
}

function findRootBoardFragments(xml: string): {
  container: XmlTagToken;
  boards: Array<{ start: number; end: number }>;
  closing: XmlTagToken | null;
} {
  const tags = scanXmlTags(xml);
  const rootIndex = tags.findIndex((token) => !token.closing && token.name === "ELEMENT");
  if (rootIndex < 0) throw new Error("E3D nema korijenski ELEMENT.");
  let elementDepth = 0;
  let rootEnd = xml.length;
  for (let index = rootIndex; index < tags.length; index += 1) {
    const token = tags[index]!;
    if (token.name !== "ELEMENT" && token.name !== "ELM") continue;
    if (!token.closing && !token.selfClosing) elementDepth += 1;
    else if (token.closing) elementDepth -= 1;
    if (elementDepth === 0) { rootEnd = token.end; break; }
  }
  const containerIndex = tags.findIndex((token, index) => index > rootIndex && token.start < rootEnd && !token.closing && token.name === "DASKE");
  if (containerIndex < 0) throw new Error("Korijenski E3D element nema DASKE sekciju.");
  const container = tags[containerIndex]!;
  if (container.selfClosing) return { container, boards: [], closing: null };
  const closingIndex = tags.findIndex((token, index) => index > containerIndex && token.closing && token.name === "DASKE");
  if (closingIndex < 0) throw new Error("DASKE sekcija nije zatvorena.");
  const closing = tags[closingIndex]!;
  const boards: Array<{ start: number; end: number }> = [];
  for (let index = containerIndex + 1; index < closingIndex; index += 1) {
    const token = tags[index]!;
    if (token.closing || token.name !== "AD") continue;
    if (token.selfClosing) {
      boards.push({ start: token.start, end: token.end });
      continue;
    }
    const end = tags.find((candidate, candidateIndex) => candidateIndex > index && candidateIndex < closingIndex && candidate.closing && candidate.name === "AD");
    if (!end) throw new Error(`Ploča ${boards.length} nije zatvorena.`);
    boards.push({ start: token.start, end: end.end });
  }
  return { container, boards, closing };
}

function validateNewBoardSpec(spec: CorpusNewBoardSpec): void {
  const numbers = [...spec.position, spec.height, spec.width, spec.thickness];
  if (!spec.name.trim()) throw new Error("Naziv nove ploče ne može biti prazan.");
  if (numbers.some((value) => !Number.isFinite(value))) throw new Error("Geometrija nove ploče mora sadržati konačne brojeve.");
  if (spec.height <= 0 || spec.width <= 0 || spec.thickness <= 0) throw new Error("Mjere nove ploče moraju biti veće od nule.");
  if (![0, 1, 2].includes(spec.direction)) throw new Error("Smjer nove ploče mora biti 0, 1 ili 2.");
  if (!Number.isInteger(spec.color) || spec.color < 0 || spec.color > 0xffffff) throw new Error("Boja nove ploče nije valjana.");
}

function validateStraightContour(points: readonly CorpusStraightContourPoint[]): void {
  if (points.length < 3) throw new Error("Kontura mora imati najmanje tri tačke.");
  if (points.length > 200) throw new Error("Kontura može imati najviše 200 tačaka.");
  if (points.some(({ x, z }) => !Number.isFinite(x) || !Number.isFinite(z))) throw new Error("Sve tačke konture moraju sadržati konačne brojeve.");
  const consecutive = points.some((point, index) => {
    const next = points[(index + 1) % points.length]!;
    return point.x === next.x && point.z === next.z;
  });
  if (consecutive) throw new Error("Kontura ne smije imati dvije uzastopne jednake tačke.");
  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;
      if (first === second || firstNext === second || secondNext === first) continue;
      if (segmentsIntersect(points[first]!, points[firstNext]!, points[second]!, points[secondNext]!)) {
        throw new Error("Kontura ne smije presijecati samu sebe.");
      }
    }
  }
  const twiceArea = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]!;
    return sum + point.x * next.z - next.x * point.z;
  }, 0);
  if (Math.abs(twiceArea) < 0.001) throw new Error("Kontura mora zatvarati površinu.");
}

function segmentsIntersect(a: CorpusStraightContourPoint, b: CorpusStraightContourPoint, c: CorpusStraightContourPoint, d: CorpusStraightContourPoint): boolean {
  const cross = (p: CorpusStraightContourPoint, q: CorpusStraightContourPoint, r: CorpusStraightContourPoint) => (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  const abC = cross(a, b, c); const abD = cross(a, b, d); const cdA = cross(c, d, a); const cdB = cross(c, d, b);
  return ((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0));
}

function serializeStraightContour(points: readonly CorpusStraightContourPoint[]): string {
  const data = points.flatMap((point, index) => [
    `&quot;PTOCKA=${index}&quot;`, `&quot;PTSTYLE=0&quot;`, `&quot;PTX=${formatS3dNumber(point.x / 1000)}&quot;`, `&quot;PTZ=${formatS3dNumber(point.z / 1000)}&quot;`,
  ]).join(",");
  return `<KRIVULJE DATA="${data}"/>`;
}

function serializeEdgeBanding(spec: CorpusEdgeBandingSpec): string {
  const attributes = [
    `TIP="0"`, `NAZIV="${escapeXmlAttribute(spec.name.trim())}"`, `MATN="${escapeXmlAttribute(spec.materialName.trim())}"`,
    `MUID="${escapeXmlAttribute(spec.materialUid.trim())}"`, `UID="${escapeXmlAttribute(spec.uid.trim())}"`,
    ...spec.sides.map((active, index) => `STR${index}="${active}"`),
  ];
  return `<POTITEM ${attributes.join(" ")}/>`;
}

function xmlAttribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, "i").exec(tag);
  return match?.[2] ?? null;
}

function serializeNewBoard(spec: CorpusNewBoardSpec): string {
  const [x, y, z] = spec.position;
  const h = formatS3dNumber(spec.height / 1000);
  const w = formatS3dNumber(spec.width / 1000);
  const curve = `&quot;PTOCKA=0&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=0&quot;,&quot;PTZ=0&quot;,&quot;PTOCKA=1&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=${h}&quot;,&quot;PTZ=0&quot;,&quot;PTOCKA=2&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=${h}&quot;,&quot;PTZ=${w}&quot;,&quot;PTOCKA=3&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=0&quot;,&quot;PTZ=${w}&quot;`;
  return `<AD DNAME="${escapeXmlAttribute(spec.name.trim())}" DXPOS="${formatS3dNumber(x)}" DYPOS="${formatS3dNumber(y)}" DZPOS="${formatS3dNumber(z)}" VISINA="${formatS3dNumber(spec.height)}" DUBINA="${formatS3dNumber(spec.width)}" DEBLJINA="${formatS3dNumber(spec.thickness)}" SMJER="${spec.direction}" DKUT="0" XKUT="0" ZKUT="0" MATNAME="${escapeXmlAttribute(spec.materialName)}" MATUID="${escapeXmlAttribute(spec.materialUid)}" BOJA="${spec.color}" PROZIRNO="${spec.transparent}" VISIBLE="${spec.visible}"><RUPE/><KRIVULJE DATA="${curve}"/></AD>`;
}

function setXmlAttribute(tag: string, name: string, value: string): string {
  const pattern = new RegExp(`(\\s${name}\\s*=\\s*)(["'])(.*?)\\2`, "i");
  if (pattern.test(tag)) return tag.replace(pattern, (_match, prefix: string, quote: string) => `${prefix}${quote}${value}${quote}`);
  const insertion = tag.match(/\/\s*>$/)?.index ?? tag.lastIndexOf(">");
  return `${tag.slice(0, insertion)} ${name}="${value}"${tag.slice(insertion)}`;
}

function formatS3dNumber(value: number): string {
  return Object.is(value, -0) ? "0" : String(value);
}

function escapeXmlAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("\"", "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function serializeHolesContainer(holes: readonly CorpusS3dHole[]): string {
  if (!holes.length) return "<RUPE/>";
  return `<RUPE>${holes.map(serializeHole).join("")}</RUPE>`;
}

function serializeHole(hole: CorpusS3dHole): string {
  const tag = /^GRUPA\d+$/i.test(hole.groupType) ? hole.groupType.toUpperCase() : "GRUPA14";
  const attributes: Array<[string, string | number | null]> = [
    ["RXP", hole.xExpression], ["RYP", hole.yExpression], ["RPL", hole.plane], ["RNA", hole.name],
    ["RFI", hole.diameter], ["RDU", hole.depth], ["RAL", hole.angle],
  ];
  const encoded = attributes
    .filter(([, value]) => value !== null && value !== "")
    .map(([key, value]) => ` ${key}="${escapeXmlAttribute(String(value))}"`).join("");
  const machiningEntries = Object.entries(hole.machining);
  if (hole.machiningMode === null && !machiningEntries.length) return `<${tag}${encoded}/>`;
  const mode = hole.machiningMode === null ? "" : ` MODE="${formatS3dNumber(hole.machiningMode)}"`;
  const machining = machiningEntries.map(([key, value]) => `<${key}>${escapeXmlText(value)}</${key}>`).join("");
  return `<${tag}${encoded}><RAS${mode}>${machining}</RAS></${tag}>`;
}

function escapeXmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
