import { parseCurvePoints, type CorpusS3dBoard, type CorpusS3dCurvePoint } from "./corpus-s3d.ts";

/**
 * Usjecanja radne ploče (sudopera, ploča za kuhanje): sekundarne zatvorene krive u KRIVULJE ploče (CURVE >= 0, CNNAME=Line).
 * Konturu ploče čini kriva CURVE=-1 (Outline). U uzorku (MARK NISIC kuhinja, ploča 1920 × 600): usjecanje 530 × 430 ima tačke
 * PTX 0.635/1.165, PTZ 0.085/0.515 (metri); isti program (.mpr) ima X = dužina − PTX (755…1285), Y = PTZ (85…515).
 */
export type CorpusCutout = {
  /** Mjere obuhvatnog pravougaonika u milimetrima, X duž dužine ploče (VISINA), Z duž dubine. */
  x: number; z: number; width: number; depth: number;
  /** Pravougaonik: tačno četiri tačke bez lukova. */
  rectangular: boolean;
  points: readonly CorpusS3dCurvePoint[];
};

/**
 * Pomak krive iz binarnog CURVEDATA (polje `pos`, tri float32 LE u metrima: prvi je Z, drugi X). Krive u centriranom načinu
 * (CCENTARMODE=1, npr. sudopera u Kuhinja.S3D) imaju tačke oko nule, a stvarni položaj je u pomaku. Uzorak: PTX ±0,28, pomak
 * (0,315; 3,134) daje X 2854…3414 i Z 70…560, što je u .mpr X 170…730, Y 70…560 (X = dužina 3584 − x).
 */
export function curveOffset(slice: string): { x: number; z: number } | null {
  const hex = /"CURVEDATA=([0-9A-Fa-f]+)"/.exec(slice)?.[1];
  if (!hex) return null;
  const pos = hex.indexOf("0603706F73");
  const xyz = pos < 0 ? -1 : hex.indexOf("060378797A", pos);
  if (xyz < 0) return null;
  const bytes = Buffer.from(hex.slice(xyz + 10, xyz + 10 + 24), "hex");
  if (bytes.length < 12) return null;
  const z = bytes.readFloatLE(0) * 1000, x = bytes.readFloatLE(4) * 1000;
  return Math.abs(x) < 1e-6 && Math.abs(z) < 1e-6 ? null : { x, z };
}

export function corpusBoardCutouts(board: Pick<CorpusS3dBoard, "curveData">): CorpusCutout[] {
  const data = board.curveData;
  if (!data) return [];
  const curves = [...data.matchAll(/"CURVE=(-?\d+)"/g)];
  const cutouts: CorpusCutout[] = [];
  curves.forEach((curve, index) => {
    if (Number(curve[1]) < 0) return;
    const slice = data.slice(curve.index, curves[index + 1]?.index);
    if (/"CNOPEN=1"/.test(slice)) return;
    // Usjecanje je kriva s podacima glodanja; ostale sekundarne krive (profili, pomoćne linije) nisu obrada ploče.
    if (!/MILLDATA=/.test(slice)) return;
    const offset = curveOffset(slice);
    const points = parseCurvePoints(slice).map((point) => offset ? { ...point, x: point.x + offset.x, z: point.z + offset.z } : point);
    if (points.length < 3) return;
    const xs = points.map((point) => point.x), zs = points.map((point) => point.z);
    const x = Math.min(...xs), z = Math.min(...zs);
    cutouts.push({
      x, z, width: Math.max(...xs) - x, depth: Math.max(...zs) - z,
      rectangular: points.length === 4 && points.every((point) => point.style === 0),
      points,
    });
  });
  return cutouts;
}

/** Podaci glodanja (MILLDATA, alat T100, bez prilaza/odlaza) preuzeti iz Corpusovog uzorka usjecanja (MARK NISIC). */
const SAMPLE_MILLDATA = "070E544D696C6C436F6C6C6563746F7201020006025551032B0E06066D696C636F6C020101070C54636E634D696C6C496E666F01020006025551032C0E0603637A6202010604637A6F66050000000000000000000006056374636F6D02020604636469720201060463746F6C0604543130300604636D737402000604636D736902000604636C696E070A544C656164696E4F757401020006025551032D0E0604636C6C7402000604636C736902000604636C73680F000000000604636C61720F00003442000604636C6F75070A544C656164696E4F757401020006025551032E0E0604636C6C7402000604636C736902000604636C73680F000000000604636C61720F0000344200000000";

const num = (value: number) => String(Math.round(value * 1e9) / 1e9);

/**
 * Dodaje pravougaono usjecanje u KRIVULJE DATA ploče (tekst sa navodnicima, dekodiran). Mjere u milimetrima: x, z su
 * početak od ishodišta ploče, width duž dužine, depth duž dubine. Zapis prati uzorak iz Corpusa; Corpus nije pokretan da
 * potvrdi da ga otvara, pa je upis provjeren samo vlastitim čitačem.
 */
export function appendCorpusRectCutout(data: string, rect: { x: number; z: number; width: number; depth: number; radius?: number }): string {
  if (![rect.x, rect.z, rect.width, rect.depth].every(Number.isFinite) || rect.width <= 0 || rect.depth <= 0) throw new Error("Mjere usjecanja nisu ispravne.");
  const radius = rect.radius ?? 0;
  if (!Number.isFinite(radius) || radius < 0 || radius * 2 > Math.min(rect.width, rect.depth)) throw new Error("Radijus uglova je prevelik za ovo usjecanje.");
  if (!/"PTOCKA=/.test(data)) throw new Error("Ploča nema konturu za koju se usjecanje vezuje.");
  // Ploče koje je napravio Ivertim imaju samo tačke konture bez oznake krive; kontura dobija CURVE=-1 (Outline).
  if (!/"CURVE=-?\d+"/.test(data)) data = `"CURVE=-1","CNNAME=Outline","CNOPEN=0",${data}`;
  const ids = [...data.matchAll(/"CURVE=(-?\d+)"/g)].map((match) => Number(match[1]));
  const next = Math.max(...ids, -1) + 1;
  const { x, z, width, depth } = rect;
  // Sa radijusom: tačka prije ugla (luk, PTSTYLE=2, PTARRA) i tačka poslije ugla; bez radijusa samo ugao.
  const sides: [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const raw: { x: number; z: number; arc: number }[] = [];
  const cornerPoints: [number, number][] = [[x, z], [x + width, z], [x + width, z + depth], [x, z + depth]];
  cornerPoints.forEach(([cx, cz], index) => {
    const into = sides[(index + 3) % 4]!, out = sides[index]!;
    if (radius > 0) {
      raw.push({ x: cx - into[0] * radius, z: cz - into[1] * radius, arc: radius });
      raw.push({ x: cx + out[0] * radius, z: cz + out[1] * radius, arc: 0 });
    } else raw.push({ x: cx, z: cz, arc: 0 });
  });
  const items = [
    `CURVE=${next}`, "CNNAME=Line", "CNOPEN=0", "USEDINTES=1", "ISCUTTER=0", "ISCUTTED=0", "CREATOR=0",
    ...raw.flatMap((point, index) => [`PTOCKA=${index}`, `PTSTYLE=${point.arc ? 2 : 0}`, "PTANMODE=0", "PTSEGCOUNT=10", `PTX=${num(point.x / 1000)}`, `PTZ=${num(point.z / 1000)}`, ...(point.arc ? [`PTARRA=${num(point.arc / 1000)}`, "PTARSM=0"] : []), "PTDEPTH=0", "PTS=0", "PTCLEN=0"]),
    "CMODE=2", "CCENTARMODE=1", `MILLDATA=${SAMPLE_MILLDATA}`,
  ];
  return `${data},${items.map((item) => `"${item}"`).join(",")}`;
}

/** Briše n-to usjecanje (redoslijed kao u `corpusBoardCutouts`) iz KRIVULJE DATA; kontura ploče i ostale krive ostaju. */
export function removeCorpusCutout(data: string, cutoutIndex: number): string {
  const curves = [...data.matchAll(/"CURVE=(-?\d+)"/g)];
  let seen = -1;
  for (let index = 0; index < curves.length; index += 1) {
    if (Number(curves[index]![1]) < 0) continue;
    const slice = data.slice(curves[index]!.index, curves[index + 1]?.index);
    if (/"CNOPEN=1"/.test(slice) || !/MILLDATA=/.test(slice) || parseCurvePoints(slice).length < 3) continue;
    seen += 1;
    if (seen !== cutoutIndex) continue;
    const start = curves[index]!.index!, end = curves[index + 1]?.index ?? data.length;
    // Zarez prije ili poslije izrezanog dijela se uklanja da lista ostane ispravna.
    const before = data.slice(0, start).replace(/,$/, ""), after = data.slice(end).replace(/^,/, "");
    return before && after ? `${before},${after}` : before + after;
  }
  throw new Error("Usjecanje nije pronađeno.");
}
