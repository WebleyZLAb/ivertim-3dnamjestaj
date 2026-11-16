import assert from "node:assert/strict";
import test from "node:test";
import { decodeCorpusTextDocument } from "../lib/corpus-text.ts";

test("čita UTF-8 Corpus XML i zadržava slova", () => {
  const source = `<?xml version="1.0" encoding="UTF-8"?><ELEMENT ENAME="Čelić i đenova"/>`;
  const decoded = decodeCorpusTextDocument(new TextEncoder().encode(source));
  assert.equal(decoded.sourceEncoding, "utf-8");
  assert.equal(decoded.text, source);
});

test("čita deklarisani Windows-1250 i normalizuje izvoznu XML deklaraciju", () => {
  const ascii = new TextEncoder().encode(`<?xml version="1.0" encoding="windows-1250"?><ELEMENT ENAME="`);
  const suffix = new TextEncoder().encode(`"/>`);
  const bytes = new Uint8Array([...ascii, 0xc8, 0xe6, 0x9e, 0x9a, 0xf0, ...suffix]);
  const decoded = decodeCorpusTextDocument(bytes);
  assert.equal(decoded.sourceEncoding, "windows-1250");
  assert.match(decoded.text, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(decoded.text, /ENAME="Čćžšđ"/);
});

test("bez deklaracije koristi strogi UTF-8 pa Windows-1250 fallback", () => {
  const decoded = decodeCorpusTextDocument(new Uint8Array([0x4e, 0x41, 0x5a, 0x49, 0x56, 0x3d, 0x9e, 0x75, 0x74, 0x6f]));
  assert.equal(decoded.sourceEncoding, "windows-1250");
  assert.equal(decoded.text, "NAZIV=žuto");
});

test("poštuje UTF-16LE BOM i normalizuje deklaraciju", () => {
  const source = `<?xml version="1.0" encoding="UTF-16"?><ELEMENT ENAME="Đ"/>`;
  const body = new Uint8Array(source.length * 2);
  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    body[index * 2] = code & 0xff;
    body[index * 2 + 1] = code >> 8;
  }
  const decoded = decodeCorpusTextDocument(new Uint8Array([0xff, 0xfe, ...body]));
  assert.equal(decoded.sourceEncoding, "utf-16le");
  assert.match(decoded.text, /encoding="UTF-8"/);
  assert.match(decoded.text, /ENAME="Đ"/);
});

test("prepoznaje UTF-16 XML potpis bez BOM-a u oba redoslijeda bajtova", () => {
  const source = `<?xml version="1.0" encoding="UTF-16"?><ELEMENT ENAME="Č"/>`;
  const littleEndian = new Uint8Array(source.length * 2);
  const bigEndian = new Uint8Array(source.length * 2);
  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    littleEndian[index * 2] = code & 0xff;
    littleEndian[index * 2 + 1] = code >> 8;
    bigEndian[index * 2] = code >> 8;
    bigEndian[index * 2 + 1] = code & 0xff;
  }
  const decodedLittleEndian = decodeCorpusTextDocument(littleEndian);
  const decodedBigEndian = decodeCorpusTextDocument(bigEndian);
  assert.equal(decodedLittleEndian.sourceEncoding, "utf-16le");
  assert.equal(decodedBigEndian.sourceEncoding, "utf-16be");
  assert.equal(decodedLittleEndian.text, decodedBigEndian.text);
  assert.match(decodedLittleEndian.text, /encoding="UTF-8"/);
  assert.match(decodedLittleEndian.text, /ENAME="Č"/);
});
