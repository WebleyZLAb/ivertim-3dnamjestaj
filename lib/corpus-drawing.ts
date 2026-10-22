import { corpusElementFootprint } from "./corpus-footprint.ts";
import type { CorpusS3dElement } from "./corpus-s3d.ts";

export type CorpusDrawingProjection = "front" | "top" | "side";
export type CorpusDrawingBounds = { minH: number; maxH: number; minV: number; maxV: number };
export type CorpusDrawingShape = {
  element: CorpusS3dElement;
  points: readonly (readonly [number, number])[];
  bounds: CorpusDrawingBounds;
};

export type CorpusDrawingSpans = { horizontal: number; vertical: number };

export function corpusDrawingShape(element: CorpusS3dElement, projection: CorpusDrawingProjection): CorpusDrawingShape | null {
  if (element.visible === false) return null;
  const footprint = corpusElementFootprint(element);
  if (!footprint) return null;
  let points: readonly (readonly [number, number])[];
  if (projection === "top") {
    points = footprint.worldCorners;
  } else if (projection === "side") {
    points = rectangle(footprint.worldBounds.minZ, footprint.minY, footprint.worldBounds.maxZ, footprint.maxY);
  } else {
    points = rectangle(footprint.worldBounds.minX, footprint.minY, footprint.worldBounds.maxX, footprint.maxY);
  }
  return { element, points, bounds: bounds(points) };
}

export function corpusDrawingSpans(shape: Pick<CorpusDrawingShape, "bounds">): CorpusDrawingSpans {
  return {
    horizontal: clean(shape.bounds.maxH - shape.bounds.minH),
    vertical: clean(shape.bounds.maxV - shape.bounds.minV),
  };
}

/** Zajedničke granice najmanje dva potpuno projektovana elementa. */
export function corpusDrawingGroupBounds(elements: readonly CorpusS3dElement[], projection: CorpusDrawingProjection): CorpusDrawingBounds | null {
  if (elements.length < 2) return null;
  const shapes = elements.map((element) => corpusDrawingShape(element, projection));
  if (shapes.some((shape) => shape === null)) return null;
  const measured = shapes.filter((shape): shape is CorpusDrawingShape => shape !== null);
  return {
    minH: clean(Math.min(...measured.map(({ bounds: value }) => value.minH))),
    maxH: clean(Math.max(...measured.map(({ bounds: value }) => value.maxH))),
    minV: clean(Math.min(...measured.map(({ bounds: value }) => value.minV))),
    maxV: clean(Math.max(...measured.map(({ bounds: value }) => value.maxV))),
  };
}

export function corpusDrawingSvg(
  elements: readonly CorpusS3dElement[],
  projection: CorpusDrawingProjection,
  selected: CorpusS3dElement | null = null,
  groupedElements: readonly CorpusS3dElement[] = [],
): string {
  const shapes = elements.map((element) => corpusDrawingShape(element, projection)).filter((shape) => shape !== null);
  if (!shapes.length) throw new Error("Projekat nema geometriju za izvoz nacrta.");
  const minH = Math.min(0, ...shapes.map(({ bounds: value }) => value.minH));
  const maxH = Math.max(0, ...shapes.map(({ bounds: value }) => value.maxH));
  const minV = Math.min(0, ...shapes.map(({ bounds: value }) => value.minV));
  const maxV = Math.max(0, ...shapes.map(({ bounds: value }) => value.maxV));
  const padding = Math.max(120, (maxH - minH) * 0.04);
  const width = Math.max(1000, maxH - minH + padding * 2);
  const height = Math.max(1000, maxV - minV + padding * 2);
  const x = minH - padding;
  const toY = (value: number) => maxV + padding - value;
  const projectionName = projection === "front" ? "Prednji" : projection === "top" ? "Gornji" : "Bočni";
  const groupBounds = corpusDrawingGroupBounds(groupedElements, projection);
  const body = shapes.map(({ element, points, bounds: value }) => {
    const chosen = element === selected;
    const polygon = points.map(([horizontal, vertical]) => `${number(horizontal)},${number(toY(vertical))}`).join(" ");
    const name = escapeXml(element.name || element.code || "Element");
    const labelX = (value.minH + value.maxH) / 2;
    const labelY = toY((value.minV + value.maxV) / 2);
    const dimensions = chosen && !groupBounds ? svgDimensions(value, toY) : "";
    return `<g class="element${chosen ? " selected" : ""}"><polygon points="${polygon}"/><text class="label" x="${number(labelX)}" y="${number(labelY)}">${name}</text>${dimensions}</g>`;
  }).join("");
  const groupEnvelope = groupBounds ? `<g class="group-envelope"><rect x="${number(groupBounds.minH)}" y="${number(toY(groupBounds.maxV))}" width="${number(groupBounds.maxH - groupBounds.minH)}" height="${number(groupBounds.maxV - groupBounds.minV)}"/>${svgDimensions(groupBounds, toY)}</g>` : "";
  const floor = projection === "top" ? "" : `<line class="floor" x1="${number(x)}" y1="${number(toY(0))}" x2="${number(maxH + padding)}" y2="${number(toY(0))}"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${number(width)}mm" height="${number(height)}mm" viewBox="${number(x)} 0 ${number(width)} ${number(height)}" role="img" aria-label="${projectionName} nacrt Corpus projekta">
  <title>${projectionName} nacrt Corpus projekta</title>
  <style>.background{fill:#fff}.grid{stroke:#dfe3dd;stroke-width:1}.floor{stroke:#252a2e;stroke-width:8}.element polygon{fill:#d0d6cd;stroke:#727b70;stroke-width:4}.element.selected polygon{fill:#cde174;stroke:#667900;stroke-width:6}.label{font:700 36px Arial,sans-serif;fill:#30352f;text-anchor:middle;dominant-baseline:middle}.dimension line{stroke:#56610d;stroke-width:2}.dimension text{font:700 28px Arial,sans-serif;fill:#48520b}.group-envelope>rect{fill:none;stroke:#d56e00;stroke-width:8;stroke-dasharray:28 16}.group-envelope .dimension line{stroke:#b85d00}.group-envelope .dimension text{fill:#9b4e00}</style>
  <rect class="background" x="${number(x)}" y="0" width="${number(width)}" height="${number(height)}"/>
  ${floor}${body}${groupEnvelope}
</svg>\n`;
}

function svgDimensions(value: CorpusDrawingShape["bounds"], toY: (value: number) => number): string {
  const spans = corpusDrawingSpans({ bounds: value });
  const centerH = (value.minH + value.maxH) / 2;
  const centerV = toY((value.minV + value.maxV) / 2);
  const horizontalY = toY(value.minV) + 62;
  const verticalX = value.maxH + 62;
  return `<g class="dimension">
    <line x1="${number(value.minH)}" y1="${number(toY(value.minV))}" x2="${number(value.minH)}" y2="${number(horizontalY + 14)}"/><line x1="${number(value.maxH)}" y1="${number(toY(value.minV))}" x2="${number(value.maxH)}" y2="${number(horizontalY + 14)}"/><line x1="${number(value.minH)}" y1="${number(horizontalY)}" x2="${number(value.maxH)}" y2="${number(horizontalY)}"/><text x="${number(centerH)}" y="${number(horizontalY - 12)}" text-anchor="middle">${number(spans.horizontal)} mm</text>
    <line x1="${number(value.maxH)}" y1="${number(toY(value.minV))}" x2="${number(verticalX + 14)}" y2="${number(toY(value.minV))}"/><line x1="${number(value.maxH)}" y1="${number(toY(value.maxV))}" x2="${number(verticalX + 14)}" y2="${number(toY(value.maxV))}"/><line x1="${number(verticalX)}" y1="${number(toY(value.minV))}" x2="${number(verticalX)}" y2="${number(toY(value.maxV))}"/><text x="${number(verticalX + 18)}" y="${number(centerV)}" dominant-baseline="middle">${number(spans.vertical)} mm</text>
  </g>`;
}

function number(value: number): string {
  return String(clean(value));
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function rectangle(minH: number, minV: number, maxH: number, maxV: number) {
  return [[minH, minV], [maxH, minV], [maxH, maxV], [minH, maxV]] as const;
}

function bounds(points: readonly (readonly [number, number])[]) {
  return {
    minH: clean(Math.min(...points.map(([h]) => h))),
    maxH: clean(Math.max(...points.map(([h]) => h))),
    minV: clean(Math.min(...points.map(([, v]) => v))),
    maxV: clean(Math.max(...points.map(([, v]) => v))),
  };
}

function clean(value: number): number {
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}
