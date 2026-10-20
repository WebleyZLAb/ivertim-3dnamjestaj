import { corpusBoardDimensions } from "./corpus-geometry.ts";
import type { CorpusS3dBoard } from "./corpus-s3d.ts";

export type CorpusWorldAxis = "X" | "Y" | "Z";
export type CorpusBoardLocalAxis = "debljina" | "visina" | "dubina";
export type CorpusBoardFaceSide = "min" | "max";

export interface CorpusBoardContactFace {
  worldAxis: CorpusWorldAxis;
  localAxis: CorpusBoardLocalAxis;
  side: CorpusBoardFaceSide;
  /** Kandidat 2..5 je potvrđen formulama; 0/1 ostaje nerazriješen. */
  autostCandidate: number | null;
}

export interface CorpusBoardLocalContactRectangle {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  xAxis: CorpusBoardLocalAxis;
  yAxis: CorpusBoardLocalAxis;
}

export interface CorpusBoardContact {
  status: "contact" | "separated" | "overlap" | "unsupported" | "edge-only";
  reason: string;
  axis: CorpusWorldAxis | null;
  object1Face: CorpusBoardContactFace | null;
  object2Face: CorpusBoardContactFace | null;
  object1LocalOverlap: CorpusBoardLocalContactRectangle | null;
  object2LocalOverlap: CorpusBoardLocalContactRectangle | null;
  overlap: Readonly<Partial<Record<CorpusWorldAxis, readonly [number, number]>>>;
}

type Bounds = Record<CorpusWorldAxis, readonly [number, number]>;

/**
 * Dijagnostika pravougaonih, nerotiranih Corpus ploča. Ne računa PMIN/PMAX i
 * ne mijenja makro kontekst; samo dokazuje 3D dodir i lokalne strane dodira.
 */
export function analyzeCorpusBoardContact(
  object1: CorpusS3dBoard | null,
  object2: CorpusS3dBoard | null,
  tolerance = 0.01,
): CorpusBoardContact {
  if (!object1 || !object2) return unsupported("Nedostaje jedna od dvije ploče.");
  if (![object1, object2].every(isAxisAligned)) return unsupported("Rotirane ploče još nisu podržane u dijagnostici spoja.");
  const object1Issue = boardGeometryIssue(object1);
  const object2Issue = boardGeometryIssue(object2);
  if (object1Issue || object2Issue) return unsupported(`Geometrija spoja nije upotrebljiva: ${object1Issue ?? object2Issue}`);
  const bounds1 = boardBounds(object1);
  const bounds2 = boardBounds(object2);
  if (!bounds1 || !bounds2) return unsupported("Geometrija spoja se ne može izračunati.");

  const candidates: { axis: CorpusWorldAxis; side1: CorpusBoardFaceSide; side2: CorpusBoardFaceSide }[] = [];
  for (const axis of AXES) {
    if (Math.abs(bounds1[axis][1] - bounds2[axis][0]) <= tolerance) candidates.push({ axis, side1: "max", side2: "min" });
    if (Math.abs(bounds2[axis][1] - bounds1[axis][0]) <= tolerance) candidates.push({ axis, side1: "min", side2: "max" });
  }

  const penetrating = AXES.every((axis) => intervalOverlap(bounds1[axis], bounds2[axis]) > tolerance);
  if (penetrating) return { status: "overlap", reason: "Zapremine ploča se preklapaju.", axis: null, object1Face: null, object2Face: null, object1LocalOverlap: null, object2LocalOverlap: null, overlap: {} };

  for (const candidate of candidates) {
    const otherAxes = AXES.filter((axis) => axis !== candidate.axis);
    const overlap = Object.fromEntries(otherAxes.map((axis) => [axis, overlapInterval(bounds1[axis], bounds2[axis])])) as Partial<Record<CorpusWorldAxis, readonly [number, number]>>;
    const lengths = otherAxes.map((axis) => intervalOverlap(bounds1[axis], bounds2[axis]));
    if (lengths.every((length) => length > tolerance)) {
      const object1Face = contactFace(object1.direction!, candidate.axis, candidate.side1);
      const object2Face = contactFace(object2.direction!, candidate.axis, candidate.side2);
      return {
      status: "contact",
      reason: `Ploče imaju dodirnu površinu na ${candidate.axis} osi.`,
      axis: candidate.axis,
      object1Face,
      object2Face,
      object1LocalOverlap: localContactRectangle(object1, object1Face, overlap),
      object2LocalOverlap: localContactRectangle(object2, object2Face, overlap),
      overlap,
      };
    }
    if (lengths.every((length) => length >= -tolerance)) return {
      status: "edge-only",
      reason: "Ploče se dodiruju samo ivicom ili tačkom, bez spojne površine.",
      axis: candidate.axis,
      object1Face: contactFace(object1.direction!, candidate.axis, candidate.side1),
      object2Face: contactFace(object2.direction!, candidate.axis, candidate.side2),
      object1LocalOverlap: null,
      object2LocalOverlap: null,
      overlap,
    };
  }

  return { status: "separated", reason: "Izabrane ploče nemaju zajedničku dodirnu površinu.", axis: null, object1Face: null, object2Face: null, object1LocalOverlap: null, object2LocalOverlap: null, overlap: {} };
}

const AXES: readonly CorpusWorldAxis[] = ["X", "Y", "Z"];

function boardBounds(board: CorpusS3dBoard): Bounds | null {
  if (board.direction === null || ![0, 1, 2].includes(board.direction)) return null;
  const values = [...board.position, board.height, board.width, board.thickness];
  if (values.some((value) => value === null || !Number.isFinite(value))) return null;
  const [x, y, z] = board.position as readonly [number, number, number];
  const [sizeX, sizeY, sizeZ] = corpusBoardDimensions(board.direction, board.height!, board.width!, board.thickness!);
  if ([sizeX, sizeY, sizeZ].some((value) => value <= 0)) return null;
  return { X: [x, x + sizeX], Y: [y, y + sizeY], Z: [z, z + sizeZ] };
}

function boardGeometryIssue(board: CorpusS3dBoard): string | null {
  if (board.direction === null || ![0, 1, 2].includes(board.direction)) return "nedostaje podržani SMJER.";
  const values = [...board.position, board.height, board.width, board.thickness];
  if (values.some((value) => value === null || !Number.isFinite(value))) return "nedostaje položaj ili mjera ploče.";
  if ([board.height!, board.width!, board.thickness!].some((value) => value <= 0)) return "pomoćna ili plošna geometrija nema pozitivnu zapreminu.";
  return null;
}

function isAxisAligned(board: CorpusS3dBoard) {
  return [board.angle, board.xAngle, board.zAngle].every((angle) => angle === null || Math.abs(angle) < 0.000001);
}

function contactFace(direction: number, worldAxis: CorpusWorldAxis, side: CorpusBoardFaceSide): CorpusBoardContactFace {
  const localAxis = localAxisFor(direction, worldAxis);
  const autostCandidate = localAxis === "visina" ? (side === "max" ? 2 : 3)
    : localAxis === "dubina" ? (side === "min" ? 4 : 5)
      : null;
  return { worldAxis, localAxis, side, autostCandidate };
}

function localAxisFor(direction: number, worldAxis: CorpusWorldAxis): CorpusBoardLocalAxis {
  if (direction === 0) return worldAxis === "X" ? "debljina" : worldAxis === "Y" ? "visina" : "dubina";
  if (direction === 1) return worldAxis === "X" ? "dubina" : worldAxis === "Y" ? "visina" : "debljina";
  return worldAxis === "X" ? "visina" : worldAxis === "Y" ? "debljina" : "dubina";
}

function localContactRectangle(
  board: CorpusS3dBoard,
  face: CorpusBoardContactFace,
  overlap: Partial<Record<CorpusWorldAxis, readonly [number, number]>>,
): CorpusBoardLocalContactRectangle | null {
  const [xAxis, yAxis] = face.localAxis === "debljina" ? ["visina", "dubina"] as const
    : face.localAxis === "visina" ? ["debljina", "dubina"] as const
      : ["debljina", "visina"] as const;
  const xWorldAxis = worldAxisFor(board.direction!, xAxis);
  const yWorldAxis = worldAxisFor(board.direction!, yAxis);
  const xOverlap = overlap[xWorldAxis];
  const yOverlap = overlap[yWorldAxis];
  if (!xOverlap || !yOverlap) return null;
  const axisOrigins: Record<CorpusWorldAxis, number | null> = { X: board.position[0], Y: board.position[1], Z: board.position[2] };
  const xOrigin = axisOrigins[xWorldAxis];
  const yOrigin = axisOrigins[yWorldAxis];
  if (xOrigin === null || yOrigin === null) return null;
  return {
    minX: clean(xOverlap[0] - xOrigin), maxX: clean(xOverlap[1] - xOrigin),
    minY: clean(yOverlap[0] - yOrigin), maxY: clean(yOverlap[1] - yOrigin),
    xAxis, yAxis,
  };
}

function worldAxisFor(direction: number, localAxis: CorpusBoardLocalAxis): CorpusWorldAxis {
  return AXES.find((axis) => localAxisFor(direction, axis) === localAxis)!;
}

function clean(value: number) {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function intervalOverlap(left: readonly [number, number], right: readonly [number, number]) {
  return Math.min(left[1], right[1]) - Math.max(left[0], right[0]);
}

function overlapInterval(left: readonly [number, number], right: readonly [number, number]): readonly [number, number] {
  return [Math.max(left[0], right[0]), Math.min(left[1], right[1])];
}

function unsupported(reason: string): CorpusBoardContact {
  return { status: "unsupported", reason, axis: null, object1Face: null, object2Face: null, object1LocalOverlap: null, object2LocalOverlap: null, overlap: {} };
}
