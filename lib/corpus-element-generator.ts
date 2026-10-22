import { appendCorpusE3dBoard } from "./corpus-s3d-writer.ts";

export type CorpusElementSpec = {
  name: string;
  code: string;
  className?: string;
  width: number;
  height: number;
  depth: number;
  starterDirection: 0 | 1 | 2;
  starterBoardName: string;
  thickness: number;
  materialName: string;
  materialUid: string;
  color: number;
};

export type CorpusGeneratedElementE3d = { fileName: string; sourceXml: string };

/**
 * Pravi minimalan, samostalan Corpus E3D element i početnu pravougaonu ploču.
 * Ploču serijalizuje zajednički E3D writer kako generator i ručno dodavanje
 * ploča ne bi imali dvije različite interpretacije istog formata.
 */
export function generateCorpusElementE3d(spec: CorpusElementSpec): CorpusGeneratedElementE3d {
  validateElementSpec(spec);
  const name = spec.name.trim();
  const code = spec.code.trim();
  const className = spec.className?.trim() || "TElement";
  const fileStem = (code || name || "IVERTIM-ELEMENT")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, "-");
  const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>\n<ELEMENTFILE FILE="${escapeXml(fileStem)}.E3D" VER="17">\n  <ELEMENT ECLAS="${escapeXml(className)}" ENAME="${escapeXml(name)}" ESIFRA="${escapeXml(code)}" EXPOX="0" EYPOS="0" EZPOS="${formatNumber(spec.depth)}" EVISINA="${formatNumber(spec.height)}" ESIRINA="${formatNumber(spec.width)}" EDUBINA="${formatNumber(spec.depth)}" EKUT="0" EXKUT="0" EZKUT="0" EVISIBLE="true" EEDITABLE="true" ELOCKED="false">\n    <DASKE DCOUNT="0"></DASKE>\n  </ELEMENT>\n</ELEMENTFILE>`;
  const [boardHeight, boardWidth] = starterBoardDimensions(spec);
  const sourceXml = appendCorpusE3dBoard(emptyXml, {
    name: spec.starterBoardName.trim(),
    position: [0, 0, 0],
    height: boardHeight,
    width: boardWidth,
    thickness: spec.thickness,
    direction: spec.starterDirection,
    materialName: spec.materialName.trim(),
    materialUid: spec.materialUid.trim(),
    color: spec.color,
    transparent: false,
    visible: true,
  });
  return { fileName: `${fileStem}.E3D`, sourceXml };
}

function starterBoardDimensions(spec: CorpusElementSpec): readonly [number, number] {
  if (spec.starterDirection === 0) return [spec.height, spec.depth];
  if (spec.starterDirection === 1) return [spec.height, spec.width];
  return [spec.width, spec.depth];
}

function validateElementSpec(spec: CorpusElementSpec): void {
  if (!spec.name.trim()) throw new Error("Naziv elementa ne može biti prazan.");
  if (!spec.starterBoardName.trim()) throw new Error("Naziv početne ploče ne može biti prazan.");
  if (![spec.width, spec.height, spec.depth, spec.thickness].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Mjere elementa i debljina ploče moraju biti pozitivni brojevi.");
  }
  if (![0, 1, 2].includes(spec.starterDirection)) throw new Error("Smjer početne ploče nije podržan.");
  if (!Number.isInteger(spec.color) || spec.color < 0 || spec.color > 0xffffff) throw new Error("Boja ploče nije ispravna.");
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}
