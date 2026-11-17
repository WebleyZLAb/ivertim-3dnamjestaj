export type CorpusStraightContourPoint = { x: number; z: number };

export function validateStraightContour(points: readonly CorpusStraightContourPoint[]): void {
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
  const onSegment = (p: CorpusStraightContourPoint, q: CorpusStraightContourPoint, point: CorpusStraightContourPoint) => point.x >= Math.min(p.x,q.x) && point.x <= Math.max(p.x,q.x) && point.z >= Math.min(p.z,q.z) && point.z <= Math.max(p.z,q.z);
  if ((abC === 0 && onSegment(a,b,c)) || (abD === 0 && onSegment(a,b,d)) || (cdA === 0 && onSegment(c,d,a)) || (cdB === 0 && onSegment(c,d,b))) return true;
  return ((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0));
}
