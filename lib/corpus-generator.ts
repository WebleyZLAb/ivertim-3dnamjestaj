export type CorpusCabinetSpec = {
  name: string;
  code: string;
  width: number;
  height: number;
  depth: number;
  thickness: number;
  shelfCount: number;
  shelfOffsets?: readonly number[];
  shelfFrontInset?: number;
  shelfRearInset?: number;
  dividerCount?: number;
  dividerOffsets?: readonly number[];
  baseHeight?: number;
  includePlinth?: boolean;
  plinthInset?: number;
  topConstruction?: "full" | "stretchers";
  stretcherWidth?: number;
  rearStretcherInset?: number;
  includeBack: boolean;
  backType?: "panel" | "thin";
  backThickness?: number;
  backMaterialName?: string;
  backColor?: number;
  materialName: string;
  color: number;
  frontCount?: number;
  frontLayout?: "doors" | "drawers";
  frontMount?: "overlay" | "inset";
  frontWeights?: readonly number[];
  frontThickness?: number;
  frontGap?: number;
  frontMaterialName?: string;
  frontColor?: number;
};

export type CorpusGeneratedE3d = { fileName: string; sourceXml: string };

export function generateCorpusCabinetE3d(spec: CorpusCabinetSpec): CorpusGeneratedE3d {
  validateSpec(spec);
  const baseHeight = spec.baseHeight ?? 0;
  const bodyHeight = spec.height - baseHeight;
  const innerWidth = spec.width - spec.thickness * 2;
  const innerHeight = bodyHeight - spec.thickness * 2;
  const dividerCount = spec.dividerCount ?? 0;
  const bayCount = dividerCount + 1;
  const evenBayWidth = (innerWidth - dividerCount * spec.thickness) / bayCount;
  const dividerOffsets = spec.dividerOffsets ?? Array.from({ length: dividerCount }, (_, index) => evenBayWidth * (index + 1) + spec.thickness * index);
  const bayStarts = [spec.thickness, ...dividerOffsets.map((offset) => spec.thickness + offset + spec.thickness)];
  const bayWidths = dividerOffsets.map((offset, index) => offset - (index === 0 ? 0 : dividerOffsets[index - 1]! + spec.thickness));
  bayWidths.push(innerWidth - (dividerOffsets.at(-1) ?? -spec.thickness) - spec.thickness);
  const shelfFrontInset = spec.shelfFrontInset ?? 0;
  const shelfRearInset = spec.shelfRearInset ?? 0;
  const shelfDepth = spec.depth - shelfFrontInset - shelfRearInset;
  const topConstruction = spec.topConstruction ?? "full";
  const boardAttributes = `VISIBLE="true" PROZIRNO="false" MATNAME="${escapeXml(spec.materialName.trim())}" BOJA="${spec.color}"`;
  const boards: string[] = [
    board("Lijevi bok", 0, baseHeight, 0, bodyHeight, spec.depth, spec.thickness, 0, boardAttributes),
    board("Desni bok", spec.width - spec.thickness, baseHeight, 0, bodyHeight, spec.depth, spec.thickness, 0, boardAttributes),
    board("Pod", spec.thickness, baseHeight, 0, innerWidth, spec.depth, spec.thickness, 2, boardAttributes),
  ];
  if (topConstruction === "full") {
    boards.push(board("Strop", spec.thickness, spec.height - spec.thickness, 0, innerWidth, spec.depth, spec.thickness, 2, boardAttributes));
  } else {
    const stretcherWidth = spec.stretcherWidth ?? 100;
    const rearInset = spec.rearStretcherInset ?? 40;
    boards.push(board("Prednji vezač", spec.thickness, spec.height - spec.thickness, 0, innerWidth, stretcherWidth, spec.thickness, 2, boardAttributes));
    boards.push(board("Zadnji vezač", spec.thickness, spec.height - spec.thickness, -(spec.depth - stretcherWidth - rearInset), innerWidth, stretcherWidth, spec.thickness, 2, boardAttributes));
  }
  for (let index = 1; index <= dividerCount; index += 1) {
    const x = spec.thickness + dividerOffsets[index - 1]!;
    boards.push(board(`Pregrada ${index}`, round(x), baseHeight + spec.thickness, 0, innerHeight, spec.depth, spec.thickness, 0, boardAttributes));
  }
  const shelfOffsets = spec.shelfOffsets ?? Array.from({ length: spec.shelfCount }, (_, index) => innerHeight * (index + 1) / (spec.shelfCount + 1));
  for (let level = 1; level <= shelfOffsets.length; level += 1) {
    const y = baseHeight + spec.thickness + shelfOffsets[level - 1]!;
    for (let bay = 0; bay < bayCount; bay += 1) {
      const x = bayStarts[bay]!;
      const name = dividerCount === 0 ? `Polica ${level}` : `Polica ${level} / polje ${bay + 1}`;
      boards.push(board(name, round(x), round(y), -shelfFrontInset, round(bayWidths[bay]!), shelfDepth, spec.thickness, 2, boardAttributes));
    }
  }
  if (spec.includeBack) {
    const backType = spec.backType ?? "panel";
    const backThickness = backType === "thin" ? (spec.backThickness ?? 3) : spec.thickness;
    const backZ = backType === "thin" ? -spec.depth : -(spec.depth - spec.thickness);
    const backAttributes = backType === "thin"
      ? `VISIBLE="true" PROZIRNO="false" MATNAME="${escapeXml((spec.backMaterialName ?? "HDF bijeli").trim())}" BOJA="${spec.backColor ?? 0xffffff}" TIPDASKE="8"`
      : boardAttributes;
    boards.push(board("Leđa", spec.thickness, baseHeight + spec.thickness, backZ, innerHeight, innerWidth, backThickness, 1, backAttributes));
  }
  if (spec.includePlinth) {
    boards.push(board("Cokla", spec.thickness, 0, -(spec.plinthInset ?? 30), baseHeight, innerWidth, spec.thickness, 1, boardAttributes));
  }
  const frontCount = spec.frontCount ?? 0;
  if (frontCount > 0) {
    const frontThickness = spec.frontThickness ?? spec.thickness;
    const frontGap = spec.frontGap ?? 2;
    const frontLayout = spec.frontLayout ?? "doors";
    const frontMount = spec.frontMount ?? "overlay";
    const frameX = frontMount === "inset" ? spec.thickness : 0;
    const frameY = frontMount === "inset" ? baseHeight + spec.thickness : baseHeight;
    const frameWidth = frontMount === "inset" ? innerWidth : spec.width;
    const frameHeight = frontMount === "inset" ? innerHeight : bodyHeight;
    const availableSpan = (frontLayout === "drawers" ? frameHeight : frameWidth) - frontGap * (frontCount + 1);
    const weightTotal = spec.frontWeights?.reduce((sum, value) => sum + value, 0) ?? frontCount;
    const frontSpans = Array.from({ length: frontCount }, (_, index) => availableSpan * (spec.frontWeights?.[index] ?? 1) / weightTotal);
    const frontAttributes = `VISIBLE="true" PROZIRNO="false" MATNAME="${escapeXml((spec.frontMaterialName ?? spec.materialName).trim())}" BOJA="${spec.frontColor ?? spec.color}" TIPDASKE="1" TIPFRONTE="2"`;
    let spanOffset = 0;
    for (let index = 0; index < frontCount; index += 1) {
      if (frontLayout === "drawers") {
        const frontHeight = frontSpans[index]!;
        const y = frameY + frontGap + spanOffset;
        boards.push(board(`Fronta ladice ${index + 1}`, frameX + frontGap, round(y), 0, round(frontHeight), frameWidth - frontGap * 2, frontThickness, 1, frontAttributes));
      } else {
        const frontHeight = frameHeight - frontGap * 2;
        const frontWidth = frontSpans[index]!;
        const x = frameX + frontGap + spanOffset;
        boards.push(board(frontCount === 1 ? "Fronta" : `Fronta ${index + 1}`, round(x), frameY + frontGap, 0, frontHeight, round(frontWidth), frontThickness, 1, frontAttributes));
      }
      spanOffset += frontSpans[index]! + frontGap;
    }
  }

  const safeName = spec.name.trim();
  const safeCode = spec.code.trim();
  const fileStem = (safeCode || safeName || "IVERTIM-KORPUS").replace(/[<>:"/\\|?*\x00-\x1f]/g, "-").replace(/\s+/g, "-");
  const sourceXml = `<?xml version="1.0" encoding="UTF-8"?>\n<ELEMENTFILE FILE="${escapeXml(fileStem)}.E3D" VER="17">\n  <ELEMENT ECLAS="TElement" ENAME="${escapeXml(safeName)}" ESIFRA="${escapeXml(safeCode)}" EXPOX="0" EYPOS="0" EZPOS="${format(spec.depth)}" EVISINA="${format(spec.height)}" ESIRINA="${format(spec.width)}" EDUBINA="${format(spec.depth)}" EKUT="0" EXKUT="0" EZKUT="0" EVISIBLE="true" EEDITABLE="true" ELOCKED="false">\n    <DASKE DCOUNT="${boards.length}">\n${boards.map((entry) => `      ${entry}`).join("\n")}\n    </DASKE>\n  </ELEMENT>\n</ELEMENTFILE>`;
  return { fileName: `${fileStem}.E3D`, sourceXml };
}

function validateSpec(spec: CorpusCabinetSpec) {
  const positive = [spec.width, spec.height, spec.depth, spec.thickness];
  if (!spec.name.trim()) throw new Error("Naziv korpusa ne može biti prazan.");
  if (positive.some((value) => !Number.isFinite(value) || value <= 0)) throw new Error("Mjere korpusa moraju biti pozitivni brojevi.");
  if (spec.width <= spec.thickness * 2 || spec.height <= spec.thickness * 2 || spec.depth <= spec.thickness) {
    throw new Error("Korpus mora biti veći od debljine svojih ploča.");
  }
  if (!Number.isInteger(spec.shelfCount) || spec.shelfCount < 0 || spec.shelfCount > 20) throw new Error("Broj polica mora biti cijeli broj od 0 do 20.");
  if (spec.shelfOffsets) {
    if (spec.shelfOffsets.length !== spec.shelfCount) throw new Error("Broj ručnih visina mora odgovarati broju polica.");
    if (spec.shelfOffsets.some((value) => !Number.isFinite(value) || value < 0)) throw new Error("Ručne visine polica moraju biti nenegativni brojevi.");
    const maximumOffset = spec.height - (spec.baseHeight ?? 0) - spec.thickness * 3;
    if (spec.shelfOffsets.some((value) => value > maximumOffset)) throw new Error("Ručna visina police ulazi u gornju ploču.");
    for (let index = 1; index < spec.shelfOffsets.length; index += 1) {
      if (spec.shelfOffsets[index]! - spec.shelfOffsets[index - 1]! < spec.thickness) throw new Error("Ručne visine polica moraju biti rastuće i razmaknute najmanje za debljinu ploče.");
    }
  }
  const shelfFrontInset = spec.shelfFrontInset ?? 0;
  const shelfRearInset = spec.shelfRearInset ?? 0;
  if (![shelfFrontInset, shelfRearInset].every((value) => Number.isFinite(value) && value >= 0)) throw new Error("Uvlaci police ne mogu biti negativni.");
  if (shelfFrontInset + shelfRearInset >= spec.depth) throw new Error("Uvlaci police moraju ostaviti pozitivnu dubinu police.");
  const dividerCount = spec.dividerCount ?? 0;
  if (!Number.isInteger(dividerCount) || dividerCount < 0 || dividerCount > 10) throw new Error("Broj pregrada mora biti cijeli broj od 0 do 10.");
  if (spec.width <= spec.thickness * (dividerCount + 2)) throw new Error("Korpus je preuzak za zadani broj pregrada.");
  if (spec.dividerOffsets) {
    if (spec.dividerOffsets.length !== dividerCount) throw new Error("Broj ručnih položaja mora odgovarati broju pregrada.");
    if (spec.dividerOffsets.some((value) => !Number.isFinite(value) || value <= 0)) throw new Error("Ručni položaji pregrada moraju biti pozitivni brojevi.");
    const innerWidth = spec.width - spec.thickness * 2;
    const boundaries = [0, ...spec.dividerOffsets, innerWidth];
    for (let index = 1; index < boundaries.length; index += 1) {
      const occupied = index === boundaries.length - 1 ? 0 : spec.thickness;
      if (boundaries[index]! - boundaries[index - 1]! - occupied <= 0) throw new Error("Ručni položaji pregrada moraju biti rastući i ostaviti pozitivnu širinu svakog polja.");
    }
  }
  const baseHeight = spec.baseHeight ?? 0;
  if (!Number.isFinite(baseHeight) || baseHeight < 0) throw new Error("Visina postolja ne može biti negativna.");
  if (spec.height - baseHeight <= spec.thickness * 2) throw new Error("Iznad postolja mora ostati dovoljno mjesta za korpus.");
  if (spec.includePlinth && baseHeight <= 0) throw new Error("Cokla zahtijeva pozitivnu visinu postolja.");
  const plinthInset = spec.plinthInset ?? 30;
  if (!Number.isFinite(plinthInset) || plinthInset < 0 || plinthInset >= spec.depth) throw new Error("Uvlak cokle mora biti između 0 i dubine korpusa.");
  const topConstruction = spec.topConstruction ?? "full";
  if (topConstruction !== "full" && topConstruction !== "stretchers") throw new Error("Nepoznata gornja konstrukcija korpusa.");
  if (topConstruction === "stretchers") {
    const stretcherWidth = spec.stretcherWidth ?? 100;
    const rearInset = spec.rearStretcherInset ?? 40;
    if (!Number.isFinite(stretcherWidth) || stretcherWidth <= 0) throw new Error("Širina vezača mora biti pozitivan broj.");
    if (!Number.isFinite(rearInset) || rearInset < 0) throw new Error("Zadnji uvlak vezača ne može biti negativan.");
    if (stretcherWidth * 2 + rearInset >= spec.depth) throw new Error("Vezači i zadnji uvlak ne mogu stati u dubinu korpusa.");
  }
  const backType = spec.backType ?? "panel";
  if (backType !== "panel" && backType !== "thin") throw new Error("Nepoznata vrsta leđa korpusa.");
  if (spec.includeBack && backType === "thin") {
    const backThickness = spec.backThickness ?? 3;
    const backColor = spec.backColor ?? 0xffffff;
    if (!Number.isFinite(backThickness) || backThickness <= 0 || backThickness >= spec.depth) throw new Error("Debljina tankih leđa mora biti između 0 i dubine korpusa.");
    if (!Number.isInteger(backColor) || backColor < 0 || backColor > 0xffffff) throw new Error("Boja tankih leđa mora biti valjana 24-bitna vrijednost.");
  }
  if (!Number.isInteger(spec.color) || spec.color < 0 || spec.color > 0xffffff) throw new Error("Boja mora biti valjana 24-bitna vrijednost.");
  const frontCount = spec.frontCount ?? 0;
  if (!Number.isInteger(frontCount) || frontCount < 0 || frontCount > 10) throw new Error("Broj fronti mora biti cijeli broj od 0 do 10.");
  if (frontCount > 0) {
    const frontThickness = spec.frontThickness ?? spec.thickness;
    const frontGap = spec.frontGap ?? 2;
    const frontColor = spec.frontColor ?? spec.color;
    const frontLayout = spec.frontLayout ?? "doors";
    const frontMount = spec.frontMount ?? "overlay";
    if (frontLayout !== "doors" && frontLayout !== "drawers") throw new Error("Nepoznat raspored fronti.");
    if (frontMount !== "overlay" && frontMount !== "inset") throw new Error("Nepoznat način ugradnje fronti.");
    if (spec.frontWeights) {
      if (spec.frontWeights.length !== frontCount) throw new Error("Broj omjera mora odgovarati broju fronti.");
      if (spec.frontWeights.some((value) => !Number.isFinite(value) || value <= 0)) throw new Error("Omjeri fronti moraju biti pozitivni brojevi.");
    }
    if (!Number.isFinite(frontThickness) || frontThickness <= 0) throw new Error("Debljina fronte mora biti pozitivan broj.");
    if (!Number.isFinite(frontGap) || frontGap < 0) throw new Error("Zazor fronte ne može biti negativan.");
    const frameWidth = frontMount === "inset" ? spec.width - spec.thickness * 2 : spec.width;
    const frameHeight = frontMount === "inset" ? spec.height - baseHeight - spec.thickness * 2 : spec.height - baseHeight;
    const widthGap = frontLayout === "doors" ? frontGap * (frontCount + 1) : frontGap * 2;
    const heightGap = frontLayout === "drawers" ? frontGap * (frontCount + 1) : frontGap * 2;
    if (frameWidth <= widthGap || frameHeight <= heightGap) throw new Error("Zazor je prevelik za zadane mjere fronte.");
    if (!Number.isInteger(frontColor) || frontColor < 0 || frontColor > 0xffffff) throw new Error("Boja fronte mora biti valjana 24-bitna vrijednost.");
  }
}

function board(name: string, x: number, y: number, z: number, height: number, width: number, thickness: number, direction: number, shared: string): string {
  return `<AD DNAME="${escapeXml(name)}" DXPOS="${format(x)}" DYPOS="${format(y)}" DZPOS="${format(z)}" VISINA="${format(height)}" DUBINA="${format(width)}" DEBLJINA="${format(thickness)}" SMJER="${direction}" DKUT="0" XKUT="0" ZKUT="0" ${shared}><RUPE/><KRIVULJE DATA="${rectangleCurve(height, width)}"/></AD>`;
}

function rectangleCurve(height: number, width: number): string {
  const h = format(height / 1000);
  const w = format(width / 1000);
  return `&quot;PTOCKA=0&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=0&quot;,&quot;PTZ=0&quot;,&quot;PTOCKA=1&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=${h}&quot;,&quot;PTZ=0&quot;,&quot;PTOCKA=2&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=${h}&quot;,&quot;PTZ=${w}&quot;,&quot;PTOCKA=3&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=0&quot;,&quot;PTZ=${w}&quot;`;
}

function format(value: number): string {
  return String(round(value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
