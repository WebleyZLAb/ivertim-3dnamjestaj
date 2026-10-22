import assert from "node:assert/strict";
import test from "node:test";
import { corpusDrawingGroupBounds, corpusDrawingShape, corpusDrawingSpans, corpusDrawingSvg } from "../lib/corpus-drawing.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

const element = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="Rotiran" EXPOX="100" EYPOS="20" EZPOS="500" ESIRINA="600" EVISINA="800" EDUBINA="400" EKUT="90"><DASKE/></ELEMENT></PROJECTFILE>`).elements[0]!;

test("gornji nacrt čuva rotirani Corpus otisak", () => {
  const shape = corpusDrawingShape(element, "top")!;
  assert.deepEqual(shape.points.map(([x, z]) => [Math.round(x), Math.round(z)]), [[100, 500], [100, -100], [-300, -100], [-300, 500]]);
  assert.deepEqual(shape.bounds, { minH: -300, maxH: 100, minV: -100, maxV: 500 });
});

test("frontalni i bočni nacrt koriste svjetski omotač i stvarnu visinu", () => {
  assert.deepEqual(corpusDrawingShape(element, "front")!.bounds, { minH: -300, maxH: 100, minV: 20, maxV: 820 });
  assert.deepEqual(corpusDrawingShape(element, "side")!.bounds, { minH: -100, maxH: 500, minV: 20, maxV: 820 });
});

test("računa kote raspona iz granica svake projekcije", () => {
  assert.deepEqual(corpusDrawingSpans(corpusDrawingShape(element, "front")!), { horizontal: 400, vertical: 800 });
  assert.deepEqual(corpusDrawingSpans(corpusDrawingShape(element, "top")!), { horizontal: 400, vertical: 600 });
  assert.deepEqual(corpusDrawingSpans(corpusDrawingShape(element, "side")!), { horizontal: 600, vertical: 800 });
});

test("izvozi samostalan SVG nacrt sa rotiranim otiskom i kotama", () => {
  const namedElement = { ...element, name: "Element & <test>" };
  const svg = corpusDrawingSvg([namedElement], "top", namedElement);
  assert.match(svg, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(svg, /aria-label="Gornji nacrt Corpus projekta"/);
  assert.match(svg, /points="100,120 100,720 -300,720 -300,120"/);
  assert.match(svg, /Element &amp; &lt;test&gt;/);
  assert.match(svg, />400 mm<\/text>/);
  assert.match(svg, />600 mm<\/text>/);
});

test("izvozi zajednički omotač i samo ukupne kote označene grupe", () => {
  const second = { ...element, name: "Drugi", position: [500, 120, 900] as const };
  assert.deepEqual(corpusDrawingGroupBounds([element, second], "front"), { minH: -300, maxH: 500, minV: 20, maxV: 920 });
  assert.equal(corpusDrawingGroupBounds([element], "front"), null);
  const svg = corpusDrawingSvg([element, second], "front", element, [element, second]);
  assert.match(svg, /class="group-envelope"/);
  assert.match(svg, /<rect x="-300" y="120" width="800" height="900"/);
  assert.match(svg, />800 mm<\/text>/);
  assert.match(svg, />900 mm<\/text>/);
  assert.equal((svg.match(/class="dimension"/g) ?? []).length, 1);
});
